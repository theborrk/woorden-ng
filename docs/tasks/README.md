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
- `required-refs.json` lists every in-scope F, W, T and I ID from the blueprint; `check:tasks` runs
  with `--strict-refs`, so a task can't silently drop one.

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
