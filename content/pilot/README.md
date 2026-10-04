# Starter pilot after exercise-rule authoring (T-169)

`pilot.json` is the revised sixty-entry inspection pilot; `batch.json` is the single generation
batch for its later sample check. Both remain drafts. The original research pack and old review
responses remain unchanged. `exercise-patches.json` is the explicit authored patch list;
`report.json` records rules, old/new semantic hashes, generation input/output hashes and removed
source-table placeholders with their original IDs and bytes.

```sh
node tools/content/prepare-pilot.mjs --write
npx prettier --write content/pilot/*.json
node tools/content/import-starter-inspection.mjs --write
node tools/content/import-starter-inspection.mjs --write --all
npx prettier --write content/inspection/*.json
```

Use `--check` on each tool to check committed artifacts. Formatting the pilot precedes inspection
regeneration because the inspection manifest binds the source file's exact bytes. The batch author
is OpenAI Codex; model/version are unknown and null. No language check is performed or inferred.
Changed entries have `language_check: not_run`, `ai_review: not_run`, `release: blocked`; prior
verification events are retained with their original hashes. R1–R5 validation passes for all sixty.
This does not resolve the research pack's existing missing source-attestation bundles or other
structural link findings; T-120 must establish those independently before release.

Batch 01's rule-related patches are retained for S02/S03/S04/S06/S07/S08/S09. Its optional IPA
annotation change is not applied: sourced pronunciation data remains unchanged. Table placeholders
are excluded from active forms under R4, retained verbatim in `report.archived_forms` and the
original research; all other source facts remain byte-identical.

New verb cues state tense/person. Infinitives after `Ik wil` explicitly say so rather than being
labelled finite present-tense answers. Common equivalents are authored candidates:

- S04: `Dank u`, `Hartelijk dank`, `Bedankt` in addition to `Dank u wel` under a formal cue.
- S06: `snap` in addition to `begrijp` under present/ik.
- S08: `Zou u dat kunnen herhalen`, `Kunt u het herhalen`, `Kunt u dat nog een keer zeggen`.
- S22: `afrekenen` in addition to `betalen` after `Ik wil`.
- S32: `breng … mee` / `meebrengen` alongside `neem … mee` / `meenemen`.
- S53: `met de pin betalen` alongside `pinnen` after `Ik wil`.
- S54: `meld … me … aan`, `me aanmelden`, `meldt … zich … aan` alongside the original reflexive answers.

S27/S33/S34/S35/S40/S43/S58 use explicit self-grading for phrase variants. These choices await the
independent sample check; code review and deterministic validation do not establish Dutch quality.
