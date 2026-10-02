# Prompts for Codex

Paste these into Codex (ChatGPT app → Codex → pick this repository's cloud environment). Replace the
`T-xxx` and `#N` parts. AGENTS.md carries the rules, so prompts stay short.

## Start a task

```text
Implement docs/tasks/T-xxx-<name>.md following AGENTS.md.
Run npm run verify and npm run test:e2e:web until both pass, then open a pull request titled
"T-xxx: <summary>" using .github/pull_request_template.md (first line "Task: T-xxx").
```

## Address Claude's review

Open the PR, copy the **Fix brief for Codex** block from Claude's summary comment, and send it in
the **same Codex task** that created the PR, so Codex updates that PR instead of opening a new one:

```text
<paste the fix brief here>
```

## Fix a CI failure

Copy the block under "Failed" in the PR's CI summary comment and send it in the same Codex task.

## Resolve a merge conflict

```text
PR #N conflicts with main. Merge or rebase main into the branch, keep the intent of both sides,
re-run npm run verify and npm run test:e2e:web, and push to the same branch.
```

## Update a task spec (no code)

```text
Update docs/tasks/T-xxx-<name>.md: <what to change>. Keep the format valid (npm run check:tasks).
Open a pull request titled "T-xxx: update spec".
```

## When `@codex` mentions work

If Codex's GitHub integration is set up (Codex settings → Code review / environments), you can also
comment on a PR: `@codex address the blocking findings in Claude's review above`. Mention-triggered
tasks have been less reliable than tasks started in the Codex app, so the app is the default here.
