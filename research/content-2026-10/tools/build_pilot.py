"""Compile externally authored intentions with source facts. Never invokes an LLM.
Stable random IDs are allocated once in id-registry.json and reused thereafter.
"""
import collections,hashlib,json,re,uuid,xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
idx=json.load(open(ROOT/'evidence/lexical-index.json'))
intents=json.load(open(ROOT/'content/pilot-intents.json'))
seed=json.load(open(ROOT/'evidence/inputs/seed-v1.json'))['entries']
freq_extra_path=ROOT/'evidence/pilot-frequency-supplement.json'
freq_extra=json.load(open(freq_extra_path)) if freq_extra_path.exists() else {}
rp=ROOT/'content/id-registry.json'
registry=json.load(open(rp)) if rp.exists() else {}
def uid(key):
 if key not in registry:registry[key]=str(uuid.uuid4())
 return registry[key]
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def put(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def lem(e):
 a=e.get('article');w=e['nl'];return w[len(a)+1:] if a and w.startswith(a+' ') else w
def source(r,w,edition):
 return {'id':r['record_id'],'family':'Wiktionary','edition':edition,'url':f'https://{edition}.wiktionary.org/wiki/{quote(w)}','excerpt_path':f'evidence/sources/kaikki-{edition}-excerpts.json','record_sha256':r['sha256'],'retrieved_at':'2026-10-03'}
def ev(ids,method='source_extraction',status='source_verified',note=None):
 return {'source_ids':ids,'method':method,'status':status,**({'note':note} if note else {})}
def utf16(s):return len(s.encode('utf-16-le'))//2
def parse_marked(s):
 spans=[];out='';end=0
 for m in re.finditer(r'\[\[(.*?)\]\]',s):
  out+=s[end:m.start()];a=utf16(out);out+=m.group(1);spans.append({'start':a,'end':utf16(out),'text':m.group(1)});end=m.end()
 return out+s[end:],spans
entries=[]
for a in intents:
 ref=a['ref'];w=a['lemma'];x=idx.get(w,{'en':[],'nl':[],'pl':[],'odwn':[],'nt2':[],'subtlex':None});pos=a['pos'];sp=a.get('source_pos',pos)
 available=[r for r in x['en'] if r['data']['pos']==sp]
 edition='en'
 if not available:available=[r for r in x['nl'] if r['data']['pos']==sp];edition='nl'
 r=available[a.get('record_index',0)] if len(available)>a.get('record_index',0) else (available[0] if available else None)
 rd=r['data'] if r else {};rid=[r['record_id']] if r else []
 si=a.get('sense_index',0);s=rd.get('senses',[{}])[si] if len(rd.get('senses',[]))>si else {}
 sid=uid('sense:'+ref);lid=uid('lexeme:'+w+':'+pos)
 sources=[source(r,w,edition)] if r else []
 for q in x['nl']+x['pl']:
  if q['data']['pos']==sp:
   src='nl' if q in x['nl'] else 'pl';sources.append(source(q,w,src))
 selected_forms=[];noun=None;verb=None;doubts=[];notes=[];provenance={}
 model={'actor':'OpenAI Codex','vendor':'OpenAI','model_id':None,'model_id_note':'Exact runtime model identifier not exposed','run_id':'woorden-research-2026-10-03','intent_file_sha256':hashlib.sha256((ROOT/'content/pilot-intents.json').read_bytes()).hexdigest()}
 provenance['/sense']=ev(rid,'model_draft_grounded_in_source','generated_draft','Definitions, EN/PL meanings and usage decisions are authored by model A. A source gloss is evidence, not translation approval.')
 provenance['/lexeme/lemma']=ev(rid) if r else ev([],'model_authored_expression','generated_draft')
 provenance['/lexeme/pos']=ev(rid,'source_tag_mapping','source_verified' if r else 'generated_draft')
 if pos=='noun':
  tags=set(rd.get('tags',[]))|set(s.get('tags',[]));arts=[]
  if tags&{'masculine','feminine','common-gender'}:arts.append('de')
  if 'neuter' in tags:arts.append('het')
  if not arts:
   for z in x['nl']:
    if z['data']['pos']=='noun':
     tt=set(z['data'].get('tags',[]))
     if tt&{'masculine','feminine','common-gender'}:arts.append('de')
     if 'neuter' in tt:arts.append('het')
  nf=rd.get('forms',[]);pl=[f for f in nf if set(f.get('tags',[]))=={'plural'}];di=[f for f in nf if 'diminutive' in f.get('tags',[]) and not(set(f.get('tags',[]))&{'archaic','obsolete','alternative'})]
  # One primary attested value prevents rare secondary variants leaking into drills.
  plurals=pl[:1];dims=di[:1]
  for cat,ff in [('plural',plurals),('diminutive',dims)]:
   for f in ff:selected_forms.append({'id':uid('form:'+lid+':'+cat+':'+f['form']),'surface':f['form'],'features':{'kind':cat,'source_tags':f['tags']},'source_ids':rid,'status':'source_verified','grading_enabled':False,'scope':'lexeme; selected sense may restrict use'})
  noun={'article':{'accepted':sorted(set(arts)),'number':'singular','status':'source_verified' if arts else 'missing','source_ids':rid},'countability':'mass_in_this_sense' if a.get('mass') else 'count','plural':{'values':[f['form'] for f in plurals],'status':'source_verified' if plurals else 'missing','applies_to_selected_sense':not a.get('mass',False),'note':'Lexeme-level inventory; a mass reading does not license a plural drill.' if a.get('mass') else 'Primary attested plural selected; other source variants remain in raw evidence.'},'diminutive':{'values':[f['form'] for f in dims],'status':'source_verified' if dims else 'not_applicable' if w=='meisje' or 'no-diminutive' in tags else 'missing','applies_to_selected_sense':not a.get('mass',False),'note':'No invented diminutive; meisje is itself lexicalized diminutive.' if w=='meisje' else 'Lexeme-level form; meaning/countability can change.'}}
  provenance['/lexeme/morphology/noun']=ev(rid)
  if a.get('mass'):provenance['/lexeme/morphology/noun/countability']=ev(rid,'sense_scoping_by_model','generated_draft')
  if not arts:doubts.append('No usable article source for noun; article exercises disabled.')
 if pos=='verb':
  bad={'archaic','obsolete','Flanders','majestic','subjunctive','gerund','inflection-template','table-tags','class'}
  seen=set()
  for j,f in enumerate(rd.get('forms',[])):
   tags=set(f.get('tags',[]));surface=f.get('form','')
   if tags&bad or not surface:continue
   keep=tags=={'infinitive'} or ('participle' in tags and 'past' in tags) or (bool(tags&{'first-person','third-person'}) and bool(tags&{'present','past'}) and 'imperative' not in tags) or ('plural' in tags and bool(tags&{'present','past'}) and 'imperative' not in tags)
   if not keep:continue
   key=(surface,tuple(sorted(tags)))
   if key in seen:continue
   seen.add(key)
   selected_forms.append({'id':uid('form:'+lid+':'+surface+':'+','.join(sorted(tags))),'surface':surface,'features':{'kind':'verb','source_tags':sorted(tags)},'source_ids':rid,'source_selector':f'/forms/{j}','status':'source_verified','grading_enabled':False,'scope':'Source table; match grammatical context before grading.'})
  aux=[];auxrefs=[];seprefs=[]
  for q in x['odwn']:
   z=ET.fromstring(q['xml'])
   if z.get('partOfSpeech')!='verb':continue
   aa=[v.get('auxiliary') for v in z.findall('./MorphoSyntax/auxiliaries') if v.get('auxiliary') in ['hebben','zijn']]
   if aa:aux+=aa;auxrefs.append(q['record_id']);sources.append({'id':q['record_id'],'family':'ODWN/RBN','url':'https://github.com/cltl/OpenDutchWordnet','excerpt_path':'evidence/lexical-index.json','selector':w+'/odwn','record_sha256':q['sha256'],'retrieved_at':'2026-10-03'})
   mo=z.find('Morphology')
   if mo is not None and mo.get('separability')=='separable':seprefs.append(q['record_id'])
  verb={'forms':[f['id'] for f in selected_forms],'perfect_auxiliaries':{'values':sorted(set(aux)),'source_ids':auxrefs,'status':'source_verified' if aux else 'missing','scope':'Lemma observations; intended sense/construction selected by author, awaiting reviewer.'},'separable':bool(a.get('particle')),'particle':a.get('particle'),'base':a.get('base'),'joined_infinitive':w,'split_form_ids':[f['id'] for f in selected_forms if 'main-clause' in f['features']['source_tags']],'reflexive':bool(a.get('reflexive')),'reflexive_pattern':{'subject_ik':'me','subject_u':'zich','note':'Only these observed/example-supported patterns in pilot; do not generalize all persons without a source.'} if a.get('reflexive') else None,'modal_cluster_note':{'en':'A perfect tense with another infinitive may use an infinitive instead of the participle. No modal-perfect grading in this fixture.','pl':'W czasie perfectum z drugim bezokolicznikiem może wystąpić bezokolicznik zamiast imiesłowu. Ten zestaw nie ocenia takich konstrukcji.'} if w in ['kunnen','willen'] else None}
  provenance['/lexeme/morphology/verb']=ev(rid+auxrefs,'feature_filtered_source_extraction','source_verified')
  if a.get('particle'):
   if not seprefs:doubts.append('Separable decomposition requires confirmation beyond current ODWN observations.')
   provenance['/lexeme/morphology/verb/particle']=ev(seprefs+rid,'source_separability_plus_attested_split_alignment','source_verified')
   provenance['/lexeme/morphology/verb/base']=ev(seprefs+rid,'source_separability_plus_attested_split_alignment','source_verified')
  if a.get('reflexive'):
   provenance['/lexeme/morphology/verb/reflexive']=ev([q['record_id'] for q in x['nl'] if q['data']['pos']=='verb'],'source_reflexive_tag','source_verified')
   provenance['/lexeme/morphology/verb/reflexive_pattern']=ev([q['record_id'] for q in x['nl'] if q['data']['pos']=='verb'],'model_construction_draft','generated_draft','Reflexive tag is sourced; person-specific examples still await external review.')
  if w=='opstaan':doubts.append('NL source table includes combined zijn, hebben; ODWN gives zijn. Pilot get-out-of-bed sense selects zijn; external reviewer must confirm scope, not flatten table.')
 if pos not in ['noun','verb']:
  for j,f in enumerate(rd.get('forms',[])):
   if set(f.get('tags',[]))&{'archaic','obsolete','alternative','dialectal','table-tags','inflection-template','class'}:continue
   if pos=='adj' and set(f.get('tags',[]))&{'comparative','superlative','positive','attributive','predicative','inflected'}:
    selected_forms.append({'id':uid('form:'+lid+':'+f['form']+':'+str(j)),'surface':f['form'],'features':{'kind':'adjective','source_tags':f.get('tags',[])},'source_ids':rid,'source_selector':f'/forms/{j}','status':'source_verified','grading_enabled':False,'scope':'Select grammatical context; no automatic acceptance across degrees.'})
 ipa=[{'ipa':z['ipa'],'tags':z.get('tags',[]),'raw_tags':z.get('raw_tags',[]),'source_ids':rid,'source_selector':f'/sounds/{j}','status':'source_verified'} for j,z in enumerate(rd.get('sounds',[])) if z.get('ipa')]
 if not ipa:
  for q in x['nl']:
   if q['data']['pos']!=sp:continue
   ipa=[{'ipa':z['ipa'],'tags':z.get('tags',[]),'raw_tags':z.get('raw_tags',[]),'source_ids':[q['record_id']],'source_selector':f'/sounds/{j}','status':'source_verified'} for j,z in enumerate(q['data'].get('sounds',[])) if z.get('ipa')]
   if ipa:break
 if not ipa:doubts.append('Whole-entry IPA unavailable in inspected sources; no model-created IPA substituted.')
 provenance['/lexeme/pronunciation']=ev([i for z in ipa for i in z['source_ids']],status='source_verified' if ipa else 'missing',note='Source transcriptions preserved verbatim; region and convention retained, no silent normalization.')
 audio=[{'url':z.get('ogg_url') or z.get('mp3_url'),'source_ids':rid,'tags':z.get('tags',[]),'role':'headword','status':'candidate_not_downloaded','sha256':None,'license':None,'review':'not_run'} for z in rd.get('sounds',[]) if z.get('ogg_url') or z.get('mp3_url')]
 freq=x.get('subtlex') or freq_extra.get(w,{}).get('data')
 compatible_pos={'noun':'N','verb':'WW','adj':'ADJ','adv':'BW','pron':'VNW','det':'VNW','conj':'VG'}.get(pos)
 lemma_match=bool(freq and freq['dominant.pos.lemma']==w and compatible_pos and freq['dominant.pos']==compatible_pos)
 frequency={'source':'SUBTLEX-NL full workbook','unit':'surface-form','word':w,'zipf':float(freq['Zipf']) if freq else None,'surface_count':int(freq['FREQcount']) if freq else None,'contextual_diversity':int(freq['CDcount']) if freq else None,'lemma_count':int(freq['dominant.pos.lemma.freq']) if lemma_match else None,'lemma_pos':freq['dominant.pos'] if lemma_match else None,'status':'source_verified' if freq else 'missing','note':'Surface evidence is not sense frequency; lemma count uses only matching dominant lemma/POS and never sums repeated rows. Unmapped or conflicting POS leaves lemma fields null.'}
 nt2=[{'word':z['word'],'tag':z['tag'],'frequencies':{lv:float(z['F@'+lv]) if z['F@'+lv]!='-' else None for lv in ['A1','A2','B1','B2','C1']}} for z in x.get('nt2',[])]
 examples=[]
 for j,arr in enumerate([a['example']]+a.get('extra_examples',[])):
  text,spans=parse_marked(arr[0]);parts=[v['text'] for v in spans]
  target=' '.join(parts).lower();mf=[f['id'] for f in selected_forms if f['surface'].lower()==target]
  if a.get('reflexive'):mf=[f['id'] for f in selected_forms if f['surface'].lower()==' '.join(p for p in parts if p.lower() not in ['me','zich']).lower()]
  examples.append({'id':uid('example:'+ref+':'+str(j)),'nl':text,'translations':{'en':arr[1],'pl':arr[2]},'answer_spans':spans,'offset_unit':'UTF-16-code-units','target_sense_id':sid,'target_form_ids':mf,'accepted_answers':[{'ordered_segments':parts,'case_sensitive':False}],'context':{'en':a['en'],'pl':a['pl']},'task_contract':{'primary_target':'sense_in_context','valid_alternative':'ungradable_prompt_repair','unrestricted_fuzzy_match':False,'article_scored_separately':True,'requires_independent_review':True},'difficulty':a['level'],'review_status':'generated_draft','provenance':{'origin':'model_A_original','source_sentence_id':None,'direct_translation_from':'nl','reviewer_B':'not_run'}})
 if ref in ['S08','S40']:doubts.append('Productive expression assembled from sourced components; whole-expression grammatical/naturalness review required.')
 if ref=='S57':notes.append('Live Wiktionary oldid=89632764 and Cambridge confirm handing-over sense absent from older dump. POS mapping supported by ANW interjection classification.')
 if ref in ['S56','S57']:doubts.append('ANW interjection versus Wiktionary adverb is a source taxonomy difference; normalized POS chosen explicitly. IPA conventions/stress differ between sources; preserve sourced value for review.')
 if ref=='S58':notes.append('Meaning 2:30 checked in opened Omniglot time table; no phrase IPA was obtained.')
 if ref=='S59':notes.append('Both articles confirmed by Onze Taal; no de/het penalty for either.')
 if ref=='S52':notes.append('Selected lexical girl sense rather than generic diminutive-of entry; raw variants retained but not default answers.')
 if ref=='S51':notes.append('Select kinderen and kindje as primary attested forms; rare unlabelled variants stay in evidence, not active drills.')
 if a.get('note'):notes.append(a['note'])
 legacy=[{'legacy_id':e['legacyId'],'original_ru':e['ru'],'original_en':e['en'],'mapping':'lemma_link_requires_sense_adjudication'} for e in seed if lem(e)==w]
 statuses={'workflow':'generated_draft','source_facts':'partial' if not r or (pos=='noun' and not noun['article']['accepted']) else 'source_verified','ai_review':'not_run','release':'blocked','release_blockers':['independent_vendor_review_missing'],'user_private_opt_in':False}
 risks=[]
 if a.get('particle'):risks.append('separable')
 if a.get('reflexive'):risks.append('reflexive')
 if a.get('mass'):risks.append('mass_count')
 if w in ['bank','alsjeblieft','even','rekening','afspraak','gemeente']:risks.append('sense_disambiguation')
 if pos in ['phrase','intj']:risks.append('formula_or_pragmatics')
 if w in ['kunnen','willen','zijn']:risks.append('irregular_or_modal')
 provenance['/examples']=ev(rid,'model_A_original_NL_plus_direct_EN_PL_translation','generated_draft')
 provenance['/forms']=ev(rid,'feature_filtered_source_extraction','source_verified')
 provenance['/curriculum']=ev([],'editorial_policy_v0.2','generated_draft')
 provenance['/frequency']=ev(['subtlex:'+w] if freq else [],status='source_verified' if freq else 'missing')
 provenance['/cefr/source_exposure']=ev(['nt2lex:'+w] if nt2 else [],status='source_verified' if nt2 else 'missing')
 provenance['/cefr/estimated']=ev([],'model_A_estimate_not_certified_CEFR','generated_draft')
 provenance['/image_suitability']=ev([],'model_A_sense_judgment_not_norm_data','generated_draft')
 provenance['/media']=ev(rid,'source_URL_extraction','candidate_only')
 provenance['/legacy']=ev([z['legacy_id'] for z in legacy],'exact_copy_from_immutable_seed','source_verified')
 provenance['/review']=ev([],'honest_execution_metadata','recorded')
 provenance['/hints']=ev([],'model_A_meaning_reveal','generated_draft')
 provenance['/generation']=ev([],'recorded_authoring_metadata','recorded')
 provenance['/lexeme/variants']=ev([],'no_variants_selected','not_applicable')
 provenance['/lexeme/display']=ev(rid,'editorial_display_from_lemma_and_construction','generated_draft')
 entry={'schema_version':'woorden-content-research-0.2','id':sid,'fixture_ref':ref,'revision':1,'lexeme':{'id':lid,'lemma':w,'display':a.get('display',w),'pos':pos,'source_pos':sp,'variants':[],'pronunciation':{'ipa':ipa,'ipa_status':'source_verified' if ipa else 'missing','polish_approximation':None,'polish_approximation_status':'not_produced_requires_review'},'morphology':{'noun':noun,'verb':verb}},'sense':{'id':sid,'lexeme_id':lid,'definition_nl':a['nl_definition'],'meanings':{'en':[a['en']],'pl':[a['pl']]},'register':a.get('register','neutral'),'source_sense':{'record_id':r['record_id'] if r else None,'index':si if r else None,'glosses':s.get('glosses',[]),'match_status':'author_selected_needs_reviewer'} ,'usage_notes':notes,'component_lemmas':a.get('components',[]),'confusion_links':[]},'forms':selected_forms,'examples':examples,'cefr':{'estimated':a['level'],'status':'editorial_estimate','source_exposure':nt2},'frequency':frequency,'curriculum':{'stage':a['level'],'priority_order':int(ref[1:]),'priority_is_lesson_schedule':False,'themes':[a['theme']],'core':True,'utility':4,'utility_reason':'Chosen for the concrete '+a['theme']+' situation and representative fixture coverage.'},'image_suitability':{'concreteness':'high' if a.get('image')=='single_referent' else 'mixed' if a.get('image') else 'low_or_abstract','concreteness_source':'model_judgment','suitability':a.get('image','not_recommended_for_standalone_naming'),'image_status':'not_produced','accessibility':'Offer text cue alternative; never reveal target via alt text in image-only grading.'},'hints':{'en':a['en'],'pl':a['pl'],'role':'meaning_reveal','invented_mnemonic':None,'etymology':None},'media':{'audio_candidates':audio,'approved_audio':[],'listening_task_eligible':False,'device_tts':'not_tested'},'legacy':legacy,'provenance':provenance,'sources':sources,'generation':model,'review':{'statuses':statuses,'risk_categories':risks,'verification_log':[{'stage':'source_extraction','actor':'build_pilot.py','verdict':'observations_attached','source_ids':[q['id'] for q in sources]},{'stage':'editorial_self_check','actor':'OpenAI Codex; same author/vendor','verdict':'revised_draft','notes':notes,'independent':False},{'stage':'different_vendor_review','actor':None,'vendor':None,'verdict':'not_run','reason':'No other-vendor model invocation was available in this session; a review packet is supplied.'}],'unresolved_doubts':doubts+['All generated meanings, examples and PL/EN translations await independent vendor review.']}}
 if ref=='S57':entry['sense']['source_sense']={'record_id':'web-alsjeblieft-sense','index':1,'glosses':['here you are'],'match_status':'live_source_observed_author_scoped'}
 if ref=='S58':entry['sense']['source_sense']={'record_id':'web-half-drie','index':None,'glosses':[],'match_status':'time_table_observed'}
 if freq:entry['sources'].append({'id':'subtlex:'+w,'family':'SUBTLEX-NL','url':'https://osf.io/download/2dcvs/','excerpt_path':'evidence/lexical-index.json' if x.get('subtlex') else 'evidence/pilot-frequency-supplement.json','selector':w+'/subtlex' if x.get('subtlex') else w+'/data','record_sha256':digest(freq),'retrieved_at':'2026-10-03'})
 if nt2:entry['sources'].append({'id':'nt2lex:'+w,'family':'NT2Lex','url':'https://cental.uclouvain.be/cefrlex/static/resources/nl/NT2Lex-CGN-v01.tsv','excerpt_path':'evidence/lexical-index.json','selector':w+'/nt2','record_sha256':digest(x['nt2']),'retrieved_at':'2026-10-03'})
 for old in legacy:entry['sources'].append({'id':old['legacy_id'],'family':'legacy-seed','url':None,'excerpt_path':'evidence/inputs/seed-v1.json','selector':'entries[legacyId='+old['legacy_id']+']','record_sha256':digest(next(z for z in seed if z['legacyId']==old['legacy_id'])),'retrieved_at':'2026-10-03'})
 for ob in json.load(open(ROOT/'evidence/web-adjudications.json'))['observations']:
  if any(ref in target for target in ob['supports']):entry['sources'].append({'id':ob['id'],'family':'web_adjudication','url':ob['url'],'excerpt_path':'evidence/web-adjudications.json','retrieved_at':'2026-10-03','record_sha256':digest(ob)})
 if ref in ['S56','S57']:entry['provenance']['/lexeme/pos']=ev(['web-alsjeblieft-pos'],'explicit_taxonomy_mapping','source_verified','ANW interjection; raw Wiktionary adverb retained.')
 if ref=='S57':entry['provenance']['/sense/source_sense']=ev(['web-alsjeblieft-sense','web-here-you-are'],'live_page_adjudication','source_verified')
 if ref=='S58':entry['provenance']['/sense/source_sense']=ev(['web-half-drie'],'time_table_adjudication','source_verified')
 entries.append(entry)
# Same canonical form may be supported by more than one homograph/sense record.
# Merge evidence rather than emitting contradictory copies of the same form UUID.
canonical_forms={};source_catalog={s['id']:s for e in entries for s in e['sources']}
for e in entries:
 for f in e['forms']:
  if f['id'] not in canonical_forms:canonical_forms[f['id']]=json.loads(json.dumps(f))
  else:canonical_forms[f['id']]['source_ids']=sorted(set(canonical_forms[f['id']]['source_ids']+f['source_ids']))
for e in entries:
 e['forms']=[canonical_forms[f['id']] for f in e['forms']]
 have={s['id'] for s in e['sources']}
 for f in e['forms']:
  for s in f['source_ids']:
   if s not in have:e['sources'].append(source_catalog[s]);have.add(s)
for a,b in [('S49','S50'),('S56','S57')]:
 ea=next(e for e in entries if e['fixture_ref']==a);eb=next(e for e in entries if e['fixture_ref']==b)
 ea['sense']['confusion_links'].append({'sense_id':eb['id'],'type':'same_spelling_different_sense'});eb['sense']['confusion_links'].append({'sense_id':ea['id'],'type':'same_spelling_different_sense'})
for e in entries:e['content_sha256']=digest({k:v for k,v in e.items() if k not in ['review','content_sha256']})
pack={'schema_version':'woorden-content-research-0.2','pack_id':uid('pack:starter60'),'version':'0.2.0-draft','language':'nl-NL','learner_locales':['pl','en'],'entries':entries,'publication_eligible':False,'entry_count':len(entries),'notice':'Research pilot; complete field structure with honest nulls, sourced facts and model-authored content. No independent vendor review or audio QA was performed.'}
put(ROOT/'content/starter-pack.json',pack);put(rp,registry)
print('Built',len(entries),'entries;',sum(bool(e['lexeme']['pronunciation']['ipa']) for e in entries),'with sourced IPA;',sum(len(e['examples']) for e in entries),'examples')
