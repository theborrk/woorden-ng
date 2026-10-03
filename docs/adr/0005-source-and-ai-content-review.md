# ADR 0005: Source-backed facts and independent AI content review

- **Status:** accepted
- **Date:** 2026-10-03 (drafted by the content research; accepted by the owner on 2026-10-03, who
  does not speak Dutch and wants all language review done by AI)
- Supersedes: blueprint §14.2 human-only language-review rule and related wording in §14.3/W19
- Preserves: ADR 0003; no legacy progress migration and no runtime AI/provider dependency
- References: W18, W19, W20, W21, F04, F08, T43, T44, T50, T57

## Context

Woorden NG is prepared by AI agents for a Polish/English-speaking family. No team member can provide dependable Dutch-language review. The existing human-only `language_reviewed` requirement therefore cannot be the production path. Simply renaming agreement between two models would hide the same risk: correlated mistakes, wrong source senses, extraction artefacts and plausible but unnatural translations can survive agreement.

The repository already accepts externally prepared content without an AI service. The proposed change concerns evidence and release policy, not adding generation to the application. Source facts, authored language judgments and task contracts must remain distinguishable. Missing content must disable only dependent tasks (T43), and authored drafts must not self-certify (T50).

## Decision

Adopt the status axes, provenance contract and rubric in `docs/content/verification-pipeline.md` and `entry-specification.md`. Remove `language_reviewed` as a newly assignable status. A factual field may be `source_verified` only with a source observation, scope, record locator and pinned hash. A linguistic field/task may be `ai_reviewed` only after importing evidence of an **actual review by a different vendor** against the current semantic payload hash. The author model and same-vendor self-check cannot confer that state.

Use source-derived spelling, article, plural, verb-form and IPA observations. Models can interpret/select among evidenced alternatives and author definitions, direct PL/EN meanings, examples and hints. They cannot invent dictionary facts and label them verified. Source disagreements route to an explicit adjudication record or `flagged`; a model majority cannot silently erase disagreement. Different Wiktionary editions and reused frequency corpora are related sources, not independent votes.

`eligible` is calculated **per task and locale** from required source/structure/review/media coverage. Structural validation, relevant factual support, independent rubric pass and absence of unresolved critical/major issues must all hold for the exact current revision. A missing optional IPA can coexist with eligible written meaning practice. Missing PL/example/audio cannot be fabricated at runtime. A field-changing edit invalidates affected reviews and task contracts; a sense change can require a new sense ID and explicit progress mapping in the new app.

Keep `legacy`, `generated_draft` and `user_private` as origin/disposition information. Legacy browsing remains distinguishable from curated learning. Private generated material is usable only through explicit user opt-in and stays visibly provisional; it never silently becomes a curated pack. Rejected/superseded entries and all original Russian text remain in provenance. Audit “drop” retires a duplicate teaching concept, not an immutable source row or history.

## Replacement text for blueprint §14.2

> Content has separate origin, structural-validation, source-fact, AI-language-review, disposition and release states. Origins include legacy, generated_draft and user_private. Deterministic checks may assign machine_checked. Source-backed fields may be source_verified, missing, conflicted or not_applicable. Linguistic review may be not_run, ai_reviewed, revision_requested or uncertain. Unresolved disagreements are flagged; rejected and superseded records remain traceable.
>
> ai_reviewed requires an actual review by a model from a different vendor against a fixed rubric and the current content hash, with original response artifact and reviewer/vendor metadata. Author self-check or a second same-vendor response does not meet that requirement. source_verified means that the stated value is supported by a cited, scoped observation; it is not a blanket guarantee of correctness or entry approval. Do not create new language_reviewed labels.
>
> The compiler calculates eligibility per task and locale. Curated tasks need all required structural, factual, independent-language and media checks and no unresolved critical/major issue. Content lacking required fields disables the affected task (T43). Generated drafts cannot grant themselves review or release status (T50). Explicitly opted-in private study remains separate from curated packs. No runtime generation or silent fallback is permitted.

## Consequential wording and implementation changes

In §14.3/W19, replace “resumable human review packets” with “resumable source-linked independent review packets”; external imports cannot self-approve. Preserve commands `content:extract`, `validate`, `import-drafts`, `review`, `compile`, `coverage`, `diff` and `media`. The research authoring happened externally; a new live `content:generate` service, credentials, provider SDK, paid API or remote ASR is **out of scope**.

Interpret T50 as rejection of imported approval claims lacking current-hash review evidence from the required independent vendor. Test missing reviewer, same vendor, stale hash, partial rubric, critical disagreement, duplicate import and changed source facts. Update architecture descriptions with this ADR only after it is accepted; never alter AGENTS/CLAUDE/review workflow rules as a side effect of content implementation.

Existing historical `language_reviewed` records must be examined: preserve any actual human-review evidence, and otherwise mark review provenance unknown. Do not automatically downgrade known reviewed facts or upgrade undocumented records. No old-app learner storage/import/migration is introduced; ADR 0003 still governs.

## Consequences and acceptance evidence

This makes curation possible without a Dutch-speaking person, while retaining an honest uncertainty model. It costs source engineering, reviewer time and disagreement handling. Vendor diversity reduces one kind of dependence; it does not guarantee linguistic correctness. Random source-adjudicated sampling and targeted risk checks monitor residual defects, with detection limitations published.

The current pilot intentionally remains blocked: 60 model-authored entries, source extraction and deterministic checks, **no different-vendor review** yet. Its six request batches are run as described in `research/content-2026-10/review/RUNBOOK.md`. It can become a curated release only after actual review/adjudication and relevant media/prerequisite gates pass. The repository owner accepts this policy/implementation; owner approval is not represented as Dutch-language expertise.

Alternatives considered: retain mandatory human Dutch review (unavailable for this project); trust one model (insufficient separation); accept any two model votes (ignores source errors/correlation); source-only cards (inadequate Polish/example/task coverage). The selected policy combines source evidence, a different-vendor challenge and deterministic enforcement, with explicit unresolved status.
