# Archive of Life — Pixel 6a acceptance (RC 1.1.1)

**Verdict: PASS** (2026-07-14)

Device: Pixel 6a `27211JEGR06194` (bluejay)  
Package: `com.gunnchos.archiveoflife` **1.1.1** (versionCode **3**)  
APK: `build/android/archive-of-life-release.apk`  
SHA-256: `5059b1c0bf973cc317522ed6f30dee2dee261bfa1ffc4c12f288a916073abcf2`  
Signer: CN=Archive Internal RC — cert SHA-256 `d5bf4573218a8f0aba0690429776e290c608fa02563a838eb4530971f4ca9790`  
`debuggable`: false · Native/Godot `.so`: none · Capacitor `androidScheme`: https · no private LAN URL  

Evidence directory: `docs/product-quality/evidence/pixel-archive/`

| Gate | Result | Evidence |
| --- | --- | --- |
| App drawer / distinct icon | PASS | `01-app-drawer.png` |
| Cold splash | PASS | `02-splash.png` |
| Savanna expedition + touch move | PASS | `03-savanna.png` |
| Wildlife observation hold | PASS | `04-observation.png` |
| Artifact unlock | PASS | `05-artifact.png` |
| Field Notebook | PASS | `06-notebook.png` |
| Sources & Evidence resolves (not infinite Loading) | PASS | `07-sources-evidence-loaded.png` |
| Provider / license / live status | PASS | `08-source-status-and-license.png` |
| Lifeling traits equip | PASS | `09-lifeling.png` |
| Indiana Ancient Swamp | PASS | `10-ancient-swamp.png` |
| Historical / fossil evidence | PASS | `11-historical-evidence.png` |
| Notebook persistence | PASS | `12-persistence.png` |
| Evidence after cold relaunch | PASS | `13-evidence-after-relaunch.png` |
| Recording + logcat | PASS | `archive-pixel-acceptance.mp4`, `archive-logcat.txt` |

## Infinite-loading regression

Pre-fix failure documentation preserved:

* `sources-loading-failure.png` (+ meta/logcat under the same folder)
* Root cause: `SourcesEvidencePanel` awaited unbounded federation; Android WebView could leave `fetch` pending after abort, so `Promise.allSettled` never finished and the UI never left “Loading…”.
* Fix (RC 1.1.1): hard per-provider `withBoundedTimeout` (10s), resilient aggregation, explicit panel states (live / partial / cached / fixture / empty / offline / timed_out / error + Retry), abort on panel close, always clear loading in `finally`.

Post-fix OCR confirms **“Live sources loaded.”** on unlock modal, Notebook Sources, and after cold relaunch. Conflicts retained. Retry control present. No FATAL in `archive-logcat.txt`.

## Notes

* `pm clear` was used once before the cold-start journey after installing 1.1.1 (intentional local-data reset for a clean expedition).
* Hold Still UI still mentions “(Space)” on the label; hold works via touch / AcceptNav `hold`.
* AcceptNav helpers: `travel`, `move`, `interact`, `hold`, `fossil_done`, `panel`, `evidence`, `equip`, `save`, `js_b64`.
