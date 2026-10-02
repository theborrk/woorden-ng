---
id: T-014
title: Plan the tasks for milestones M9 to M11
status: todo
size: M
depends_on: [T-011]
type: plan
refs:
  [
    W32,
    W33,
    W34,
    W35,
    W36,
    W37,
    W38,
    W39,
    W40,
    W49,
    W50,
    T35,
    T36,
    T37,
    T39,
    T40,
    T41,
    T42,
    T45,
    T46,
    T47,
    T65,
    T66,
    T67,
    T68,
    T70,
    T74,
    T75,
    I21,
    I24,
    F11,
    F12,
    F13,
    F14,
  ]
---

## Goal

The work packages of M9 (offline and update reliability), M10 (accessibility and release engineering) and M11 (completion and handoff) are broken down into small, testable task files, so Codex can
implement them one pull request at a time and the ledger shows real tasks instead of this plan.

## Context

- Blueprint: Sections 18, 21, 22.4a, 22.5, 23 and 27, W32–W40, W49 and W50 in section 24; ADR 0003 section 5
- Task format and traceability: `docs/tasks/README.md`; backlog review checklist:
  `docs/agents/plan-red-team.md`

## Scope

In:

- W32–W34: offline states, staged packs, safe updates on both targets, storage management and
  scale (T35–T37, T39–T42, T65–T68).
- W35–W37: complete EN/PL interface and accessibility audit (T45–T47), the cross-browser and
  device suite (adds Firefox and WebKit to `config.playwrightBrowsers`; decides how the minimum
  Android SDK is verified), release engineering (T70, T74, T75).
- W38–W40: catalog accounting, guides, the traceability report; the M10 parts of W49 and W50.
- New task files numbered after the highest existing task, each with `refs` naming the blueprint IDs
  it implements, and `depends_on` pointing at real tasks.
- Questions about the blueprint, listed in the PR body.

Out (do not do in this task):

- Application code. Changes to `docs/architecture/` (propose them in the PR body instead).

## Acceptance criteria

- [ ] AC1: Every ID in this plan's `refs` appears in the `refs` of at least one new task: with this
      plan set to `done`, `npm run check:tasks` still passes (verify)
- [ ] AC2: Every new task is size S or M, a vertical slice, and has Given/When/Then criteria naming
      the test type (unit, integration, e2e, device test) that proves them (review)
- [ ] AC3: Native work (plugins, permissions) sits in tasks of its own, and every native task has a
      device test criterion (review)
- [ ] AC4: Dependencies are minimal and correct, so at least three tasks can start in parallel
      without touching the same files (review)

## Notes for the implementer

- Order by risk and value: the riskiest unknowns first, polish late.
- A blueprint work package marked L usually becomes three to six tasks.
- Mark this plan `done` with all criteria ticked in the same PR.

## Notes for the reviewer

Apply `docs/agents/plan-red-team.md`. Coverage and test quality are the main risks.
