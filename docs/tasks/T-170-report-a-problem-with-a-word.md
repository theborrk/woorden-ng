---
id: T-170
title: Report a problem with a word
status: todo
size: M
depends_on: [T-128]
type: task
refs: [W17, F08]
---

## Goal

A learner who spots a wrong translation, unnatural sentence or unfair exercise can report it from
the word in two taps, and later copy all reports to hand them over.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§10, 14, 22 and the refs above.
- Policy: `docs/adr/0005-source-and-ai-content-review.md` (exercise rules R1–R5, sampled checks,
  reports); `docs/content/verification-pipeline.md` (the rules with the batch 01 examples).
- Batch 01 findings: `research/content-2026-10/review/responses/summary-01.md` and `work-01/`.
- ADR 0005 section 6; T-128's Library entry view; T-126's local profile storage.

## Scope

In:

- "Report a problem" on a word's Library entry view (and on the answer feedback of a study card if
  that screen exists on main when you start). Choices: wrong meaning or translation, unnatural
  Dutch, exercise marked me wrong, other; optional free text.
- Store reports locally in the profile with entry ID, sense ID, content hash, example ID when
  relevant, choice, text and time. Settings shows the count and "Copy reports" (JSON to the
  clipboard, works offline on web and Android); reports stay until the learner clears them.
- An optional "Hide this word for me" on the report sheet; hiding never changes content.
- EN/PL interface text, 44px targets, works at 360px.

Out (do not do in this task):

- Sending reports anywhere over the network, changing content, or processing reports (T-171).

## Acceptance criteria

- [ ] AC1: Given a word in the Library, when the learner reports "wrong translation" with a note,
      then the report is stored with the entry ID and current content hash and survives a reload.
      (e2e)
- [ ] AC2: Given two stored reports, when "Copy reports" is used, then the clipboard holds valid
      JSON with both reports in the documented format. (e2e)
- [ ] AC3: Given "Hide this word for me", when the Library list reloads, then the word is hidden
      for this profile only and the content is unchanged. (unit)

## Notes for the implementer

Document the report JSON format in `docs/content/reports.md`; T-171 imports it. Use the profile
repository from T-126; no new native plugin is needed (the clipboard API works in the WebView).
End each e2e test with `snap()`.

## Notes for the reviewer

No network calls. Reports must reference the content hash, so stale reports are detectable.
