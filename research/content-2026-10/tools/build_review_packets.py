import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
pack=json.load(open(ROOT/'content/starter-pack.json'));idx=json.load(open(ROOT/'evidence/lexical-index.json'))
web=json.load(open(ROOT/'evidence/web-adjudications.json'))
prereqs=json.load(open(ROOT/'content/example-prerequisites.json'))
manifest=[]
for b,start in enumerate(range(0,len(pack['entries']),10),1):
 rows=[]
 for e in pack['entries'][start:start+10]:
  w=e['lexeme']['lemma'];x=idx[w]
  records=[]
  for ed in ['en','nl','pl']:
   for r in x[ed]:
    if r['data']['pos'] not in {e['lexeme']['pos'],e['lexeme']['source_pos']}:continue
    d=r['data']
    records.append({'source_id':r['record_id'],'sha256':r['sha256'],'edition':ed,'word':d['word'],'pos':d['pos'],'tags':d.get('tags',[]),'senses':[{'index':i,'glosses':s.get('glosses',[]),'tags':s.get('tags',[]),'examples':s.get('examples',[])[:2]} for i,s in enumerate(d.get('senses',[]))],'forms':d.get('forms',[]) if ed=='en' or not x['en'] else [f for f in d.get('forms',[]) if not f.get('source')][:15],'sounds':[z for z in d.get('sounds',[]) if z.get('ipa')]})
  # Exact source XML snippets supporting auxiliary/article checks; no invented synopsis.
  odwn=[r for r in x['odwn'] if r['record_id'] in {s['id'] for s in e['sources']}]
  content={k:v for k,v in e.items() if k not in ['review','generation']}
  rows.append({'entry_id':e['id'],'fixture_ref':e['fixture_ref'],'content_sha256':e['content_sha256'],'draft':content,'source_records':records,'odwn_records':odwn,'web_observations':[z for z in web['observations'] if any(e['fixture_ref'] in target for target in z['supports'])],'prerequisites':[z for z in prereqs if z['fixture_ref']==e['fixture_ref']]})
 payload={'batch_id':f'woorden-starter-v0.2-{b:02}','review_status':'not_run','rubric':'docs/content/verification-pipeline.md','response_schema':'schemas/review-response.schema.json','hash_note':'content_sha256 binds the complete canonical entry excluding review metadata; author identity metadata is omitted in this reviewer view. The importer checks against the canonical file.','entries':rows}
 p=ROOT/'review'/f'review-batch-{b:02}.json';p.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 manifest.append({'batch_id':payload['batch_id'],'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'entries':[e['fixture_ref'] for e in rows],'response_received':False})
(ROOT/'review/batch-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Created',len(manifest),'unreviewed request batches')
