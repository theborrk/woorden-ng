---
id: T-126
title: Persist a local profile and independent language preferences on web
status: done
size: M
depends_on: [T-123, T-004, T-006]
type: task
refs: [W06, F06, I14, I18, I22]
---

## Goal

A PWA learner can create/select a local profile and save interface and learning-language choices
independently, with the same choices after an offline restart.

## Context

- Blueprint §§7.2, 8, 17.1; ADR 0004 React shell/localization.
- T-004 web spike proves transaction primitives, not a production profile repository.

## Scope

In:

- Validated local profile/preferences commands and queries, installation ID allocation and a shared
  transaction-scoped repository/ LearningUnitOfWork port; real versioned Dexie profile persistence.
- Settings create/select and EN/PL UI versus learning-language controls, timezone/day-boundary and
  gentle workload defaults as configuration. Profile-scoped preference revisions and honest save status.
- Independent web DB/shared logical/projection version metadata and non-destructive open failure.

Out (do not do in this task):

- Native adapter/plugins (T-127), learning flow/scheduler, reminder implementation or content schemas.
- Old storage keys, legacy settings import, cloud accounts or implied cross-installation sync.

## Acceptance criteria

- [x] AC1: Given a new offline-capable PWA, when a profile and preferences are saved then reloaded,
      then the stable profile ID and choices survive and success appears only after commit (integration and e2e).
- [x] AC2: Given PL learning cues, when the interface changes to EN, then cues and historical task
      locale remain PL and both controls show their independent values (unit and e2e).
- [x] AC3: Given two profiles with different preferences, when switching, then each retains its
      own configuration and the UI explains that another installation has separate data (e2e).
- [x] AC4: Given invalid preferences or a rejected transaction, when saving, then nothing is
      partially persisted and the edited values remain available for retry (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/ports/`, `src/application/profiles/`,
`src/infrastructure/db/web/`, `src/features/settings/profiles/`, `src/targets/web.ts`, `src/i18n/`.
Keep native startup unchanged until T-127. No vendor transaction handles escape the adapter.
T-110 remains the only entry schema owner. Full onboarding and workload behavior stay with later plans.

## Notes for the reviewer

Use real Dexie in integration tests and screenshots for user flows. Configuration defaults do not
claim that the later scheduling or learning features are implemented.

## Implementation evidence

- AC1: `src/infrastructure/db/web/profiles.test.ts` reopens the real Dexie database and
  verifies installation/profile identity and versions. `e2e/profiles.spec.ts` saves preferences
  and reloads the production PWA offline. `Profiles.test.tsx` checks pending/failed commit status.
- AC2: the same integration suite preserves PL cues and immutable historical task context;
  the e2e language flow changes PL UI to EN while PL learning language survives reload.
- AC3: the e2e isolation flow switches two profiles and checks the separate-installation explanation.
- AC4: integration tests reject invalid values/stale revisions and abort after all writes,
  including profile creation; prior rows remain exact. E2e injects a real IndexedDB put failure,
  retains edits and retries successfully. Unsupported metadata is rejected without reset.
- Web schema, logical format and projection versions start independently at 1. Existing runtime
  contracts validate all records; no vendor handles escape transaction-scoped repositories.
  Browser/session language remains the initial default; committed profile preferences take
  precedence on reopen. Native startup retains the existing session-language control until T-127.
- Language selects save automatically; timezone/day boundary/new-concept edits use Save preferences.
  Configuration defaults expose two new concepts, a 06:00 boundary, six acquiring tasks and
  a ten-minute target without claiming that future learning behavior is already implemented.
