# Durable science DB (Cont VI)

- `archive_science.sqlite` — runtime SQLite (node:sqlite) with taxonomic/time/geo/provenance/synonym indexes
- `archive_science.duckdb` — DuckDB twin from pipeline
- `offline_snapshot_meta.json` / `db_integrity.json` — version + content hashes
- `live_records_cache.json` — last live ops records for resumable rebuild (not a global-complete claim)
- `ops_ingest_summary.json` — pages/records/elapsed/hash/errors

Rebuild:

```bash
npm run ingest:production-ops   # live multi-query ops → cache + sqlite
npm run build:science-db        # bundles + fixtures + live cache
npm run pipeline:build-science-db
```
