# Codex backlog worker

One Codex task that works through the backlog: it claims the best ready task, implements it, opens
its pull request, and moves on to the next one, without waiting for CI or review. Several workers
can run at the same time; claims keep them off each other's tasks. Every task still gets its own
pull request (AGENTS.md hard rule 1).

## Prompt (the owner pastes this into a new Codex task, once per worker)

```text
Work as a backlog worker: follow docs/agents/codex-worker.md. Complete up to 4 tasks.
```

Run two to four workers in parallel. Change the number of tasks per worker as you like; fewer tasks
keep each session's context fresh.

## Instructions for the worker

Read AGENTS.md once at the start; it applies to every task below. Then repeat until you have
opened pull requests for the number of tasks you were asked for, or until there is no work:

1. **Start from the latest main.** `git fetch origin`, `git switch --detach origin/main`, then
   `npm ci` (other pull requests may have added dependencies since your last task).

Rules for a worker:

- Work only on the task you claimed, on its branch. Never push to another task's branch or to
  `main`.
- Each task starts from main as it is now. Code from your earlier pull requests is not on main
  until they merge; the claim script only offers tasks whose dependencies are merged.
- If a task can't be done (missing access, a contradiction in the spec), follow AGENTS.md rule 7:
  open the pull request as a draft that explains the blocker, then move on. Don't leave a claimed
  task without a pull request; a claim with no work is released automatically after three hours.
- Keep each task self-contained. Re-read files instead of relying on what you remember from an
  earlier task: other pull requests may have changed main in between.
- When you stop, end with a list: each task you claimed, its pull request URL, and anything the
  owner needs to know (blockers, draft pull requests, tasks you skipped).
