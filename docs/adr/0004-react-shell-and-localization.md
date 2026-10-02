# ADR 0004: React shell, hash routes and session localization

- **Status:** accepted
- **Date:** 2026-10-02
- **Task:** T-006 (W04, F06)

## Context

The bootstrap has a vanilla TypeScript shell, a web-only service worker, and separate web and
Android composition roots. Feature tasks need a shared accessible React shell, stable static-host
routes, and English/Polish interface resources without introducing profile storage.

## Decisions

- Use React and React DOM **19.3.0** with the automatic JSX transform, React state, and Testing
  Library component tests. Keep `src/main.ts` as the sole importer of `#target`; pass target
  services to the shell. React never selects adapters from the displayed platform label.
- Use Vite React plugin **5.2.0**, compatible with Vite **8.3.2** and the bootstrap's Babel 7
  dependencies. Plugin 6.1.1's optional Babel peers conflict with the existing Workbox tree;
  use the compatible stable release without overriding peer checks.
- Use native hash links (`#/today`, `#/study`, `#/library`, `#/progress`, `#/settings`) and the
  `hashchange` event rather than a router dependency for these five flat routes. Direct links and
  browser back work under `/` and `/woorden/`. Empty and unrecognized initial hashes become
  `#/today`. Mark the active link with `aria-current` and focus the screen heading on navigation.
- Use i18next **26.4.2** with react-i18next **17.0.15**. Bundled EN/PL resources initialize
  synchronously with no backend, language detector, remote requests, or HTML interpolation.
  The React binding updates every translated component when the language changes. This provides
  established fallback/resource handling and room for future pluralized messages without a
  custom localization engine. React escapes rendered text.
- Default to the first supported language in the browser preference list, or English. Settings
  writes only the interface language to the new `woorden-ng.interface-language` **sessionStorage**
  key, so routes and reloads in the same tab retain it. No localStorage, profiles, old storage
  keys, translation preference, or content data are involved. If session storage is unavailable,
  show a localized warning and retain the choice in memory until reload.
- Keep the update service worker in `src/targets/web.ts`. React subscribes to the target's update
  callback and activates it only when the user presses the banner button. The Android root keeps
  its existing no-op update registration and produces no service worker.

## Consequences

The five screens explicitly identify their learning features as forthcoming. Settings implements
only the interface-language control. Later tasks can add feature modules without changing the
composition root or interface language/translation-language distinction.

All new runtime packages are MIT licensed. React/React DOM provide the required UI framework;
i18next/react-i18next provide the localization framework. The lockfile pins the resolved versions.
The production JavaScript budget is checked against all generated `.js` files, including Workbox
and service-worker code, at less than 150,000 gzip bytes; Vite also reports individual chunk sizes.
Testing Library **16.3.3**, user-event **14.6.7**, React types **19.3.0**, and the Vite plugin are
development dependencies only.

Android shell and no-service-worker device tests remain in `e2e-android/smoke.spec.ts` and run in CI;
the managed implementation environment has no Android SDK.
