# CURRENT DATA SOURCE AUDIT

**Updated:** 2026-07-13 — runtime federation audit (honest)

## Runtime federation (`src/services/providers/`)

Live (public APIs with fixture/empty fallback): GBIF, iNaturalist, Catalogue of Life, WoRMS, PBDB, OBIS, NASA EONET, Neotoma (when reachable), EOL (best-effort).

Fixture / blocked (do not count as live): NOAA, USGS, Smithsonian, IUCN (authored overlays only).

## Pipeline vs runtime

Pipeline (`data-pipeline/`) may import IUCN/Neotoma snapshots with credentials. Runtime game adapters must not pretend those pipeline paths are live browser integrations.

## UI wiring

- Unlock modal Sources & Evidence
- ArchiveDex Sources tab
- Notebook “Sources & Evidence” per entry

See `docs/product-quality/PROVIDER_FEDERATION_STATUS.md` for the full provider table.
