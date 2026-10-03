"""Helper for running the reviewer-B round one entry at a time (see review/RUNBOOK.md).

    python3 tools/review_b.py list NN            entries of batch NN and which are done
    python3 tools/review_b.py show NN SXX        the full review packet entry for SXX
    python3 tools/review_b.py template NN SXX    an empty per-entry answer to fill in
    python3 tools/review_b.py assemble NN        build review/responses/review-response-NN.json
    python3 tools/review_b.py validate NN        run tools/validate_review_response.py on it

Per-entry answers live in review/responses/work-NN/SXX.json and the reviewer metadata in
review/responses/work-NN/reviewer.json, so an interrupted run resumes where it stopped. This
script only reads the reviewer view of each entry (the packet); it never reads the author's
self-check, and it never sets a review status.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIMENSIONS = [
    'sense_scope', 'dictionary_facts', 'dutch_naturalness', 'en_pl_translation', 'task_ambiguity',
    'span_form_contract', 'level_usefulness', 'register_pragmatics', 'hints_media',
]


def packet(nn):
    return json.loads((ROOT / f'review/review-batch-{nn}.json').read_text(encoding='utf-8'))


def work_dir(nn):
    return ROOT / f'review/responses/work-{nn}'


def entry(nn, ref):
    for e in packet(nn)['entries']:
        if e['fixture_ref'] == ref:
            return e
    raise SystemExit(f'{ref} is not in batch {nn}')


def cmd_list(nn):
    p = packet(nn)
    print(p['batch_id'])
    for e in p['entries']:
        d = e['draft']
        lemma = d['lexeme'].get('lemma', '?') if isinstance(d['lexeme'], dict) else d['lexeme']
        done = (work_dir(nn) / f"{e['fixture_ref']}.json").exists()
        en = ', '.join(d['sense'].get('meanings', {}).get('en', []))
        print(f"{e['fixture_ref']}  {'done' if done else 'todo'}  {lemma}: {en}")


def cmd_show(nn, ref):
    e = entry(nn, ref)
    print(json.dumps(e, ensure_ascii=False, indent=1))
    print('\nCitable source_ids for this entry:', ', '.join(s['id'] for s in e['draft']['sources']))


def cmd_template(nn, ref):
    e = entry(nn, ref)
    dim = {'verdict': '', 'severity': '', 'explanation': '', 'source_ids': [], 'proposed_patch': None}
    out = {
        'entry_id': e['entry_id'], 'fixture_ref': e['fixture_ref'], 'content_sha256': e['content_sha256'],
        'dimensions': {k: dict(dim) for k in DIMENSIONS}, 'overall_verdict': '', 'unresolved_doubts': [],
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))


def cmd_assemble(nn):
    p = packet(nn)
    wd = work_dir(nn)
    reviewer = json.loads((wd / 'reviewer.json').read_text(encoding='utf-8'))
    missing = [e['fixture_ref'] for e in p['entries'] if not (wd / f"{e['fixture_ref']}.json").exists()]
    if missing:
        raise SystemExit('Not reviewed yet: ' + ', '.join(missing))
    entries = [json.loads((wd / f"{e['fixture_ref']}.json").read_text(encoding='utf-8')) for e in p['entries']]
    out = ROOT / f'review/responses/review-response-{nn}.json'
    response = {'batch_id': p['batch_id'], 'reviewer': reviewer, 'entries': entries}
    out.write_text(json.dumps(response, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(out.relative_to(ROOT))


def cmd_validate(nn):
    response = ROOT / f'review/responses/review-response-{nn}.json'
    # The assembled per-entry files are the reviewer's original output; the session URL in
    # reviewer.run_reference is the audit trail of the run itself.
    result = subprocess.run(
        [sys.executable, str(ROOT / 'tools/validate_review_response.py'), str(response), str(response)],
        capture_output=True, text=True,
    )
    (ROOT / f'review/responses/validation-{nn}.json').write_text(result.stdout, encoding='utf-8')
    print(result.stdout or result.stderr)
    raise SystemExit(result.returncode)


def main(argv):
    if len(argv) < 2:
        raise SystemExit(__doc__)
    command, nn, rest = argv[0], argv[1].zfill(2), argv[2:]
    commands = {'list': cmd_list, 'assemble': cmd_assemble, 'validate': cmd_validate}
    if command in commands and not rest:
        return commands[command](nn)
    if command in ('show', 'template') and len(rest) == 1:
        return (cmd_show if command == 'show' else cmd_template)(nn, rest[0].upper())
    raise SystemExit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
