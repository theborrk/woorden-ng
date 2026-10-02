#!/usr/bin/env bash
# Environment setup for cloud coding agents (Codex cloud "Install script", Claude Code cloud
# "Setup script"). Installs dependencies and a headless Chromium for the Playwright e2e tests.
# The Android SDK is intentionally NOT installed: CI builds the APK (see AGENTS.md).
set -euo pipefail

cd "$(dirname "$0")/.."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if (( node_major < 22 )); then
  echo "Node 22+ is required (found $(node --version)). Pin Node 22 in the environment settings." >&2
  exit 1
fi

npm ci

# Browsers for `npm run test:e2e` (package.json "config.playwrightBrowsers", the same list CI
# installs). Skip if the sandbox already provides Chromium via PW_CHROMIUM_PATH.
if [[ -z "${PW_CHROMIUM_PATH:-}" ]]; then
  read -r -a browsers <<<"$(node -p 'require("./package.json").config?.playwrightBrowsers ?? "chromium"')"
  if [[ "$(id -u)" == "0" ]]; then
    npx playwright install --with-deps "${browsers[@]}"
  else
    npx playwright install "${browsers[@]}"
  fi
fi

echo "Agent environment ready: npm run verify, npm run test:e2e"
