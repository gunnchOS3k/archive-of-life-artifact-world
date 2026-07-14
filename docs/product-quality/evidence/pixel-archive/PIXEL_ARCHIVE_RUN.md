# Archive Pixel expedition — RC 1.1.1 (2026-07-14)

Device: Pixel 6a `27211JEGR06194`  
APK: `build/android/archive-of-life-release.apk`  
SHA-256: `5059b1c0bf973cc317522ed6f30dee2dee261bfa1ffc4c12f288a916073abcf2`  
Package: `com.gunnchos.archiveoflife` **1.1.1** (versionCode **3**)  
Signer cert SHA-256: `d5bf4573218a8f0aba0690429776e290c608fa02563a838eb4530971f4ca9790`  
debuggable: false · no Godot `.so` · no `config 2.xml` · no private LAN URL  

Install: `adb install -r` Success (same signing lineage).  
Cold-start journey: `pm clear` then AcceptNav + touch (local test data intentionally reset).

Recording: `archive-pixel-acceptance.mp4`  
Logcat: `archive-logcat.txt`  
Build record: `RC_1.1.1_BUILD.txt`

## Sources & Evidence

* Pre-fix hang documented: `sources-loading-failure.png`
* Post-fix: unlock + Notebook show **Live sources loaded.** with conflicts retained
* After cold relaunch: `13-evidence-after-relaunch.png` still resolves (no infinite Loading)
* Provider cards include Live service badges / record IDs / classification (license rows in card `<dl>`, may require scroll on Pixel)

## Verdict

**PASS** — full expedition + persistence + bounded resilient Sources panel.
