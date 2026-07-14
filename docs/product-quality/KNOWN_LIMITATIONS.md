# Known Limitations — Archive of Life

**Updated:** 2026-07-14 (RC **1.1.1**)

## Pixel / mobile

1. **AcceptNav vs finger taps:** Title “New Expedition” coordinate taps remain unreliable under ADB; Pixel acceptance uses internal RC `AcceptNavReceiver` → `window.__aolAccept` (same game APIs as UI). Native-only finger taps for every step are not claimed.
2. **Observation Hold Still label:** Minigame button still shows “(Space)” on Pixel; pointer hold and AcceptNav `hold` work. Touch-first copy polish remains open.
3. **Sources layout on small screens:** Conflict summary can dominate the unlocked modal / Notebook viewport; full record-id / license definition lists may require vertical scrolling inside the panel (no infinite Loading; Retry available).
4. **Drawer duplicates historically:** Device may show extra launcher aliases from older test installs; canonical package remains `com.gunnchos.archiveoflife` only. Duplicate cleanup deferred until all four final APKs exist.
5. **WebView DevTools on non-debug RC:** `webview_devtools_remote` is not exposed for the signed non-debuggable package; AcceptNav / `js_b64` is the supported instrumentation path.

## Resolved (RC 1.1.1)

- **Notebook / unlock Sources infinite Loading:** Fixed with per-provider bounded timeouts (10s), resilient aggregation, explicit status UI, and always-cleared loading state. Regression tests in `src/ui/evidence/SourcesEvidencePanel.test.ts` and `FederationService.evidence.test.ts`. Pre-fix screenshot retained as `evidence/pixel-archive/sources-loading-failure.png`.

## Data / federation

- NOAA / USGS / Smithsonian / IUCN adapters may be fixture or blocked — not counted as live domains.
- Provider name conflicts are intentional — both values retained.
- Partial provider failure is honest: successful records kept; failed providers listed; fixture/cached never labeled live.

## Build

- APKs, keystores, and `passwords.env` are not committed.
- Capacitor APK contains no Godot native libraries (expected).
