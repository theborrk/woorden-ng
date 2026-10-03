"""Meaningful offline checks of supplied evidence, IDs, spans, gates and audit accounting.
Not a Dutch language oracle. Exit nonzero on a concrete structural/source-contract error.
"""
import collections,csv,hashlib,json,re,unicodedata,uuid
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[1]
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def u16_slice(t,a,b):return t.encode('utf-16-le')[a*2:b*2].decode('utf-16-le')
pack=json.load(open(ROOT/'content/starter-pack.json'));entries=pack['entries'];schema=json.load(open(ROOT/'schemas/starter-pack.schema.json'));idx=json.load(open(ROOT/'evidence/lexical-index.json'))
errors=[];warnings=[];checks=collections.Counter();logs=[]
for er in Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(pack):errors.append('schema:'+str(list(er.path))+':'+er.message)
def check(ok,msg,name):
 checks[name]+=1
 if not ok:errors.append(msg)
check(len(entries)==60,'Expected 60 pilot entries','count')
sids={e['id'] for e in entries};check(len(sids)==60,'Duplicate sense IDs','identity')
all_forms={};examples_seen=set();lex_seen={};raw={r['record_id']:r for x in idx.values() for ed in ['en','nl','pl'] for r in x[ed]}
scaffold=json.load(open(ROOT/'content/scaffold-glossary.json'))['items'];scaffolds={r['surface'] for r in scaffold}
word_targets=collections.defaultdict(set)
for e in entries:
 w=e['lexeme']['lemma']
 if ' ' not in w:word_targets[w.lower()].add(e['fixture_ref'])
 for f in e['forms']:
  if ' ' not in f['surface']:word_targets[f['surface'].lower()].add(e['fixture_ref'])
prereqs=[]
for e in entries:
 ref=e['fixture_ref'];lid=e['lexeme']['id'];pos=e['lexeme']['pos'];source_ids={s['id'] for s in e['sources']};entry_checks=[]
 check(e['id']==e['sense']['id'] and lid==e['sense']['lexeme_id'],ref+': sense/lexeme mismatch','crosslinks')
 # Canonical morphology can carry sense-scope flags in this denormalized view.
 old=lex_seen.get(lid)
 freq=e['frequency'];compatible_pos={'noun':'N','verb':'WW','adj':'ADJ','adv':'BW','pron':'VNW','det':'VNW','conj':'VG'}.get(pos)
 check(freq['lemma_count'] is None or (compatible_pos is not None and freq['lemma_pos']==compatible_pos),ref+': lemma frequency joined to incompatible POS','frequency_pos')
 if old:check(old['lemma']==e['lexeme']['lemma'] and old['pos']==pos,ref+': inconsistent shared lexeme','identity')
 lex_seen[lid]=e['lexeme']
 for k in ['definition_nl']:
  check(bool(e['sense'][k]),ref+': missing '+k,'locales')
 for loc in ['en','pl']:check(bool(e['sense']['meanings'][loc]),ref+': missing meaning '+loc,'locales')
 for path,v in e['provenance'].items():
  check(all(s in source_ids for s in v['source_ids']),ref+': dangling provenance '+path+' '+str(v['source_ids']),'provenance')
 for f in e['forms']:
  if f['id'] in all_forms:check(all_forms[f['id']]==f,ref+': shared form has different content','identity')
  else:all_forms[f['id']]=f
  evidence=[raw.get(s) for s in f['source_ids']];supported=any(q and any(ff.get('form')==f['surface'] for ff in q['data'].get('forms',[])) for q in evidence)
  check(supported,ref+': unsourced form '+f['surface'],'form_source_support')
  check(not set(f['features']['source_tags'])&{'archaic','obsolete','table-tags','inflection-template','class'},ref+': forbidden default form tag','form_filters')
  check(f['grading_enabled'] is False,ref+': unreviewed form enabled','release_gate')
 for ipa in e['lexeme']['pronunciation']['ipa']:
  supported=any(s in raw and any(z.get('ipa')==ipa['ipa'] for z in raw[s]['data'].get('sounds',[])) for s in ipa['source_ids'])
  check(supported,ref+': unsourced IPA','ipa_source_support')
 noun=e['lexeme']['morphology']['noun'];verb=e['lexeme']['morphology']['verb']
 check((noun is not None)==(pos=='noun'),ref+': noun fields on wrong POS','morphology')
 check((verb is not None)==(pos=='verb'),ref+': verb fields on wrong POS','morphology')
 if noun:
  check(bool(noun['article']['accepted']) and set(noun['article']['accepted'])<={'de','het'},ref+': invalid article set','morphology')
  if noun['countability']=='mass_in_this_sense':check(noun['plural']['applies_to_selected_sense'] is False,ref+': mass plural automatically activated','morphology')
 if verb:
  check(bool(verb['perfect_auxiliaries']['source_ids']),ref+': auxiliary lacks source','morphology')
  if verb['separable']:check(bool(verb['particle']) and bool(verb['split_form_ids']),ref+': incomplete separable structure','morphology')
 for ex in e['examples']:
  check(ex['id'] not in examples_seen,ref+': duplicate example ID','identity');examples_seen.add(ex['id'])
  check(ex['nl']==unicodedata.normalize('NFC',ex['nl']),ref+': non-NFC example','spans')
  check(ex['target_sense_id']==e['id'],ref+': wrong example target','crosslinks')
  last=0
  for sp in ex['answer_spans']:
   check(sp['start']>=last and sp['end']>sp['start'],ref+': overlapping/invalid span','spans')
   check(u16_slice(ex['nl'],sp['start'],sp['end'])==sp['text'],ref+': span slice mismatch','spans');last=sp['end']
  check(ex['accepted_answers'][0]['ordered_segments']==[s['text'] for s in ex['answer_spans']],ref+': answer/span mismatch','spans')
  check(all(f in {f['id'] for f in e['forms']} for f in ex['target_form_ids']),ref+': unknown form ID','crosslinks')
  if verb:check(bool(ex['target_form_ids']),ref+': verb target not matched to sourced form','form_source_support')
  for loc in ['en','pl']:check(bool(ex['translations'][loc]),ref+': missing example translation '+loc,'locales')
  check(ex['task_contract']['valid_alternative']=='ungradable_prompt_repair',ref+': unsafe ambiguous grading','task_contract')
  # Token footprint is advisory: exact form presence is not semantic/prerequisite proof.
  masked=ex['nl']
  chars=list(masked)
  for sp in ex['answer_spans']:
   # All current NL strings use BMP characters; checked below before code-point masking.
   check(len(ex['nl'])==len(ex['nl'].encode('utf-16-le'))//2,ref+': token masking needs surrogate-aware implementation','spans')
   for z in range(sp['start'],sp['end']):chars[z]=' '
  tokens=re.findall(r"[\wÀ-ÿ]+",''.join(chars).lower());needs=set();support=set();unknown=set()
  for t in tokens:
   if t in scaffolds:support.add(t)
   elif t in word_targets:needs.update(word_targets[t]-{ref})
   elif t=='staat':support.add('staan')
   elif t=='vul' and 'in' in tokens:needs.add('S46')
   elif t in ['kun','kunt']:needs.add('S31')
   else:unknown.add(t)
  if ref=='S50':support.update(['rekening/account','staan']);needs.discard('S25')
  if ref in ['S47','S48']:grammar=['main-clause order','contrast coordination' if ref=='S47' else 'subordinate verb-final order']
  elif verb and verb['separable']:grammar=['main-clause particle separation','infinitive word order']+(['reflexive agreement'] if verb['reflexive'] else [])
  else:grammar=['sentence pattern must be reviewed before clean cloze']
  prereqs.append({'fixture_ref':ref,'example_id':ex['id'],'nl':ex['nl'],'other_fixture_candidates':sorted(needs),'support_units':sorted(support),'unresolved_surface_tokens':sorted(unknown),'grammar':grammar,'semantic_mapping_status':'model_draft_requires_sense_and_grammar_review','clean_trial_eligible_without_learner_state':False})
  if unknown:warnings.append(ref+': unresolved prerequisite tokens '+','.join(sorted(unknown)))
 check(e['review']['statuses']['ai_review']=='not_run' and e['review']['statuses']['release']=='blocked',ref+': false review/release claim','release_gate')
 check(e['content_sha256']==digest({k:v for k,v in e.items() if k not in ['review','content_sha256']}),ref+': payload hash mismatch','hash')
 for c in e['sense']['confusion_links']:check(c['sense_id'] in sids,ref+': dangling confusion link','crosslinks')
 entry_checks=['schema','identity','source_form_surfaces','source_IPA','locales','span_roundtrip','form_target_link','publication_blocked']
 logs.append({'fixture_ref':ref,'entry_id':e['id'],'content_sha256':e['content_sha256'],'source_ids':sorted(source_ids),'automated_checks':entry_checks,'author_self_check':'performed_same_vendor_not_independent','reviewer_B_verdict':'not_run','unresolved_doubts':e['review']['unresolved_doubts']})
check(pack['publication_eligible'] is False,'Pack published without reviewer','release_gate')
seed=json.load(open(ROOT/'evidence/inputs/seed-v1.json'))['entries'];rows=list(csv.DictReader(open(ROOT/'content/legacy-audit.csv',encoding='utf-8-sig',newline='')))
check(len(rows)==1946,'Audit row count wrong','audit_accounting');check({r['legacyId'] for r in rows}=={e['legacyId'] for e in seed},'Audit IDs mismatch','audit_accounting')
check(len({r['legacyId'] for r in rows})==1946,'Audit duplicate IDs','audit_accounting')
byid={e['legacyId']:e for e in seed}
for r in rows:
 check(r['nl']==byid[r['legacyId']]['nl'],'Legacy NL overwritten '+r['legacyId'],'audit_accounting')
 check(r['decision'] in ['keep','fix','move to opt-in','drop'] and bool(r['proposed fix']) and bool(r['source']),'Incomplete audit row '+r['legacyId'],'audit_accounting')
ev=json.load(open(ROOT/'content/legacy-audit-evidence.json'))
for r in ev:check(r['original']==byid[r['legacyId']],'Legacy original changed '+r['legacyId'],'legacy_preservation')
core=json.load(open(ROOT/'content/core-target-candidates.json'))['candidates'];check(len(core)==5000 and len({r['candidate_id'] for r in core})==5000,'Candidate count/identity mismatch','candidate_accounting')
check(collections.Counter(r['curriculum_stage'] for r in core)=={'A1':600,'A2':900,'B1':1500,'B2':2000},'Candidate stage totals wrong','candidate_accounting')
if not errors:
 for e in entries:
  e['review']['statuses']['workflow']='machine_checked'
  e['review']['verification_log']=[z for z in e['review']['verification_log'] if z['stage']!='automated_validation']+[{'stage':'automated_validation','actor':'tools/validate_delivery.py','verdict':'pass','content_sha256':e['content_sha256'],'note':'Structural/source support checks only; naturalness, correctness and reviewer B remain distinct.'}]
 save(ROOT/'content/starter-pack.json',pack)
save(ROOT/'content/example-prerequisites.json',prereqs);save(ROOT/'review/verification-log.json',logs)
summary={'result':'pass' if not errors else 'fail','checks':dict(checks),'errors':errors,'warnings':warnings,'entries':len(entries),'examples':len(examples_seen),'form_records':len(all_forms),'sourced_ipa_entries':sum(bool(e['lexeme']['pronunciation']['ipa']) for e in entries),'curated_release_eligible_entries':0,'independent_review':'not_run','audio_qa':'not_run','note':'This validates this delivery, not repository npm verify or linguistic accuracy.'}
save(ROOT/'evidence/delivery-validation.json',summary);print(json.dumps(summary,ensure_ascii=False,indent=2));raise SystemExit(bool(errors))
