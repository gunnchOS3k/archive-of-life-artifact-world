# Continuation VI — Durable science DB + deeper production ops + Digital RC

**Branch:** `cursor/full-product-continuation-vi-science-db`  
**Base:** origin/main `ee8a2e6` (#21)

## Honesty

- Always rejected without authoritative census: `GLOBAL_DATA_COMPLETE` / `ALL_SPECIES_INGESTED`
- `PIPELINE_COMPLETE` is scoped to multi-query live production ops with recorded counts/hashes/elapsed/errors
- Tier E/F must be **playable**, not count-only (E playable ≥120, F gameplay+artifacts = 24)
- `ARCHIVE_DIGITAL_RC_READY` only when Beta + PIPELINE + **runtime science-DB integration** + RC suite pass
- Does **not** claim global live archive completeness

## Durable scientific DB

- SQLite (`node:sqlite`): `public/data/science/archive_science.sqlite`
- Indexes: taxonomic name, synonym, region, biome, era, provenance, geo
- Offline snapshot meta + integrity hash
- DuckDB twin via `npm run pipeline:build-science-db`

```bash
npm run build:science-db
npm run pipeline:build-science-db
```

## Production ops (materially larger than Cont V)

Cont V baseline: ~204 records / 5 pages. Cont VI runs multi-taxon COL/GBIF/PBDB queries.

```bash
npm run ingest:production-ops
# resume:
npm run ingest:production-ops -- --resume
```

Evidence: `public/data/status/production_ops_report.json`, `actual_counts_live_bounded.json` (elapsedMs, contentHash, errors).

## Runtime traversal (Tier E/F)

DB-backed traversal across all launch regions: encounter, biome, era, clue, observation, artifact, journal/codex, companion.

```bash
npm run qa:tier-ef-runtime
npm run rc:digital-suite
npm run report:claims
```

## Digital RC suite

Migration, snapshot update/corrupt detect, offline, source update, save migrate, package, update/rollback, provenance display, a11y, localization-ready, unique icon/title.
