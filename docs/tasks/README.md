# Tasks

The backlog: one Markdown file per task, named `T-001-short-name.md`. A task is the unit of work for
one Codex pull request. `npm run check:tasks` validates every file and prints the tasks that are
ready to start; CI runs it on every PR.

## Format

Copy [`TEMPLATE.md`](TEMPLATE.md). The front matter is checked:

| Field        | Rule                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| `id`         | `T-` + three digits, matches the file name                                        |
| `title`      | Short, imperative                                                                 |
| `status`     | `todo` · `in-progress` · `blocked` · `done` (`done` needs every criterion ticked) |
| `size`       | `S` (under ~300 changed lines) or `M` (under ~800). Anything bigger gets split    |
| `depends_on` | List of task IDs that must be `done` first, e.g. `[]` or `[T-002, T-004]`         |
| `type`       | Optional. `task` (default) or `plan`: a task whose output is more task files      |
| `refs`       | Optional. Architecture IDs the task implements, e.g. `[W04, F13, T61]`            |

The body must have an `## Acceptance criteria` section with at least one `- [ ]` item.

## Traceability

When the architecture numbers its requirements, work packages or test cases, tasks name the IDs they
implement in `refs`, and `docs/tasks/required-refs.json` lists every ID that must be covered:

```json
{ "refs": ["F01", "W01", "T01"] }
```

`npm run check:tasks` reports the coverage, `-- --strict-refs` fails on any ID without a task, and
`-- --ledger` prints the whole backlog as a Markdown table (CI adds it to every run's summary).

A large architecture doesn't have to be broken down all at once. A `type: plan` task ("plan the
tasks for milestones M3–M4") lists every ID it will break down in its `refs`; while it is open those
IDs count as covered, and once it is `done` the tasks it created must cover them. So coverage can be
complete (and `--strict-refs` on) from day one, with detail added just in time.

## Good tasks

- **Vertical slices:** each task leaves the app working and shows something new (a screen, a flow,
  an offline behavior), rather than building one layer for later.
- **Testable criteria:** Given/When/Then, each naming the test that proves it (unit or e2e).
- **Independent where possible:** minimal `depends_on`, so 2–3 tasks can run in parallel.
- **Native work isolated:** Capacitor plugins and Android permissions get their own tasks.

## Woorden backlog

- M0 (baseline and integration spikes) is written out: T-001 to T-009.
- M1 to M11 start as plan tasks (T-010 to T-014) that hold the blueprint IDs until Codex breaks them
  down, milestone by milestone, using what the spikes found.
- Content work that can start early is written out as T-100 to T-122 (see [Content backlog](#content-backlog)).
- `required-refs.json` lists every in-scope F, W, T and I ID from the blueprint; `check:tasks` runs
  with `--strict-refs`, so a task can't silently drop one.

## Content backlog

T-100 to T-122 and T-168 to T-171 come from the content research of October 2026 (`docs/content/`, data in
`research/content-2026-10/`, decision in ADR 0005). They break down part of W18–W21 ahead of the M5
plan (T-012): source importers, the entry validator, draft import, reviewer packets, review
evidence, the pack compiler, the 60-entry starter pilot, coverage and audio.

| Task  | Title                                                              | Size | Depends on                 |
| ----- | ------------------------------------------------------------------ | ---- | -------------------------- |
| T-100 | Pin source downloads and expose an inspectable manifest            | S    | —                          |
| T-101 | Import NT2Lex exposure with explicit sense links                   | M    | T-100                      |
| T-102 | Import SUBTLEX surface and lemma frequency separately              | M    | T-100                      |
| T-103 | Import explicit ODWN article and morphology observations           | M    | T-100                      |
| T-104 | Import English-edition Dutch forms and IPA from Kaikki             | M    | T-100                      |
| T-105 | Join Dutch and Polish dictionary observations by sense             | M    | T-103, T-104               |
| T-106 | Add advisory OpenTaal spelling checks                              | S    | T-100                      |
| T-107 | Retrieve Tatoeba candidates with direct EN and PL links            | M    | T-100                      |
| T-108 | Rank a situation block with visible score components               | M    | T-101, T-102               |
| T-109 | Import all legacy audit decisions without losing provenance        | M    | T-103, T-104, T-106        |
| T-110 | Validate one sense entry with explicit spans and provenance        | M    | —                          |
| T-111 | Import external draft batches idempotently                         | M    | T-110                      |
| T-112 | Export a sample-check packet for a generation batch                | S    | T-111                      |
| T-113 | Import sample-check results and batch outcomes                     | M    | T-112                      |
| T-114 | Compile packs from task and locale eligibility                     | M    | T-113                      |
| T-115 | Load the first starter slice into a content inspection view        | M    | T-111                      |
| T-116 | Load the remaining representative starter cases                    | M    | T-115                      |
| T-117 | Report curriculum coverage and content changes honestly            | M    | T-108, T-109, T-114, T-116 |
| T-118 | Import and QA one downloadable audio slice                         | M    | T-100, T-114               |
| T-119 | Probe local Dutch TTS and expose explicit fallback states          | M    | T-118                      |
| T-120 | Admit the starter pilot after one sample check                     | S    | T-113, T-114, T-116, T-169 |
| T-121 | Add an optional Apertium conflict check                            | S    | T-103, T-104               |
| T-122 | Export source-constrained authoring briefs for external generation | S    | T-103, T-104, T-108, T-168 |
| T-168 | Enforce the exercise rules in the entry validator                  | M    | T-110                      |
| T-169 | Bring the starter pilot in line with the exercise rules            | M    | T-116, T-168               |
| T-170 | Report a problem with a word                                       | M    | T-128                      |
| T-171 | Turn content reports into a fix batch                              | S    | T-113, T-170               |

Two tracks start in parallel: sources (T-100, then T-101 to T-104, T-106 and T-107) and entries
(T-110, T-111, T-115). The research Python scripts are prototypes to port to the repository's
Node tooling (`tools/content/`), not dependencies.

**Source downloads (owner prerequisite for T-100 to T-107, T-118 and T-121).** The pinned files are
hosted outside the Codex environment's default allowlist. Before starting these tasks, add to the
environment's internet access: `cental.uclouvain.be` (NT2Lex), `osf.io` and the file host its
downloads redirect to (SUBTLEX-NL), `raw.githubusercontent.com` (ODWN, OpenTaal, Apertium),
`kaikki.org` (Wiktionary extracts) and `downloads.tatoeba.org` (Tatoeba); for T-118 also
`upload.wikimedia.org`. Downloads go to the ignored `.cache/content-sources/` and are never
committed; tests use small committed excerpts and never touch the network. The largest files are
about 260 MB (Kaikki) and 150 MB (Tatoeba links).

**Language quality (ADR 0005).** Facts come from sources and are checked by machine. Exercises
follow rules R1–R5, enforced by the validator (T-168). Each generation batch gets one sample check
by a different vendor from the author: the drafts are written with OpenAI models, so Claude checks
them. The check runs outside the app and outside Codex tasks
(`research/content-2026-10/review/SAMPLE-CHECK.md`); no task may fabricate or simulate a response.
Learners' problem reports (T-170, T-171) catch what samples miss.

## Deferred

Capabilities from `docs/architecture/` that are deliberately not in the backlog, with a reason:

- **W08, T31, T33, T34, section 17.3, scenario 26.5:** migration of the old app's progress,
  settings and custom words is out of scope (ADR 0003).
- **E01, W41–W43, T51–T55, T59:** account-based sync and its services are a future extension
  (blueprint section 20.1).
- **E02, W44:** the external voice tutor is a separate future design; only W51's provider-neutral
  schemas are in scope.
- **E03, W45, T58:** Web Push is deferred; native local reminders (W48) are in scope.
- **E04, W46, T56:** retired by the blueprint.
