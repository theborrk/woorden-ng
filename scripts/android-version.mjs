#!/usr/bin/env node
// Computes Android versionCode/versionName.
//
//   node scripts/android-version.mjs debug [label]     -> time-based code, always increasing
//   node scripts/android-version.mjs release v1.2.3    -> 1002003 / 1.2.3
//
// Prints `versionCode=...` and `versionName=...` lines, ready to append to $GITHUB_OUTPUT.
// Debug and release builds use different application IDs (debug has a `.dev` suffix),
// so the two numbering schemes never collide on a device.

import { fileURLToPath } from 'node:url';

const DEBUG_EPOCH_MS = Date.UTC(2024, 0, 1);

/** Minutes since 2024-01-01: increases with every build, fits Android's int limit until year ~6000. */
export function debugVersion(now = new Date(), label = 'local') {
  const versionCode = Math.floor((now.getTime() - DEBUG_EPOCH_MS) / 60_000);
  if (versionCode < 1) throw new Error('Clock is before 2024-01-01');
  return { versionCode, versionName: label };
}

/** Semantic version tag -> major*1_000_000 + minor*1_000 + patch. Pre-release tags are rejected. */
export function releaseVersion(tag) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(tag).trim());
  if (!match) {
    throw new Error(
      `Release tag "${tag}" must look like v1.2.3 (no pre-release suffix; use v0.x.y for betas).`,
    );
  }
  const [major, minor, patch] = match.slice(1).map(Number);
  if (major > 2099 || minor > 999 || patch > 999) {
    throw new Error(`Release tag "${tag}" is out of range (major<=2099, minor<=999, patch<=999).`);
  }
  const versionCode = major * 1_000_000 + minor * 1_000 + patch;
  if (versionCode < 1) throw new Error('v0.0.0 is not a valid release');
  return { versionCode, versionName: `${major}.${minor}.${patch}` };
}

function main(argv) {
  const [kind, arg] = argv;
  const result =
    kind === 'release'
      ? releaseVersion(arg)
      : kind === 'debug'
        ? debugVersion(new Date(), arg || 'local')
        : null;
  if (!result) throw new Error('Usage: android-version.mjs debug [label] | release vX.Y.Z');
  process.stdout.write(`versionCode=${result.versionCode}\nversionName=${result.versionName}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
