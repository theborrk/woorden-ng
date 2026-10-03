"""Write draft vertical slices in the repository's inspected task template format."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/tasks'
# id, title, size, dependencies, refs, goal, in-scope, out-of-scope, acceptance criteria
tasks=[
(100,'Pin source downloads and expose an inspectable manifest','S',[],['W18','F08'],
'A contributor can import one local source file, see its identity and detect incomplete or changed bytes before lexical facts are used.',
['Add a source-manifest schema and content:sources inspect command for local files.','Record URL, retrieval date, bytes, SHA-256, format, version and lineage; reuse the existing content tooling layout.'],
['Lexical normalization, live scheduled downloads or provider credentials.'],
['Given a complete local fixture, when inspected twice, then source identity and checksums are stable and printed in a reviewable report. (unit, CLI)','Given truncated or changed bytes, when the expected manifest is supplied, then inspection fails without adopting the new file. (unit)']),
(101,'Import NT2Lex exposure with explicit sense links','M',[100],['W18','F04','F08'],
'A contributor can inspect level exposure for a lemma/POS and see which observations have an ODWN crosswalk.',
['Import both pinned TSV variants and preserve all A1–C1 distributions.','Map dash to missing; expose candidate sense_se-id links and extraction provenance.'],
['Assigning certified CEFR levels or implementing ranking.'],
['Given the pinned basic/sense fixtures, when imported, then 15,227/17,743 rows are accounted for without collapsing POS or missing values. (integration)','Given a sense_se-id, when crosswalk output is inspected, then it targets ODWN LexicalEntry.id and never child Sense.id. (unit)','Given A1 attestation, when an entry is displayed, then it is labelled source exposure rather than automatic A1 proficiency. (unit)']),
(102,'Import SUBTLEX surface and lemma frequency separately','M',[100],['W18','F04','F08'],
'A contributor can query Dutch surface counts, CD and a justified lemma/POS frequency without double-counting repeated lemma fields.',
['Stream the pinned full and CD≥2 workbooks with typed fields and header validation.','Expose lookup evidence and unmatched/POS-ambiguous joins in a CLI report.'],
['A new corpus crawler, sense-frequency inference or final curriculum selection.'],
['Given the pinned workbooks, when loaded, then 437,503 and 150,357 data rows are counted and quoted units are preserved. (integration)','Given inflected rows sharing FREQlemma, when a lemma query runs, then the importer never sums duplicated lemma totals. (unit)','Given missing or mismatched dominant lemma/POS, when scoring input is requested, then lemma count is unknown and surface evidence remains separately available. (unit)']),
(103,'Import explicit ODWN article and morphology observations','M',[100],['W18','W20','F08'],
'A contributor can inspect sense-linked articles, plurals, auxiliary and separability observations from ODWN with their original lineage.',
['Parse LexicalEntry/Lemma/WordForms/Morphology/MorphoSyntax and sense provenance from the pinned XML.','Produce conflict reports with source record IDs and XML pointers.'],
['Treating every synset as a curriculum sense or inferring articles from m_f.'],
['Given huis-n-1, when article evidence is extracted, then explicit het survives the conflicting gender-like metadata with a visible conflict note. (unit)','Given de/het or absent article fields, when normalized, then alternatives or missing state are retained rather than guessed. (unit)','Given RBN/Wiktionary/automatic provenance, when an observation is exported, then lineage is preserved and not counted as independent by project name alone. (unit)']),
(104,'Import English-edition Dutch forms and IPA from Kaikki','M',[100],['W18','W20','F08'],
'A contributor can retrieve source-attested forms, senses and IPA for one Dutch headword without table headings entering accepted answers.',
['Stream JSONL, filter lang_code nl, retain source record hash and field selector.','Map modern form features with a positive allowlist and preserve excluded records for inspection.'],
['Guessing absent forms, treating inflected headwords as canonical lemmas or permanent dependence on the deprecated export URL.'],
['Given opstaan, when extracted, then joined and split forms remain distinguishable while table-tags/class/template rows never become forms. (unit)','Given regional/archaic or underspecified variants, when a default form is requested, then the importer requires a scoped choice rather than accepting every table cell. (unit)','Given a word with no IPA, when imported, then IPA is missing and no synthesized transcription is inserted. (unit)']),
(105,'Join Dutch and Polish dictionary observations by sense','M',[103,104],['W18','W20','F08'],
'A reviewer sees Dutch definitions and Polish gloss evidence beside the intended sense and can identify unsupported translations.',
['Import nl/pl edition JSONL with Dutch-language filtering and edition lineage.','Add a source-comparison report keyed by lemma/POS and proposed sense alignment.'],
['Automatic translation approval or three votes from three Wiktionary editions.'],
['Given Polish afspraak evidence for agreement, when appointment is selected, then the tool reports a sense mismatch and does not approve appointment translation. (unit)','Given a combined auxiliary/table string, when candidate forms are extracted, then it remains raw evidence and not a single accepted surface. (unit)','Given unavailable PL evidence, when coverage runs, then the field is missing or model-draft rather than source-verified. (unit)']),
(106,'Add advisory OpenTaal spelling checks','S',[100],['W18','W20','F08'],
'A contributor can see spelling-list hits and misses without valid compounds or service names being silently rejected.',
['Import the pinned text list and version marker.','Report exact matches, compounds/MWEs and allowlisted named services separately.'],
['Inferring meaning/article/level or hard-rejecting every list miss.'],
['Given an exact headword, when checked, then its source-list result includes snapshot and case-sensitive original spelling. (unit)','Given a phrase or DigiD/BSN allowlist entry absent from the list, when checked, then a review advisory appears and the record is not silently dropped. (unit)']),
(107,'Retrieve Tatoeba candidates with direct EN and PL links','M',[100],['W19','W20','F08'],
'A reviewer can inspect a Dutch sentence and the actual direct translation edges before choosing it as an example candidate.',
['Import sentence IDs/text and direct graph links; preserve snapshot and edge provenance.','Export candidate packets with author/revision metadata when available and explicit missing metadata when not.'],
['Transitive translation approval, corpus-wide language certification or live generation.'],
['Given the pinned export, when direct links are counted, then 2,273 Dutch IDs with both EN and PL edges are reproducible. (integration)','Given NL→EN→PL without NL→PL, when queried, then no direct Polish translation is claimed. (unit)','Given a selected sentence, when exported, then the reviewer sees all chosen IDs, source texts and unreviewed status. (unit)']),
(108,'Rank a situation block with visible score components','M',[101,102],['W18','F04','F08'],
'A contributor can select a small curriculum block and explain each inclusion, exclusion and dependency.',
['Implement the versioned 35/25/20/10/10 scoring configuration and deterministic tie-breaks.','Require utility situations, theme coverage and construction links; keep imputation flags and learning bands separate from CEFR estimates.','Run first on a 100-candidate fixture; export selected/missing/excluded report.'],
['Claiming the supplied 5,000 provisional candidates are fully curated or adapting the learner scheduler.'],
['Given the same inventory/config, when ranked twice, then scores and ordering are identical with all components exposed. (unit)','Given missing frequency or an MWE, when ranked, then neutral imputation is logged only in the score and corpus values remain null. (unit)','Given uncovered situations and prerequisite constructions, when a block is filled, then constraints are recomputed and unsatisfied requirements are reported. (integration)']),
(109,'Import all legacy audit decisions without losing provenance','M',[103,104,106],['W18','W20','F04','F08'],
'A contributor can inspect one decision for every legacy entry and apply a reviewed annotation while preserving original text and identity.',
['Import legacy-audit.csv plus evidence; preserve s0–s1945 and original RU/EN.','Represent keep/fix/opt-in/drop-as-alias separately from review readiness and show proposed changes.','Add coverage totals and a reversible annotation-only application path.'],
['Old-app progress/settings/backup migration, erasing dropped rows, or auto-approving the research audit.'],
['Given the seed and CSV, when imported, then every one of 1,946 unique IDs is accounted for once and original RU is byte-equivalent as text. (integration)','Given s295 het eten, when proposed changes are shown, then noun/verb contamination is visible without modifying the immutable source. (unit)','Given s1392 deksel and s800 soort, when article candidates differ, then valid alternatives are not classified as unconditional errors. (unit)']),
(110,'Validate one sense entry with explicit spans and provenance','M',[],['W18','W20','F08','T43','T50'],
'A contributor can validate a sense entry and see which task families lack the required data.',
['Adopt the exchange contract as a repository schema with immutable registry IDs and JSON-pointer provenance.','Add semantic checks for sense/form links, EN/PL presence, NFC/UTF-16 spans and source-status scope.','Accept ADR 0005 wording only through the normal reviewed decision process; keep it proposed until adopted.'],
['Runtime AI, learner scoring changes or marking the research fixture approved.'],
['Given a discontinuous separable example, when validated, then ordered segments round-trip exactly and point to the intended form/sense. (unit)','Given an invented source_verified fact without evidence, when imported, then validation rejects the assertion. (unit)','Given missing PL/example/audio, when eligibility is inspected, then only dependent task families are blocked and no content is fabricated. (unit)']),
(111,'Import external draft batches idempotently','M',[110],['W19','W20','F08','T50'],
'A contributor can import a saved external model draft twice without duplicate senses or unearned approvals.',
['Accept constrained JSON and generation provenance, allocate IDs once and preserve draft origin.','Return a reviewable change report and store input artifact hashes.'],
['content:generate, provider SDKs, credentials or accepting producer-supplied approval flags.'],
['Given the same batch twice, when imported, then canonical IDs and counts remain unchanged. (unit)','Given a batch claiming language_reviewed or ai_reviewed without separate evidence, when imported, then it stays draft or is rejected with a reason. (unit)','Given an edited definition, when reimported, then revision/hash changes and affected reviews are invalidated. (unit)']),
(112,'Export resumable source-linked reviewer packets','S',[105,111],['W19','F08','T50'],
'A contributor can hand a bounded review packet to Claude and resume from the next incomplete batch.',
['Export ten-entry packets with source observations, current content hashes and the fixed rubric.','Track batches and required dimensions without copying the author confidence verdict into reviewer instructions.'],
['Invoking a provider, fabricating a reviewer response or requiring a Dutch-speaking human.'],
['Given 60 imported drafts, when exported, then six packets account for all entry hashes once. (integration)','Given an incomplete prior review, when exporting again, then completed unchanged entries are distinguishable and outstanding work is resumable. (unit)']),
(113,'Validate independent review evidence and disagreement states','M',[112],['W18','W19','F08','T50'],
'A contributor can import an actual independent review response and see which entries pass, need revision or remain unresolved.',
['Validate reviewer/vendor metadata, retained raw artifact, exact payload hash and all rubric dimensions.','Reject author/same-vendor/stale/incomplete approvals and contradictory overall pass verdicts.','Record adjudication/revision history and source-family conflicts.'],
['Auto-publishing on model agreement, treating vendor strings as cryptographic proof, or majority voting away source conflict.'],
['Given a same-vendor or stale-hash approval, when imported, then no ai_reviewed state is granted. (unit)','Given a major source conflict or revised entry, when reviewed, then affected tasks remain blocked until the revised hash is independently reviewed. (unit)','Given a valid complete response and original artifact, when imported twice, then review events are idempotent and retain provenance. (integration)']),
(114,'Compile packs from task and locale eligibility','M',[113],['W18','F08','T43','T50'],
'A contributor can compile a versioned pack containing only tasks whose required data and reviews are current.',
['Implement a pure eligibility function and a small pack compiler with manifest hashes.','Separate written, article, form, cloze, picture and listening gates and preserve flagged/draft records outside the curated pack.'],
['UI redesign, new scheduling policies or mandatory media for every sense.'],
['Given a reviewed written entry with absent audio, when compiled, then written tasks can appear and listening tasks cannot. (unit)','Given no independent review, when the delivered 60-entry pilot is compiled, then curated output contains zero eligible entries and a concrete blocker report. (integration)','Given changed content after review, when compiled, then stale review cannot authorize the new payload. (unit)']),
(115,'Load the first starter slice into a content inspection view','M',[111],['W20','F04','F08','T43'],
'A contributor can inspect the first ten starter senses with PL/EN meanings, examples, source facts and review status.',
['Import S01–S10 as explicitly unreviewed drafts using issued registry IDs.','Expose a minimal content inspection route or existing review view with field provenance and missing-data notices.'],
['Curated publication, learner progress migration or a new study engine.'],
['Given S01–S10, when opened in the inspection view, then all locales/examples/source states are visible and no unreviewed badge implies approval. (e2e)','Given a missing whole-expression IPA, when rendered, then the UI shows an honest unavailable state without generated phonetics. (e2e)']),
(116,'Load the remaining representative starter cases','M',[115],['W20','F04','F08','T43','T50'],
'A contributor can inspect the complete 60-entry fixture and exercise its noun, separable, reflexive, modal and polysemy cases.',
['Import S11–S60 with existing issued IDs and explicit form/example contracts.','Merge shared bank/alsjeblieft lexeme/form evidence and retain separate sense identities.','Include supplied source-backed facts and all review blockers; data files are fixtures, not hundreds of new implementation branches.'],
['Filling the complete 5,000-sense curriculum or calling any model from the app.'],
['Given the complete fixture, when validated, then 60 senses and 65 translated examples are accounted for and all answer spans round-trip. (integration)','Given bank and alsjeblieft, when switching senses, then meanings/examples change while canonical shared identity remains consistent. (e2e)','Given meenemen/opstaan/invullen/inschrijven, when inspected, then joined and discontinuous/reflexive targets remain explicit. (unit)']),
(117,'Report curriculum coverage and content changes honestly','M',[108,109,114,116],['W18','W20','F04','F08','T43','T50'],
'A contributor can distinguish source-candidate coverage, actual sense coverage and release readiness before publishing a change.',
['Report counts by locale/task/theme/review state and compare an explicit target manifest to seed/sense mappings.','Show semantic diffs, aliases and reviews invalidated by edits; identify sample and source-family denominators.'],
['Claiming headword overlap equals sense coverage or estimating an unknown language error rate as zero.'],
['Given the provisional 5,000-candidate baseline, when coverage runs, then 2,120 headword matches and 2,880 misses are labelled candidate counts, not verified sense coverage. (integration)','Given a sense split or article change, when diffed, then progress-impacting/new-app identity consequences and invalidated checks are visible. (unit)','Given no B review, when reporting agreement, then the result is unknown/not_run with denominator zero. (unit)']),
(118,'Import and QA one downloadable audio slice','M',[100,114],['W21','F08','T43'],
'A contributor can attach and verify a small audio pack and see listening tasks disabled for missing or invalid assets.',
['Implement content:media manifest/import for a small approved candidate set with text/voice/region/hash/MIME/duration/attribution metadata.','Check corrupt files, download status and text-to-asset identity; leave pronunciation QA explicit.'],
['Mass TTS generation, cloud provider integration, remote ASR or claiming pronunciation QA from a checksum.'],
['Given valid approved audio, when packaged/downloaded, then replay resolves by the expected hash. (integration)','Given a missing/corrupt/wrong-text asset, when eligibility is evaluated, then listening is blocked and eligible written tasks remain usable. (unit)','Given an unlistened source URL, when imported, then it remains candidate-only. (unit)']),
(119,'Probe local Dutch TTS and expose explicit fallback states','M',[118],['W21','F08','T43'],
'A learner can tell whether a usable local Dutch voice is available and can continue with written practice when it is not.',
['Implement platform adapter capability probes using locale, Android network-required flag and browser voice locality.','Expose unavailable/download-needed/tested-local states and record actual-device offline smoke-test results.'],
['Installing Android SDK locally, silently calling online TTS, pronunciation grading or runtime AI.'],
['Given no Dutch/local voice, when requested, then no wrong-language or silent network fallback occurs and a clear repair action appears. (unit, e2e)','Given a selected voice on a real device in airplane mode, when the QA phrase set plays, then actual results and engine/version are recorded; CI-only device gates follow repository policy. (device/manual)','Given an untested voice, when capability is displayed, then availability is not labelled pronunciation-approved. (unit)']),
(120,'Admit the pilot only after the actual external review','S',[113,114,116],['W19','W20','F04','F08','T50'],
'The pilot can move from research draft to eligible written tasks after real independent review and source adjudication.',
['Obtain the six actual Claude/different-vendor response artifacts outside the app and import them with the validation tool.','Resolve or retain every flagged dimension; update exact reviewed hashes and task-level coverage.'],
['Simulated reviewer responses, blanket status edits or marking all 60 complete when only a subset passes.'],
['Given missing external artifacts, when admission is attempted, then the task remains blocked and zero fabricated verdicts are recorded. (integration)','Given real passing responses on current hashes, when admitted, then only applicable passing task families become eligible and all unresolved entries remain flagged. (integration)']),
(121,'Add an optional Apertium conflict check','S',[103,104],['W18','W20','F08'],
'A contributor can inspect a third-project morphology observation without treating it as an automatic deciding vote.',
['Read active XML section entries and selected paradigm gender/separability features.','Produce disagreement rows including landbouw and retain raw paradigm IDs and lineage caveats.'],
['Regex-counting commented entries, replacing primary forms, or declaring projects statistically independent.'],
['Given active versus commented entries, when imported, then only active XML entries are counted. (unit)','Given conflicting landbouw gender, when compared, then the conflict is surfaced and no automatic correction is applied. (unit)']),
(122,'Export source-constrained authoring briefs for external generation','S',[103,104,108,110],['W19','W20','F04','F08','T50'],
'A contributor can prepare a bounded Model A prompt containing the exact source facts, intended situation, prerequisites and required output contract.',
['Export a small source-backed authoring brief and the copy-ready author-A prompt, with immutable input hashes.','Include missing/conflicted factual fields, direct PL/EN translation requirements and examples/answer-span constraints.'],
['Calling a provider, generating grammar facts from memory, or adding content:generate to the application.'],
['Given five selected senses, when briefs are exported, then every asserted dictionary fact points to supplied evidence and unknown fields remain explicit. (unit)','Given a model return file, when passed to the existing draft importer, then it follows the unapproved draft path and cannot import its own approval. (integration)'])
]
for no,title,size,deps,refs,goal,inside,outside,criteria in tasks:
 tid=f'T-{no:03}';slug='-'.join(title.lower().split());slug=''.join(c for c in slug if c.isalnum() or c=='-')
 status='blocked' if no==120 else 'todo'
 text=f'''---
id: {tid}
title: {title}
status: {status}
size: {size}
depends_on: [{', '.join(f'T-{d:03}' for d in deps)}]
type: task
refs: [{', '.join(refs)}]
---

## Goal

{goal}

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; proposed `docs/adr/0005-source-and-ai-content-review.md`.
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.

## Scope

In:
'''+''.join('- '+x+'\n' for x in inside)+'''\nOut (do not do in this task):\n'''+''.join('- '+x+'\n' for x in outside)+'''\n## Acceptance criteria\n\n'''+''.join(f'- [ ] AC{i+1}: {c}\n' for i,c in enumerate(criteria))+'''
## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. Content review in Claude must be an actual separately recorded operation on the exact payload; a code review alone does not imply all Dutch text passed the language rubric.
'''
 if no==120:text+='\nBlocked input: no different-vendor review artifacts existed when this research package was prepared. Use `review/reviewer-B-prompt.md` and six request batches; this is an input gate, not a request for a Dutch-speaking human.\n'
 (OUT/(tid+'-'+slug+'.md')).write_text(text)
ledger=['# Proposed content task slices','','These are drafts, not repository changes. IDs T-100–T-122 were unused in the inspected main branch (T-001–T-014 existed). Recheck before merging. Existing T-001 is done. Dependencies listed here are internal to this proposed slice set; feature milestones/plans stay open until implemented. T-120 is explicitly blocked on actual external review artifacts.','','| Task | Title | Size | Depends on |','|---|---|---|---|']
for n,t,s,d,*_ in tasks:ledger.append(f"| T-{n:03} | {t} | {s} | {', '.join(f'T-{x:03}' for x in d) or '—'} |")
(OUT/'CONTENT-TASKS.md').write_text('\n'.join(ledger)+'\n')
print('Created',len(tasks),'task drafts')
