# Setup reference

Everything the workflows expect, in one place. The step-by-step walkthrough lives outside the repo;
this page is the reference to come back to.

## Repository secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret                                                                                              | Needed for                        | How to get it                                                                                 |
| --------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `SETUP_TOKEN`                                                                                       | Setup repository workflow         | Temporary fine-grained token, see below. **Delete it after setup.**                           |
| `KEYSTORE_BACKUP_PASSPHRASE`                                                                        | Setup repository (keystore)       | Make one up (12+ chars), save it in your password manager first                               |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` | Release workflow                  | Created by Setup repository. Don't edit by hand                                               |
| `CLOUDFLARE_API_TOKEN`                                                                              | PR previews, production PWA       | Cloudflare → My Profile → API Tokens → Create custom token: Account / Cloudflare Pages / Edit |
| `CLOUDFLARE_ACCOUNT_ID`                                                                             | PR previews, production PWA       | Cloudflare dashboard → Workers & Pages → Account ID (right-hand side)                         |
| `CLAUDE_CODE_OAUTH_TOKEN`                                                                           | Only for `CLAUDE_REVIEWER=action` | `claude setup-token` in any terminal (for example a GitHub Codespace)                         |

## Repository variables (same page → Variables)

| Variable              | Values                                          | Effect                                                               |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `CF_PAGES_PROJECT`    | e.g. `my-app`                                   | Turns on PR previews and production deploys to `<project>.pages.dev` |
| `CLAUDE_REVIEWER`     | `routine` (default when unset), `action`, `off` | Who sets the `claude-review` status                                  |
| `CLAUDE_REVIEW_MODEL` | `sonnet` (default), `opus`                      | Model for `action` mode. The `deep-review` label always uses `opus`  |
| `DEV_APK_ON_MAIN`     | `false` to disable                              | Builds the dev APK after every merge to main                         |

## CI policy (`.github/ci-policy.json`)

Repository-level switches for what runs on pull requests. Edit the file in a PR (it's a protected
file, so Codex won't change it unasked).

| Key                | Values                                | Effect                                                                                                                                              |
| ------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `androidOnEveryPr` | `false` (default), `true`             | `true` builds the debug APK on every PR (an Android compile gate). `false` builds it only when native files change                                  |
| `deviceTests`      | `affected` (default), `always`, `off` | When the emulator job runs: on PRs that touch native or storage code (the `native` and `persistence` path lists in `ci.yml`), on every PR, or never |
| `emulatorApiLevel` | Android API level, e.g. `35`          | The emulator's Android version for device tests                                                                                                     |

Device tests only run once `package.json` defines `test:e2e:android` or `test:repositories:android`.
Every published release also runs them, on a debug build of the release tag, before the signed files
are attached. The emulator job takes about 8–12 minutes; on a private repository that counts against
the Actions minutes of your plan.

Other knobs: `package.json` → `config.playwrightBrowsers` lists the browsers CI (and
`scripts/agent-setup.sh`) installs for the web e2e tests, e.g. `"chromium firefox webkit"` once the
Playwright config has projects for them. `APP_BASE=/sub-path/` builds and tests the PWA under a
sub-path; production deploys use `/`.

## The temporary `SETUP_TOKEN`

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate:

- **Expiration:** 7 days. **Repository access:** only this repository.
- **Permissions (Repository):** Administration: Read and write · Contents: Read and write ·
  Secrets: Read and write · Pull requests: Read and write · Issues: Read and write.

Save it as the `SETUP_TOKEN` secret, run **Actions → Setup repository**, then delete both the token
and the secret.

## What "Setup repository" does

| Input                | Does                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `labels`             | Creates the labels from `.github/labels.json`                                                                          |
| `repo-settings`      | Squash merge only, PR title as commit title, delete branches after merge, allow auto-merge                             |
| `ruleset`            | Applies `.github/rulesets/main.json`: PRs required, `ci-ok` + `claude-review` required, admins can bypass through a PR |
| `keystore`           | Generates a 4096-bit release key, stores it as secrets, uploads an encrypted backup artifact (3 days)                  |
| `app-id`, `app-name` | Opens a PR that renames the app everywhere (`npm run rename-app`)                                                      |

**Rulesets on private repositories need GitHub Pro** (or Team). On GitHub Free, either make the
repository public (also gives unlimited Actions minutes) or keep it private and treat the two checks
as advisory: you are the only one who presses Merge.

## Codex cloud environment (chatgpt.com → Codex → Settings → Environments)

- Repository: this one. Node: 22.
- Install script: `bash scripts/agent-setup.sh`
- Internet access: on, **Package managers** preset, plus these additional domains for the Playwright
  browser download: `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`.
- Code review: leave **automatic reviews off** (Claude reviews here).

## Claude

- Install the Claude GitHub App on this repository: https://github.com/apps/claude
- Create the review routine: [`docs/agents/claude-review-routine.md`](agents/claude-review-routine.md).
- Optional cloud environment for ad-hoc Claude sessions: setup script `bash scripts/agent-setup.sh`.

## Restoring the signing key from the backup

You only need this if the repository secrets are lost. On any machine with OpenSSL (Termux on
Android works: `pkg install openssl`):

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in keystore-backup.tar.gz.enc | tar xz
# enter KEYSTORE_BACKUP_PASSPHRASE; you get release.jks and credentials.txt
base64 -w0 release.jks   # paste as ANDROID_KEYSTORE_BASE64; passwords are in credentials.txt
```

Keep the encrypted file in your cloud drive and the passphrase in your password manager, never
together. If you publish on Google Play with Play App Signing, this key is only the upload key and
Google can reset it; for sideloaded or Obtainium installs it is the app's identity.

## Troubleshooting

| Symptom                                             | Likely cause and fix                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `claude-review` stays "Waiting for Claude review"   | Routine didn't fire: check claude.ai/code/routines → runs. Is the Claude GitHub App installed? Use **Run now**   |
| Claude posted a review but the status didn't change | Open **Actions → Review gate**: stale SHA (Codex pushed meanwhile) or the comment's author isn't you             |
| No preview link in the CI comment                   | `CF_PAGES_PROJECT` unset, or Cloudflare secrets missing (the Preview deploy job says which)                      |
| "App not installed" when installing an APK          | A build signed with a different key is installed: uninstall the old one once (dev and release apps are separate) |
| Android job fails, web is fine                      | Read the CI comment's log tail; often a Capacitor plugin without `npm run android:sync` committed                |
| Codex can't run e2e tests                           | Its environment lacks Chromium: check the install script and the Playwright domains above                        |
| Device tests fail with "is not installed"           | The APK didn't install on the emulator: the log in the CI comment shows the `adb install` error                  |
| Device tests time out waiting for the WebView       | The app crashed or didn't start: the device screenshots artifact shows the screen; check `adb logcat` in the log |
| Ruleset step warns about the plan                   | Private repo on GitHub Free: see "Rulesets" above                                                                |
