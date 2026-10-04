# Architecture

**[`blueprint.md`](blueprint.md) is the specification for Woorden NG.** It is the Astra blueprint
(revision 2, 2 October 2026), copied here unchanged. Read it as amended by the decisions below; when
they disagree, the ADRs win.

| Read                                                                                     | For                                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`blueprint.md`](blueprint.md)                                                           | Product scope (F01–F14), architecture, contracts, tests (T01–T75), work packages (W01–W51) |
| [`../adr/0006-native-sqlite-plugin.md`](../adr/0006-native-sqlite-plugin.md) | Native SQLite plugin for Android storage (T-005) |
| [`../adr/0005-source-and-ai-content-review.md`](../adr/0005-source-and-ai-content-review.md) | **Content quality without a Dutch speaker:** source-verified facts, exercise rules and one sampled different-vendor check per batch replace section 14.2's human language review |
| [`../content/`](../content/) | Content research: curriculum, entry format, sources, verification pipeline, legacy audit (data in `research/content-2026-10/`) |
| [`../adr/0004-react-shell-and-localization.md`](../adr/0004-react-shell-and-localization.md) | React shell, hash routes and EN/PL interface localization (T-006) |
| [`../adr/0003-woorden-scope-and-adaptation.md`](../adr/0003-woorden-scope-and-adaptation.md) | **Scope change: no data migration from the old app**, and how the blueprint maps onto this repository |
| [`../adr/0002-build-targets-and-device-tests.md`](../adr/0002-build-targets-and-device-tests.md) | Build targets, composition root, device tests on an emulator                |
| [`../adr/0001-agent-workflow-and-delivery.md`](../adr/0001-agent-workflow-and-delivery.md) | Who does what: Codex implements, Claude reviews, the owner merges           |
| [`../tasks/`](../tasks/)                                                                 | The backlog and the requirement ledger (`npm run check:tasks -- --ledger`)  |

## Reading the blueprint in this repository

- **"Claude Code" in the blueprint means the implementing agent.** Here that is Codex, one task per
  pull request. Section 1's rules (implement the full scope, keep a ledger, don't stop at a
  scaffold, ask only about product-changing or data-losing decisions) apply to the backlog as a
  whole.
- **Section 17.3 (legacy v1 migration), W08, T31, T33, T34 and scenario 26.5 are out of scope.**
  Nothing is imported from the old app's storage or backup files. The 1,946 seed entries are still
  carried over as content. See ADR 0003 for everything this changes.
- **Section 14.2 (human language review) is replaced by ADR 0005.** Nobody on the project speaks
  Dutch: facts must be `source_verified` against a pinned source, exercises follow fixed rules the
  validator enforces, and each generation batch gets one sampled check by a model from a different
  vendor than the author. Learners can report problems from the app.
- **IDs are the backbone.** Tasks name the blueprint IDs they implement in `refs`, and
  `docs/tasks/required-refs.json` lists every in-scope F, W, T and I ID, so CI proves nothing is
  forgotten.
- **Section 6's layout is the target layout.** The bootstrap already provides two pieces of it under
  different names: the composition roots are `src/targets/web.ts` and `src/targets/android.ts`
  (section 6's "build-target composition root"); web end-to-end tests live in `e2e/` and device
  tests in `e2e-android/` (section 6's `tests/e2e/`). Unit and domain tests may sit next to the code
  or in `tests/domain/` and `tests/integration/`.
- **The companion voice-tutor design** (`Woorden-future-voice-tutor-connector-design.md`) is not in
  this repository. Only the provider-neutral preparation in section 20.2 (W51) is in scope, and
  section 20.2 describes it fully.
- **Resolved versions and spike results** go in this folder as tasks produce them
  (`notes.md`, `spikes/`), as section 5 asks.
