#!/usr/bin/env bash
# Runs the device tests against a connected Android emulator or phone (adb):
# installs the debug APK, then runs whichever device test scripts package.json defines.
#
#   ANDROID_APK_PATH=path/to/app-debug.apk bash scripts/device-tests.sh
#
# CI runs this inside the emulator step of .github/workflows/android-device-tests.yml.
# The scripts it runs get: the APK installed, ANDROID_PACKAGE (its application id, when set by the
# caller) and ANDROID_SERIAL (the device, when set). Output is also written to $DEVICE_TESTS_LOG.
set -euo pipefail

cd "$(dirname "$0")/.."
log="${DEVICE_TESTS_LOG:-device-tests.log}"
exec > >(tee -a "$log") 2>&1

: "${ANDROID_APK_PATH:?Set ANDROID_APK_PATH to the debug APK to test}"
scripts=(test:repositories:android test:e2e:android)

has_script() {
  node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$1"
}

adb wait-for-device
echo "Device: $(adb shell getprop ro.product.model | tr -d '\r') (Android $(adb shell getprop ro.build.version.release | tr -d '\r'))"

# The package manager can lag behind boot completion on a cold emulator, so retry the install.
for attempt in 1 2 3; do
  if adb install -r "$ANDROID_APK_PATH"; then break; fi
  if (( attempt == 3 )); then
    echo "::error::Could not install $ANDROID_APK_PATH on the device"
    exit 1
  fi
  echo "Install failed (attempt $attempt), retrying in 10 s"
  sleep 10
done

status=0
ran=0
for script in "${scripts[@]}"; do
  if has_script "$script"; then
    ran=$((ran + 1))
    echo "::group::npm run $script"
    if ! npm run "$script"; then
      status=1
      echo "::error::npm run $script failed"
    fi
    echo "::endgroup::"
  fi
done

if (( ran == 0 )); then
  echo "No device test scripts in package.json (${scripts[*]}): nothing to run."
fi
exit "$status"
