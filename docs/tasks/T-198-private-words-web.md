---
id: T-198
title: Create private senses and examples with honest eligibility
status: todo
size: M
depends_on: [T-128, T-111]
type: task
refs: [W28, F05, F09]
---

## Goal

A learner can add a private word and explicitly opt into supported private study.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Issue opaque lexeme/sense/form IDs using existing registry conventions; EN/PL preferences, explicit examples and accepted alternatives, private origin and opt-in separate from curated release. Duplicate/content validation and private browsing/edit flow.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a personal word with chosen-language meaning, when saved and studied after opt-in, then stable IDs and supported tasks persist without curated approval (integration and e2e).
- [ ] AC2: Given duplicate lemma with different sense or ambiguous grading contract, when added, then sense distinction/repair or self-assessment is explicit (unit and e2e).
- [ ] AC3: Given missing PL or absent example/audio, when opened, then only dependent tasks are disabled and no fallback content is invented (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/personal-words/`, `tests/integration/m7-m8/t-198/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
