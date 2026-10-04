---
id: T-156
title: Select the next eligible task from live session state
status: todo
size: M
depends_on: [T-151]
type: task
refs: [W16, T14, T15, T27, I06, I10, I11]
---

## Goal

A contributor can run a session driver that selects valid current work, fairly rotates task families and finishes when all remaining work is gated.

## Context

- Blueprint §§11.3, 12.2 and 13.1; T-151 valid-draft recovery and T-146 exposure gates.
- Use T-120 admitted task/locale queries reached through T-148, not a new content selector.

## Scope

In:

- BeginSession/next-task command with persisted deterministic seed, priority buckets, saved goal/theme filtering and current-state revalidation.
- Resume valid draft, eligible learning/relearning, due reviews, authorized new concept, then finish; bounded consecutive difficult/relearning picks and fair due-task rotation.
- Defer answer-sharing siblings to the next study day while allowing the same learning task after its genuine gap.
- Clearly labelled early/extra practice without new unseen concepts or scheduled promotion; eligible normal review routes to ordinary study.

Out (do not do in this task):

- Budget/adaptive policy (T-157/T-158), new content ranking, UI or reminders.

## Acceptance criteria

- [ ] AC1: Given current candidates and a persisted seed, when next-task runs repeatedly/reopens, then the deterministic order revalidates activation, content locale and eligibility instead of trusting a cached queue (unit and integration).
- [ ] AC2: Given a repeatedly failed last card or all cards under a short gap, when next-task runs, then it finishes or chooses another eligible task without showing a card early or looping (integration).
- [ ] AC3: Given due older tasks and a stream of difficult/relearning tasks, when selections continue, then bounded consecutive repeats and fair family rotation give the older due tasks a selection path (unit and integration).
- [ ] AC4: Given reading exposure of an answer-sharing sibling or early extra practice, when selected, then sibling deferral applies and practice records exposure/results without scheduled promotion or unseen introductions (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/session/selection/`, `src/domain/session-order/`, `tools/learning/run-session.ts`, `tests/integration/learning/selection.test.ts`.
Starter study: yes. Persist the session seed through T-129. A temporary fixed authorization/cap input is explicit; T-157 supplies actual budgets. Never reset due status just because a candidate is omitted.

## Notes for the reviewer

T15 needs an empty-alternative case; T27 needs different answer-sharing task families, not blocking every repeat of the same learning task.
