# Before / After — Sources & Evidence infinite Loading (Pixel)

## Before (RC 1.1.0 / commit era `f82a601`)

* Opening Sources & Evidence (especially Field Notebook) could remain on **“Loading sources and evidence…”** indefinitely.
* Failure stage: provider calls → UI loading clear (requests initiated; aggregation never settled when a WebView `fetch` hung past `AbortSignal`).
* Evidence of the hang: `docs/product-quality/evidence/pixel-archive/sources-loading-failure.png` (+ capture meta / logcat).
* Pixel expedition was **not** eligible for PASS while Loading remained indefinite.

## After (RC 1.1.1)

* Per-provider hard timeout via `withBoundedTimeout` (10s) wrapping federation tasks and live fetches.
* `getSpeciesEvidenceResult` returns records + failures + status (`live` / `partial` / `cached` / `fixture` / `empty` / `offline` / `timed_out` / `error`).
* Panel always leaves Loading (`finally` + abort race); Retry initiates a new bounded lookup.
* Successful provider cards are retained when others fail; fixture/cached are labeled honestly.
* Automated coverage includes an explicit **infinite-loading** regression test.
* Pixel OCR: **“Live sources loaded.”** on unlock, Notebook, and post-relaunch (`07-sources-evidence-loaded.png`, `13-evidence-after-relaunch.png`).

| Item | Before | After |
| --- | --- | --- |
| Version | 1.1.0 (2) | 1.1.1 (3) |
| APK SHA-256 | `e8170906…aa64aa` | `5059b1c0…3abcf2` |
| Sources Loading | Could hang forever | Bounded; always resolves |
| Pixel verdict | Blocked / not PASS | **PASS** |
