# Pixel 6a acceptance — Archive of Life: Artifact World

**Status:** `HUMAN_QA_PENDING` / `PIXEL_6A_READY = BLOCKED`  
**Do not mark PASS.** Cursor cannot install, launch, or capture device evidence while the phone is unauthorized.

## Why blocked (this supervisor-ready pass)

`adb devices` on 2026-08-18 showed:

```text
27211JEGR06194	unauthorized
```

An unauthorized session is not a device. Historical notes under `docs/product-quality/` (if present) are **not** a PASS for this branch.

## Prerequisite (Edmund)

Unlock the Pixel 6a, accept the USB debugging prompt, then confirm:

```bash
adb devices -l
# expected: 27211JEGR06194    device
adb shell getprop ro.product.model
# expected: Pixel 6a
```

If the line still says `unauthorized`, stop. Do not retry install.

## Exact commands (after authorized)

Package: `com.gunnchos.archiveoflife`  
Title: **Archive of Life: Artifact World**

```bash
# 1. Confirm device
adb devices -l
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release

# 2. Install
adb install -r build/android/archive-of-life-debug.apk

# 3. Launch
adb shell monkey -p com.gunnchos.archiveoflife -c android.intent.category.LAUNCHER 1

# 4. Capture logcat during smoke
adb logcat -c
# play: cold launch → main flow → pause/resume → back/home
adb logcat -d > artifacts/pixel6a/logcat.txt

# 5. Package identity
adb shell dumpsys package com.gunnchos.archiveoflife | head -n 40
adb shell pm path com.gunnchos.archiveoflife
```

Capacitor Android wrapper. Build after `npm run build`:

```bash
npx cap sync android
# then assemble debug APK from android/ via Android Studio or Gradle
```

Playable **offline** using bundled `public/data/` sample/game-authored packs. Live source federation is optional and must stay labeled.


## Expected evidence (do not fabricate)

Store under `artifacts/pixel6a/` privately if needed. Public git: no invented screenshots, no PII.

## Status transition

Authorized device + passing smoke → Android line may move toward `DEVICE_MEASURED` **for install/launch only**. Not RF, not playtest quality, not dissertation proof.
