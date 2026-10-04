# Versions and release targets (T-009 / W03)

Baseline: main at `e306ccaab6e079eb90c9e0d2d979d9ade077738f`, 3 October 2026.
These are resolved versions, not claims about the latest releases. Later tasks must record their
own additions; the consistency test checks only the packages listed here.

## JavaScript dependencies

`package.json` declares the requirement; `package-lock.json` fixes the resolved version and integrity.
Ranges below are existing declarations, not exact manifest pins.

| Package | Manifest requirement | Locked version |
| --- | --- | --- |
| typescript | ~6.0.3 | 6.0.3 |
| vite | ^8.3.2 | 8.3.2 |
| react | ^19.3.0 | 19.3.0 |
| react-dom | ^19.3.0 | 19.3.0 |
| @capacitor/core | ^8.5.2 | 8.5.2 |
| @capacitor/android | ^8.5.2 | 8.5.2 |
| @capacitor/cli | ^8.5.2 | 8.5.2 |
| @capacitor-community/sqlite | 8.1.1 | 8.1.1 |
| ts-fsrs | 5.4.2 | 5.4.2 |
| dexie | 4.2.1 | 4.2.1 |
| @js-temporal/polyfill | 0.5.1 | 0.5.1 |

Temporal uses native `globalThis.Temporal` when available, otherwise the pinned polyfill, without
replacing the global. See the [time spike](spikes/time.md), [FSRS spike](spikes/fsrs.md),
[web storage spike](spikes/storage-web.md) and [native storage spike](spikes/storage-android.md)
for API, replay, storage and compatibility evidence.

## Toolchain

| Setting | Configured value | Source |
| --- | --- | --- |
| Node major | 24 | .nvmrc |
| Node engine | >=22.12 | package.json |
| JDK major | 21 | .github/workflows/android-build.yml (Temurin) |
| Android Gradle Plugin | 8.13.0 | android/build.gradle |
| Gradle wrapper | 8.14.3 | android/gradle/wrapper/gradle-wrapper.properties |
| compileSdkVersion | 36 | android/variables.gradle |
| targetSdkVersion | 36 | android/variables.gradle |
| minSdkVersion | 24 | android/variables.gradle |

Observed implementation environment: Node 24.21.0, npm 11.19.0. Node and JDK are configured by
major, not patch; npm is not independently pinned in the repository. These observations are not
CI version guarantees. Record exact toolchain versions with each release; this task changes no pins.

## Lockfile and update policy

Commit `package-lock.json` with dependency changes; use `npm ci` locally and in CI. Do not refresh
the lockfile or regenerate scheduler fixtures as part of ordinary verification. Keep the Android
project and Gradle wrapper committed. Update these notes when a listed dependency or toolchain changes.

Dependabot checks npm weekly (at most five open PRs), groups minor/patch development tooling and
runtime updates separately, and checks GitHub Actions monthly. Capacitor majors require a
coordinated task; Node type majors move with `.nvmrc`; TypeScript majors wait for typescript-eslint
support. These are the existing [.github/dependabot.yml](../../.github/dependabot.yml) rules.

Every update requires the normal verify, both-build and web e2e gates. Capacitor, plugins, SQLite,
JDK, AGP, Gradle and SDK updates require native compatibility tests (sync and commit Android
changes for plugin updates), including ABI/page-size checks before release. Scheduler-affecting
updates, especially ts-fsrs or time handling, require deterministic scheduler replay checks against
reviewed fixtures; inspect changed outcomes before explicitly regenerating fixtures. Native
repository/bridge tests run for persistence/plugin changes and on every release. See
[blueprint section 23.2](blueprint.md#232-ci-and-release-gates) and
[ADR 0003 section 5](../adr/0003-woorden-scope-and-adaptation.md#5-ci-gates-section-232).

## Release targets and evidence gaps

- Web release target: Chromium, Firefox and WebKit contract/UI checks, plus actual Android Chrome
  installed-PWA offline/update checks. Current web CI runs Chromium only (`config.playwrightBrowsers`);
  Firefox/WebKit and physical PWA evidence remain W36 release work.
- Native release target: Android 7.0 / API 24 and newer, compiled and targeted at API 36
  (Android 16), with a compatible updated WebView. CI currently runs only the API 36 emulator;
  Android compile runs on every PR, device tests on affected PRs and every release.
- Minimum-SDK verification is an unresolved release gate owned by W36/W50: old API 24 CI images
  have an obsolete WebView that cannot update. Before claiming minimum-SDK support, verify API 24
  with an updated WebView on a physical device or a Play-enabled image, or raise `minSdk` in a
  separate task and test the new minimum. Record exact OS, WebView and device versions and results.
  API 36 success does not prove API 24 support.
- Native release evidence also requires a real midrange phone, the owner's available phone,
  production-like signed upgrades and cross-target PWA → Android → PWA backup equivalence.
  Desktop tests and plugin mocks do not satisfy native gates. Optional iPhone PWA support requires
  physical Safari/home-screen verification; no native iOS build is promised.

This records the required matrix, not completed release certification. See
[blueprint section 18.7](blueprint.md#187-platform-acceptance-matrix) and ADR 0003 for the CI limitation.
