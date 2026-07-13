# Current Data Source Audit

**Repository:** archive-of-life-artifact-world  
**Date:** 2026-07-13  
**Scope:** Full-repo search + `source_import_status.json` verification

## Summary

| Classification | Count |
|----------------|-------|
| Live integration verified | 1 (NASA metadata pipeline) |
| Adapter implemented, not live-tested | 5 (COL, GBIF, IUCN, PBDB, Neotoma) |
| Fixture only in runtime | GBIF, PBDB, hero/regional bundles |
| Mock only | Regional earth measurements when `isMockData` |
| Metadata mention only | EOL, Smithsonian (docs) |
| Planned / missing | iNaturalist, NOAA, USGS, OBIS, WoRMS |
| Restricted | COL, GBIF, IUCN, PBDB, Neotoma (credentials/snapshots) |

## Per-source classification

| Source | In codebase | Runtime | Pipeline | Status |
|--------|-------------|---------|----------|--------|
| NASA | `EarthLayerService`, `source_import:nasa` | Metadata cache JSON | **Live integration verified** | Earth observation only |
| GBIF | Fixtures, pipeline adapter | `gbif-occurrences.json` | **Fixture only** / blocked live | Needs `GBIF_DOWNLOAD_PATH` |
| Catalogue of Life | Pipeline adapter | Search index proxy | **Blocked** | Needs `COL_SNAPSHOT_PATH` |
| Paleobiology Database | Fixtures, pipeline | `fossil-pbdb.json` | **Fixture only** / blocked live | Needs `PBDB_SNAPSHOT_PATH` |
| IUCN | Pipeline adapter | Conservation overlay | **Blocked** | Needs `IUCN_API_TOKEN` |
| Neotoma | Pipeline adapter | — | **Blocked** | Snapshot or API flag |
| iNaturalist | — | — | **Missing** | Planned |
| Encyclopedia of Life | Docs mentions | — | **Metadata mention only** | |
| Smithsonian | Docs mentions | — | **Metadata mention only** | |
| NOAA / NCEI | — | — | **Missing** | Planned environmental |
| USGS | — | — | **Missing** | Planned elevation/geology |
| OBIS | Provider stub (`registry.ts`) | — | **Planned** | Marine occurrences |
| WoRMS | — | — | **Missing** | Marine taxonomy |

## Hard-coded / sample data

- `public/data/bundles/*` — tiered sample snapshot `sample-2026-07`
- `public/data/manifest.json` — describes fixture record counts; not live federation
- `game-config.json` — game design data, not scientific authority

## Attribution in repo

- `public/data/status/source_import_status.json` — per-source blocked reasons
- `public/data/earth/nasa_metadata_cache.json` — NASA citation fields
- New: `src/services/providers/` — runtime federation with preserved attribution

**Do not describe sample JSON bundles as live scientific integrations.**
