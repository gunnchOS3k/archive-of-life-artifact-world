# Acceptance Checklist — Archive of Life

**Updated:** 2026-07-13

| Gate | Status | Evidence |
|------|--------|----------|
| Multi-source federation | **PASS** | `src/services/providers/` — see `PROVIDER_FEDERATION_STATUS.md` |
| Live domain minimum (5) | **PASS** | Occurrence: GBIF+iNat · Taxonomy: COL+WoRMS · Paleo: PBDB · Env: NASA EONET · Marine: OBIS+WoRMS |
| Sources & Evidence in play | **PASS** | Unlock modal + ArchiveDex Sources + Notebook buttons; live vs fixture badges; conflicts retained |
| Controllable expedition | **PASS** | WASD move, water/rock collision, camera follow on larger swamp, Lifeling follow |
| Locations Savanna / Forest / Wetland / Indiana Swamp | **PASS** | Browser acceptance travel + screenshots |
| Deep-time activity + reconstruction labeling | **PASS** | Trilobite fossil + Neotoma reconstructed/fixture labeling + conflict UI |
| Persistence after reload | **PASS** | Artifacts `panthera_leo`,`trilobita_order`; notebook 2; equipped `lion_mane_small` |
| Browser automation | **PASS** | cursor-ide-browser MCP (no separate Playwright MCP server available in this environment) |
| Release APK + Pixel | **PARTIAL** | Release APK built + SHA recorded; Pixel **NOT TESTED** (ADB empty); still debug-keystore signed |
| PR | **No** | |

## Evidence files

- `docs/product-quality/evidence/aol-01-startup.png`
- `docs/product-quality/evidence/aol-02-savanna-evidence.png` (forest viewport)
- `docs/product-quality/evidence/aol-03-notebook-evidence.png`
- `docs/product-quality/evidence/archive-unlock-evidence.png`
- `docs/product-quality/evidence/archive-expedition-wetland.png`

## Notes

- NOAA / USGS / Smithsonian / IUCN: fixture or blocked — do not count as live.
- Circular museum portals remain destination selectors; regions include walkable exploration.
