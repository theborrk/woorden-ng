#!/usr/bin/env bash
# Environment setup for cloud coding agents (Codex cloud "Install script", Claude Code cloud
# "Setup script"). Installs dependencies and a headless Chromium for the Playwright e2e tests.
# The Android SDK is intentionally NOT installed: CI builds the APK (see AGENTS.md).
set -euo pipefail

cd "$(dirname "$0")/.."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if (( node_major < 22 )); then
  echo "Node 22 or newer is required; the project uses Node 24 (.nvmrc). Found $(node --version)." >&2
  exit 1
fi

npm ci

# Browsers for the e2e tests: the builds that match this Playwright version, as in CI
# (package.json "config.playwrightBrowsers"). A pre-installed Chromium (PW_CHROMIUM_PATH) is only a
# fallback when the download fails: other versions can behave differently in tests.
read -r -a browsers <<<"$(node -p 'require("./package.json").config?.playwrightBrowsers ?? "chromium"')"
install=(npx playwright install)
if [[ "$(id -u)" == "0" ]]; then install+=(--with-deps); fi
if ! "${install[@]}" "${browsers[@]}"; then
  if [[ -n "${PW_CHROMIUM_PATH:-}" ]]; then
    echo "WARNING: could not download Playwright's browsers; e2e tests will use $PW_CHROMIUM_PATH." >&2
  else
    echo "Could not download Playwright's browsers: allow cdn.playwright.dev and playwright.download.prss.microsoft.com." >&2
    exit 1
  fi
fi

echo "Agent environment ready: npm run verify, npm run test:e2e"
