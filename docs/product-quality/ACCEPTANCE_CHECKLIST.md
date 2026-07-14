# Acceptance Checklist — Archive of Life

**Updated:** 2026-07-14 (RC **1.1.1**)

| Gate | Status | Evidence |
|------|--------|----------|
| Multi-source federation | **PASS** | `src/services/providers/` — bounded `getSpeciesEvidenceResult` + `Promise.allSettled` |
| Live domain minimum (5) | **PASS** | Occurrence: GBIF+iNat · Taxonomy: COL+WoRMS · Paleo: PBDB · Env: NASA EONET · Marine: OBIS+WoRMS |
| Sources & Evidence in play | **PASS** | Unlock + Notebook + ArchiveDex; live/cached/fixture labels; conflicts retained; **loading always resolves** |
| Controllable expedition | **PASS** | Drag move, water/rock collision, camera follow on swamp, Lifeling follow |
| Locations Savanna / Forest / Wetland / Indiana Swamp | **PASS** | Browser + Pixel Savanna & Indiana Swamp |
| Deep-time activity + reconstruction labeling | **PASS** | Trilobite fossil on Pixel; reconstruction/fixture labeling preserved |
| Persistence after reload | **PASS** | Pixel cold continue: artifacts, notebook entries, Lifeling traits, Sources re-resolve |
| Browser automation | **PASS** | cursor-ide-browser MCP |
| Release APK + Pixel expedition | **PASS** | SHA-256 `5059b1c0bf973cc317522ed6f30dee2dee261bfa1ffc4c12f288a916073abcf2`; see `PIXEL_6A_TEST.md` + `evidence/pixel-archive/` |
| Unit / regression tests (infinite Loading) | **PASS** | `npm test` — 28 tests including named infinite-loading regression |
| PR | **No** | Awaiting independent verifier + Edmund approval |

## Pixel evidence (2026-07-14 RC 1.1.1)

Directory: `docs/product-quality/evidence/pixel-archive/`

- `01-app-drawer.png` … `13-evidence-after-relaunch.png` (required set)
- `07-sources-evidence-loaded.png` — **Live sources loaded** (not infinite Loading)
- `sources-loading-failure.png` — preserved pre-fix regression proof
- `archive-pixel-acceptance.mp4`
- `archive-logcat.txt`
- `RC_1.1.1_BUILD.txt`

## Notes

- NOAA / USGS / Smithsonian / IUCN: fixture or blocked — do not count as live.
- See `KNOWN_LIMITATIONS.md` for AcceptNav / Hold Still labeling / small-screen scroll.
