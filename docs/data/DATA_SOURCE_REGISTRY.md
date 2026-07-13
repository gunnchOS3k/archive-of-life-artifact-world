# Data Source Registry

| Provider | Organization | Domain | Coverage | Auth | Adapter status | Live test | Fixture | Last verified | Limitations |
|----------|--------------|--------|----------|------|----------------|-----------|---------|---------------|-------------|
| nasa | NASA | Earth observation, climate metadata | Global metadata | None (public APIs) | **Implemented** | **Verified** (pipeline import) | `nasa_metadata_cache.json` | 2026-07-05 | Not used for species taxonomy |
| gbif | GBIF | Occurrence, taxonomy | Global | Download approval | Pipeline blocked | **Not live** | `gbif-occurrences.json` | 2026-07-13 | Needs `GBIF_DOWNLOAD_PATH` |
| col | Catalogue of Life | Taxonomy | Global | Snapshot license | Pipeline blocked | **Not live** | Search index proxy | 2026-07-13 | Needs `COL_SNAPSHOT_PATH` |
| pbdb | Paleobiology Database | Fossils, deep time | Global | Snapshot | Pipeline blocked | **Not live** | `fossil-pbdb.json` | 2026-07-13 | Needs `PBDB_SNAPSHOT_PATH` |
| iucn | IUCN Red List | Conservation | Global | API token | Pipeline blocked | **Not live** | Conservation overlay | 2026-07-05 | Token required |
| neotoma | Neotoma | Quaternary fossils | Regional | Snapshot/API | Pipeline blocked | **Not live** | — | 2026-07-05 | |
| inaturalist | iNaturalist | Community observations | Global | API (rate limits) | **Missing** | **Not live** | — | — | Not started |
| eol | Encyclopedia of Life | Species descriptions | Global | API | **Planned** | **Not live** | — | — | Educational context only |
| smithsonian | Smithsonian | Natural history | Varies | Varies | **Planned** | **Not live** | — | — | Licensing review required |
| noaa | NOAA / NCEI | Ocean, climate | Global | Mostly open | **Missing** | **Not live** | — | — | |
| usgs | USGS | Elevation, geology | US-focused | Open | **Missing** | **Not live** | — | — | |
| obis | OBIS | Marine occurrences | Global ocean | Open API | **Stub** (`registry.ts`) | **Not live** | — | 2026-07-13 | Adapter not configured |
| worms | WoRMS | Marine taxonomy | Marine | Open API | **Missing** | **Not live** | — | — | |

## Cache policy

- Pipeline exports: versioned under `data-pipeline/exports/`
- Runtime bundles: immutable snapshot ID in `manifest.json`
- Live federation: `FederatedRecord.cacheStatus` = `live` | `fixture` | `cached`

## Minimum live verification gate (prompt §5.6)

| Domain | Provider | Status |
|--------|----------|--------|
| Taxonomy | COL | **Blocked** — fixture proxy only |
| Modern occurrence | GBIF | **Blocked** — fixture only |
| Paleontology | PBDB | **Blocked** — fixture only |
| Environmental | NASA | **Verified** (metadata) |
| Marine | OBIS | **Not started** |

End-to-end live gate: **NOT PASSED** — document blockers in `CURRENT_DATA_SOURCE_AUDIT.md`.
