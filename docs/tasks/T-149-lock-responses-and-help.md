---
id: T-149
title: Persist the first response and assistance before feedback
status: todo
size: M
depends_on: [T-148, T-144]
type: task
refs: [W12, T03, T04, T06, T07, T13, I03, I04, I13, F01]
---

## Goal

A contributor can open a real durable attempt, lock a typed or self-reported response before feedback, request help and reopen the exact attempt phase.

## Context

- Blueprint §§8, 9.3, 10.4 and scenarios 26.1–26.3.
- Reuse T-123 attempt records, T-129 persistence, T-144 classification and T-148 admitted content queries.

## Scope

In:

- OpenAttempt, LockResponse and RequestHelp commands with stable attempt ID, revision/parent/base and immutable prompt/content/cue snapshot.
- Persist first response/declaration once, support resource/kind/time/phase before display and subsequent feedback as exposure.
- Headless command driver for Check my answer versus I need the answer, preserving evidence source and graduated permitted help.
- Semantic checkpoints and stored reveal state prevent clean-looking retries after reload.

Out (do not do in this task):

- FSRS commit (T-150), typed matcher, recording, UI or lifecycle plugins.

## Acceptance criteria

- [ ] AC1: Given a valid eligible task, when its first typed response or spoken/thought declaration is locked, then the durable response precedes feedback and later reveal cannot change its initial outcome/source (integration).
- [ ] AC2: Given requested sound/image/letter support or full reveal before responding, when help is displayed by the driver, then committed assistance/omission precedes the returned answer and cannot become unaided success after reload (integration).
- [ ] AC3: Given a failed help/checkpoint write, when requested, then help is not acknowledged as safely displayed and the draft/error remains available without a false saved state (integration).
- [ ] AC4: Given repeated lock/help commands and a correct retry after initial failure, when reopened, then the same stable attempt and original response/help survive without an extra committed attempt (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/learning/attempt-lifecycle/`, `tests/integration/learning/attempt-lifecycle.test.ts`, `tools/learning/run-attempt.ts`.
Starter study: yes. T-148 carries the T-120 prerequisite. Help cannot be returned as a clean prompt after a write failure. Use existing transaction and schemas; no SQL/Dexie types in command contracts.

## Notes for the reviewer

A self-report locks a declaration before target display; subsequent comparison can record judgment but cannot invent app-verified speech.
