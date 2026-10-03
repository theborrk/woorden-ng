"""Offline dry-run import check. Records proposed states; never publishes a pack.
Usage: python tools/validate_review_response.py response.json original-response-export.txt
The original artifact is an audit trail, not cryptographic proof of vendor identity.
"""
import hashlib,json,sys
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[1]
if len(sys.argv)!=3:raise SystemExit(__doc__)
response_path=Path(sys.argv[1]);artifact_path=Path(sys.argv[2]);response=json.load(open(response_path));artifact=artifact_path.read_bytes()
schema=json.load(open(ROOT/'schemas/review-response.schema.json'))
errors=[e.message for e in Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(response)]
if errors:print(json.dumps({'errors':errors},indent=2));raise SystemExit(1)
vendor=response['reviewer']['vendor'].strip().lower()
if vendor in {'openai','openai codex','chatgpt','unknown','not_run',''}:errors.append('Reviewer must be an actually identified different vendor, not the author or unknown.')
batch=next((r for r in json.load(open(ROOT/'review/batch-manifest.json')) if r['batch_id']==response['batch_id']),None)
entries={e['id']:e for e in json.load(open(ROOT/'content/starter-pack.json'))['entries']};seen=set();proposals=[]
if batch is None:errors.append('Unknown review batch.')
required={'sense_scope','dictionary_facts','dutch_naturalness','en_pl_translation','task_ambiguity','span_form_contract','level_usefulness','register_pragmatics','hints_media'}
for r in response['entries']:
 e=entries.get(r['entry_id'])
 if not e:errors.append('Unknown entry '+r['entry_id']);continue
 if r['entry_id'] in seen:errors.append('Duplicate entry '+r['entry_id'])
 seen.add(r['entry_id'])
 if r['fixture_ref']!=e['fixture_ref']:errors.append('Fixture reference mismatch.')
 if r['content_sha256']!=e['content_sha256']:errors.append('Stale payload hash for '+e['fixture_ref'])
 if set(r['dimensions'])!=required:errors.append('Unexpected rubric dimensions for '+e['fixture_ref'])
 valid_ids={s['id'] for s in e['sources']}
 # Reviewer may add actually opened independent sources, but must provide them separately.
 missing_refs={s for d in r['dimensions'].values() for s in d['source_ids'] if s not in valid_ids}
 if missing_refs:errors.append('New source IDs need an attached source manifest before import: '+', '.join(sorted(missing_refs)))
 passed=all(d['verdict']=='pass' or (k=='hints_media' and d['verdict']=='not_applicable') for k,d in r['dimensions'].items())
 severe=any(d['severity'] in {'major','critical'} for d in r['dimensions'].values())
 if r['overall_verdict']=='pass' and (not passed or severe or r['unresolved_doubts']):errors.append('Inconsistent overall pass for '+e['fixture_ref'])
 proposals.append({'entry_id':e['id'],'fixture_ref':e['fixture_ref'],'proposed_ai_review':'ai_reviewed' if passed and not severe and r['overall_verdict']=='pass' and not r['unresolved_doubts'] else 'revision_requested' if r['overall_verdict']=='revise' else 'uncertain','release_state':'still_requires_policy_and_task_eligibility_evaluation'})
if batch and {r['fixture_ref'] for r in response['entries']}!=set(batch['entries']):errors.append('Response does not account for exactly the requested batch entries.')
result={'errors':errors,'artifact_sha256':hashlib.sha256(artifact).hexdigest(),'response_sha256':hashlib.sha256(response_path.read_bytes()).hexdigest(),'proposals':proposals,'mutated_content':False,'vendor_attestation_limit':'Metadata plus retained original response is an audit trail; provenance of the actual external run must be checked by the importing operator.'}
print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(bool(errors))
