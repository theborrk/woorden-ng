---
id: T-151
title: Resume assisted drafts and retire incompatible prompts safely
status: todo
size: M
depends_on: [T-150]
type: task
refs: [W13, T13, T38, I03, I13]
---

## Goal

A contributor can resume a persisted attempt without losing its help, or inspect why a changed prompt retires it as interrupted practice.

## Context

- Blueprint §§9.3, 17.4 and T13/T38.
- T-123 defines durable prompt context; T-149 checkpoints phases and T-150 commits outcomes.

## Scope

In:

- ResumeAttempt command/query checking profile, task activation, content revision, grading contract and expected state.
- Exact response/help/exposure restoration for compatible drafts; explicit retirement for changed/missing content with retained revisions/history.
- Completed attempt lookup on recovery, preventing a second grade after lost acknowledgement.
- Diagnostic resume driver returning valid draft, interrupted practice or already-saved result.

Out (do not do in this task):

- Content update installer, lifecycle plugins, production UI or silently remapping an answer to a different prompt.

## Acceptance criteria

- [ ] AC1: Given reveal/help followed by reload before retry, when resumed, then locked response/assistance/phase persist and the retry cannot become a clean independent trial (integration).
- [ ] AC2: Given changed content/grading revision or a retired task, when resumed, then the draft is explicitly interrupted practice, exposures remain and any new prompt has a new attempt ID (integration).
- [ ] AC3: Given another selected profile or a completed commit with lost acknowledgement, when resumed, then the draft stays profile-isolated or resolves to the existing saved result without another transition (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/learning/resume/`, `tests/integration/learning/resume.test.ts`, `tools/learning/resume-attempt.ts`.
Starter study: yes. Reuse T-123 retained context and T-129 queries. T-131 later supplies native lifecycle notifications; resumption correctness depends on semantic checkpoints, not a pause callback.

## Notes for the reviewer

T38 must invalidate the old grading contract without discarding its exposure. Reopen real persisted state, not a JavaScript snapshot.
