---
id: T-167
title: Hand off the first family internal-testing release with explicit gates
status: todo
size: S
depends_on: [T-166]
type: task
refs: [W49, T74]
---

## Goal

The owner can follow a precise internal-testing runbook, see signed/offline/backup/upgrade evidence and distinguish a ready upload from missing credentials or an unverified tester install.

## Context

- Blueprint §23.4 and M4 exit; consume T-165 artifacts and T-166 upgrade evidence.
- Owner supplies Play Console app/track access, tester accounts and explicit distribution authorization; none belong in committed fixtures.

## Scope

In:

- Internal-testing handoff/runbook for permanent app ID, Play App Signing/upload key, AAB, tester opt-in and installed version verification.
- Machine-validated release-evidence checklist retaining missing/blocking results; use actual content/audio/backup/signing evidence.
- Owner-executed first install and next track upgrade result, or exact access/credential/baseline blocker; no automatic public rollout.
- Signed candidate CI device smoke test linked separately from owner Play-track evidence.

Out (do not do in this task):

- Play API automation, collecting real tester identities in git, claiming emulator tests prove Play delivery or M10 final-product certification.

## Acceptance criteria

- [ ] AC1: Given complete candidate evidence, when the handoff checklist is validated, then exact artifact hashes/versions and offline/backup/upgrade gate statuses are reported with no missing result treated as passed (integration).
- [ ] AC2: Given missing Console credentials, authorization, real baseline or tester-install evidence, when the handoff runs, then its exact owner prerequisite remains blocked and no public/track release or successful install is claimed (integration).
- [ ] AC3: Given the candidate on the CI device, when the handoff smoke case runs, then real offline study/resume/export succeed and the result is explicitly CI-device evidence rather than Play delivery (device test).
- [ ] AC4: Given an owner-provided actual Play install/update result or blocker, when imported into the evidence checklist, then version/certificate/source provenance is retained and the runbook requires same-track data retention without uninstall (integration).

## Notes for the implementer

Native work: yes. Primary files: `tools/release/handoff/`, `docs/release/internal-testing.md`, `e2e-android/family-release-smoke.spec.ts`.
Starter study: yes. Device execution is CI-only; actual listed-tester install/update runs on the owner’s phone after separate publishing authorization. Test validators with synthetic evidence clearly labelled as fixtures, never pretend they are actual Play results. Report unavailable prerequisites while finishing independent artifacts/runbook.

## Notes for the reviewer

Signing keys, tester accounts and opt-in URLs must stay out of committed test data. Internal testing is distinct from public production and internal app sharing.
