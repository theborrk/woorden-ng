---
id: T-008
title: Carry the original husky icon into the PWA and the Android launcher
status: done
size: S
depends_on: []
type: task
refs: [W04]
---

## Goal

The installed PWA and the Android app show the original app's husky icon on its Delft blue
background, keeping the original visual identity (section 6).

## Context

- Blueprint: section 6 ("keep the original visual identity where it remains accessible")
- Source: `makeIcon()` in `legacy/index.html` draws the icon on a 180×180 canvas at runtime
- Current icons: `public/` (bootstrap placeholders) and the default Capacitor launcher icons in
  `android/app/src/main/res/`

## Scope

In:

- A small dev-only script that renders the original drawing at any size (for example the canvas
  code run in Playwright's Chromium) and writes the PWA icons: `favicon.svg` (or a PNG favicon with
  `index.html` and `vite.config.ts` updated), `apple-touch-icon-180x180.png`, `pwa-192x192.png`,
  `pwa-512x512.png` and a maskable `maskable-icon-512x512.png` with the face inside the safe zone.
- Android launcher icons (legacy and adaptive: foreground on the Delft blue background) for all
  densities, generated from the same drawing.

Out (do not do in this task):

- Any other visual redesign; splash screens.

## Acceptance criteria

- [x] AC1: The manifest lists the 192 and 512 icons and a maskable icon whose face fits the inner
      80% circle (existing manifest e2e test still passes; screenshots of the icons attached to the
      PR)
- [x] AC2: Given the debug APK on the emulator, then the launcher shows the husky icon (device test
      screenshot with `snapDevice` of the home screen or app list)
- [x] AC3: Running the script twice produces identical files (unit or script check)

## Notes for the implementer

Keep the drawing code's shapes and colors; scale the canvas instead of upscaling a 180 px bitmap.

## Notes for the reviewer

Compare the result with `legacy/screenshots/hero.png` and the original drawing code.
