# Woorden NG

An offline Dutch vocabulary trainer for the web (installable PWA) and Android, redeveloped from
[iamsergeyka/woorden](https://github.com/iamsergeyka/woorden) following the
[implementation blueprint](docs/architecture/blueprint.md). It is built by an AI agent workflow:
**Codex implements, Claude reviews, the owner merges**, all operable from a phone.

The original single-file app is kept unchanged in [`legacy/`](legacy/) as a reference; its 1,946
words carry over as content. Progress from the original app is not migrated
([ADR 0003](docs/adr/0003-woorden-scope-and-adaptation.md)).

| Read this                                          | For                                            |
| -------------------------------------------------- | ---------------------------------------------- |
| [docs/architecture/](docs/architecture/)           | The blueprint and how it applies here          |
| [docs/tasks/](docs/tasks/)                         | The backlog and the requirement ledger         |
| [docs/WORKFLOW.md](docs/WORKFLOW.md)               | How a task becomes a merged PR and a release   |
| [AGENTS.md](AGENTS.md)                             | Rules for the coding agent                     |
| [docs/REVIEW.md](docs/REVIEW.md)                   | The review standard                            |
| [docs/SETUP-REFERENCE.md](docs/SETUP-REFERENCE.md) | Secrets, variables, CI policy, troubleshooting |
| [docs/agents/](docs/agents/)                       | Prompts for the Claude routine and for Codex   |

## Stack

TypeScript · Vite · vite-plugin-pwa (Workbox) · Capacitor 8 (Android) · Vitest · Playwright ·
GitHub Actions · Cloudflare Pages. The blueprint adds React, Dexie, native SQLite, ts-fsrs and
Temporal as the milestones land.

## Commands

```sh
npm ci                    # install
npm run dev               # dev server
npm run verify            # lint, format check, typecheck, unit tests, backlog check
npm run test:e2e:web      # Playwright on the production web build (mobile Chromium)
npm run build:web         # PWA -> dist/web (APP_BASE=/woorden/ to host under a sub-path)
npm run build:android     # web bundle for the Android app -> dist/android (no service worker)
npm run android:sync      # build:android, then copy it into android/
npm run test:e2e:android  # device tests against the debug APK on an emulator (CI runs these)
npm run check:tasks -- --ledger   # the requirement ledger as a table
```

Android builds and emulator tests run in CI (`Android build`, `Android device tests`); you don't
need Android Studio. What runs on which pull request is set in `.github/ci-policy.json`.

## Where things end up

- **PR previews:** `https://pr-<number>.<project>.pages.dev` (link in each PR's CI comment)
- **Production PWA:** `https://<project>.pages.dev` after every merge to `main`
- **Dev APK:** the `dev-latest` pre-release (`app-dev.apk`, app ID `nl.theborrk.woorden.dev`)
- **Release APK and AAB:** attached to each published `vX.Y.Z` GitHub Release (app ID
  `nl.theborrk.woorden`); Google Play internal testing per the blueprint, section 23.4

## License and credits

MIT, see [LICENSE](LICENSE). The original Woorden app and its word list are © 2026 iamsergeyka,
used under the MIT license; changes in this repository are released under the same license.
