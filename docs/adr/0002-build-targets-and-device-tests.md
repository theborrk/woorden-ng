# ADR 0002: Build targets, hosting base and device tests

- **Status:** accepted
- **Date:** 2026-10-02

## Context

The same TypeScript app ships as a PWA and inside a Capacitor Android app. The two differ in what
they must never share: the PWA needs a service worker and may be hosted under a sub-path; the
Android app must never register a service worker and uses native plugins (storage, files,
notifications). Implementing agents cannot run an Android SDK, so anything native is verified in CI.

## Decisions

1. **Two build targets from one Vite config.** `vite build --mode web` writes `dist/web` (with the
   service worker) and `vite build --mode android` writes `dist/android` (without it); Capacitor's
   `webDir` is `dist/android`. The npm scripts are `build:web` and `build:android`.
2. **Composition root per target.** The `#target` import resolves to `src/targets/web.ts` or
   `src/targets/android.ts` at build time. Platform implementations are wired there, so the web
   bundle contains no native adapter and the Android bundle no service worker. The platform is
   never inferred from the user agent to choose storage or other durable behavior.
3. **Configurable base path.** `APP_BASE` sets the PWA's base URL, manifest scope and start URL;
   the e2e suite uses relative URLs and passes under `/` and a sub-path.
4. **Device tests.** Playwright attaches to the debug APK's WebView over adb on an x86_64 emulator
   in GitHub Actions (KVM). Tests live in `e2e-android/`; `scripts/device-tests.sh` installs the APK
   and runs the `test:repositories:android` and `test:e2e:android` scripts when they exist. Debug
   builds allow WebView debugging; release builds do not, so releases are tested through a debug
   build of the same tag.
5. **CI policy file.** `.github/ci-policy.json` decides whether the APK builds on every PR and when
   device tests run (`affected`, `always`, `off`), and pins the emulator API level.
6. **Scripts as the contract.** CI runs well-known npm script names when they exist
   (`content:validate`, `test:repositories:web`, `test:backup-interop`, `content:coverage`, the
   device scripts), so a task that adds one turns its CI gate on without editing workflows.
7. **Traceability.** Tasks may list the architecture IDs they implement (`refs`), and
   `docs/tasks/required-refs.json` makes coverage checkable.

## Consequences

- A native capability needs an interface, a web implementation (or graceful degradation) and an
  Android implementation, plus a device test for the native side.
- Device tests run only in CI; a failing one is fixed from the log and screenshots in the PR's CI
  summary.
- Emulator runs add roughly 8–12 minutes to PRs that touch native or storage code.
- Physical-device checks (real phones, TalkBack, signed upgrades from Google Play) stay manual.
