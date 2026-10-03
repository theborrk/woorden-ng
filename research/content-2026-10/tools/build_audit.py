import collections,csv,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote
from audit_decisions import SPLITS,FIX,DROP,CORE_AGRO,CORE_SLANG,POS
ROOT=Path(__file__).resolve().parents[1]
idx=json.load(open(ROOT/'evidence/lexical-index.json'))
seed=json.load(open(ROOT/'evidence/inputs/seed-v1.json'))['entries']
def lemma(e):
 a=e.get('article');w=e['nl'];return w[len(a)+1:] if a and w.startswith(a+' ') else w
def articles(r):
 d=r['data'];tags=set(d.get('tags',[]))
 for s in d.get('senses',[]):tags.update(s.get('tags',[]))
 out=set()
 if tags&{'masculine','feminine','common-gender'}:out.add('de')
 if 'neuter' in tags:out.add('het')
 return out
def observations(x,pos):
 out=[]
 for src in ['en','nl']:
  for r in x.get(src,[]):
   if r['data'].get('pos')==pos:
    a=articles(r)
    if a:out.append({'source':src,'record_id':r['record_id'],'articles':sorted(a)})
 for r in x.get('odwn',[]):
  e=ET.fromstring(r['xml'])
  if e.get('partOfSpeech')!='noun':continue
  a=set()
  for wf in e.findall('./WordForms/WordForm'):
   if wf.get('grammaticalNumber')=='singular':a.update(v for v in (wf.get('article') or '').split('/') if v in {'de','het'})
  if a:out.append({'source':'odwn','record_id':r['record_id'],'articles':sorted(a)})
 return out
def forms(x,field):
 out=set();refs=[]
 for src in ['en','nl']:
  for r in x.get(src,[]):
   if r['data'].get('pos')!='verb':continue
   for f in r['data'].get('forms',[]):
    tags=set(f.get('tags',[]))
    if tags&{'archaic','subjunctive','table-tags','inflection-template','gerund','Flanders','majestic'}:continue
    ok=('past' in tags and 'participle' in tags) if field=='vd' else ('past' in tags and 'participle' not in tags and ('singular' if field=='vt' else 'plural') in tags and 'subordinate-clause' not in tags and 'perfect' not in tags)
    if ok and f.get('form'):out.add(f['form']);refs.append(r['record_id'])
 return sorted(out),sorted(set(refs))
rows=[];details=[];flags=[]
for e in seed:
 n=int(e['legacyId'][1:]);w=lemma(e);x=idx[w];problems=[];fixes=[];checks={}
 src=['legacy:'+e['legacyId']]
 for edition in ['en','nl','pl']:
  if x[edition]:src.append(f'https://{edition}.wiktionary.org/wiki/{quote(w)}#'+('Dutch' if edition=='en' else 'Nederlands' if edition=='nl' else 'niderlandzki'))
 if x['odwn']:src.append('ODWN1.4:'+','.join(r['record_id'] for r in x['odwn']))
 if x['nt2']:src.append('NT2Lex-CGN-v01:'+w)
 if x['subtlex']:src.append('SUBTLEX-NL-full:'+w)
 if n in SPLITS:problems.append('Mixed or underspecified senses/constructions.');fixes.append('Split or scope: '+SPLITS[n])
 if n in FIX:problems.append('Editorial correction or necessary usage qualification.');fixes.append(FIX[n])
 op=POS.get(n)
 if op is None and e['pos']=='ov':
  poss=[r['data']['pos'] for r in x['en']+x['nl'] if r['data']['pos'] not in {'character','suffix','prefix'}]
  op=collections.Counter(poss).most_common(1)[0][0] if poss else 'phrase'
 if op and {'zn':'noun','ww':'verb','bn':'adj','bw':'adv','vw':'conj'}.get(e['pos'])!=op:
  problems.append('Legacy POS '+e['pos']+' is incorrect or too coarse for this sense.');fixes.append('Proposed structured POS='+op+'; bind it to intended sense and verify source tag mapping.')
 if e['article']:
  obs=observations(x,'noun');checks['article_observations']=obs
  a=set(v for o in obs for v in o['articles'])
  if obs and e['article'] not in a:
   problems.append('Article conflicts with inspected noun records (sense adjudication needed).');fixes.append('Source noun article candidates: '+('/'.join(sorted(a)))+'; confirm intended sense before replacing legacy '+e['article']+'.')
   flags.append([e['legacyId'],w,'article_conflict',e['article'],sorted(a)])
  elif not obs:
   checks['article_status']='no_structured_evidence';problems.append('No structured singular-article evidence in pinned excerpt set.');fixes.append('Retrieve an explicit dictionary record for article/number; do not infer from model memory.')
  else:checks['article_status']='legacy_article_supported_at_lemma_level'
  if len(a)>1:checks['article_warning']='Multiple articles in lemma records; could be valid variants or different senses. No automatic replacement.'
 if e['conjugation']:
  checks['verb_form_checks']={}
  for field in ['vt','vtp','vd']:
   vals,refs=forms(x,field);val=e['conjugation'][field]
   variants=re.split(r'\s*[/,]\s*',val) if val else []
   matched=bool(variants) and all(v in vals for v in variants)
   checks['verb_form_checks'][field]={'legacy':val,'source_candidates':vals,'record_ids':refs,'result':'matched_surface' if matched else 'legacy_missing' if not val else 'not_confirmed'}
   if val and vals and not matched:
    problems.append('Conjugation '+field+' not confirmed by feature-filtered source forms.');fixes.append(field+': legacy='+val+'; candidates='+', '.join(vals)+'. Resolve sense/variant before changing.')
    flags.append([e['legacyId'],w,field,val,vals])
  checks['auxiliary_check']='Requires sense/construction; raw slash list is not a grading contract.'
 if e['theme']=='sep' or (e['pos']=='ww' and any(any('separable' in str(f.get('form','')) for f in r['data'].get('forms',[]) if 'table-tags' in f.get('tags',[])) for r in x['en'])):
  checks['separability']='Source/legacy identifies separability; require particle, joined/split forms and multiple spans.'
  if e['theme']!='sep':
   problems.append('Separable morphology is not structured in legacy data.');fixes.append('Extract separable parts and clause-specific forms; do not encode separability as a theme.')
 if e['theme']=='agro' and n not in CORE_AGRO:decision='move to opt-in';pack='farming';problems.insert(0,'Specialist agriculture sense has low default-family priority.');fixes.insert(0,'Move to optional farming pack; retain immutable ID and original text.')
 elif e['theme']=='slang' and n not in CORE_SLANG:decision='move to opt-in';pack='informal-slang';problems.insert(0,'Optional slang/register-specific sense.');fixes.insert(0,'Move to optional informal-slang pack with region/register and receptive-first introduction.')
 else:
  pack='core'
  if e['theme'] in ['agro','slang']:
   problems.insert(0,'Everyday/general sense is incorrectly isolated by legacy '+e['theme']+' theme.');fixes.insert(0,'Include in relevant core situation at an appropriate band; optionally cross-list the same sense in '+e['theme']+'.')
  decision='fix' if problems else 'keep'
 if n in DROP:decision='drop';pack='archive-alias';problems.insert(0,'Duplicate inflected-form teaching concept.');fixes.insert(0,DROP[n])
 if not problems:problems=['No specific defect found in this first-pass source/form and editorial screening; not certified error-free.'];fixes=['Retain intended '+e['en']+' sense as a core candidate; assign level/order, add PL and checked examples/forms before curated release.']
 src.append('editorial:OpenAI-Codex-2026-10-03; not cross-vendor reviewed')
 rows.append({'legacyId':e['legacyId'],'nl':e['nl'],'decision':decision,'problem':' '.join(problems),'proposed fix':' '.join(fixes),'source':' | '.join(src)})
 details.append({'legacyId':e['legacyId'],'lemma':w,'decision':decision,'pack':pack,'original':e,'proposed_pos':op or {'zn':'noun','ww':'verb','bn':'adj','bw':'adv','vw':'conj'}.get(e['pos'],'unknown'),'checks':checks,'sense_review':{'method':'one-model row screening of NL/RU/EN/POS; targeted source observations','verdict':'retain_candidate' if decision=='keep' else 'changes_proposed','external_reviewer':'not_run','source_headword_hit_is_not_sense_verification':True},'frequency_surface_zipf':float(x['subtlex']['Zipf']) if x['subtlex'] else None,'source_record_ids':{k:[r['record_id'] for r in x[k]] for k in ['en','nl','pl','odwn']},'universal_enrichment_gaps':['Polish translation absent','curated review absent','examples/translations/spans incomplete','audio eligibility untested']})
with (ROOT/'content/legacy-audit.csv').open('w',newline='',encoding='utf-8-sig') as f:
 wr=csv.DictWriter(f,fieldnames=['legacyId','nl','decision','problem','proposed fix','source']);wr.writeheader();wr.writerows(rows)
(ROOT/'content/legacy-audit-evidence.json').write_text(json.dumps(details,ensure_ascii=False,indent=2)+'\n')
stats={'rows':len(rows),'unique_ids':len({r['legacyId'] for r in rows}),'decisions':dict(collections.Counter(r['decision'] for r in rows)),'original_pos':dict(collections.Counter(e['pos'] for e in seed)),'original_themes':dict(collections.Counter(e['theme'] or 'none' for e in seed)),'core_reclassified_agro':len(CORE_AGRO),'core_reclassified_slang':len(CORE_SLANG),'specific_sense_split_proposals':len(SPLITS),'specific_editorial_fix_proposals':len(FIX),'surface_or_article_flags':flags,'reviewer_B':'not_run','semantics_not_measured_accuracy':True}
(ROOT/'evidence/audit-summary.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(stats,ensure_ascii=False,indent=2))
