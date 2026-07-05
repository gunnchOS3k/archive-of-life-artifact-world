# Source Ingestion Runbook

Executable workflows for importing external biodiversity and Earth data into Archive of Life.

## Prerequisites

1. Copy `data-pipeline/.env.example` → `data-pipeline/.env`
2. Install pipeline: `npm run pipeline:install`
3. List source status: `npm run source:list`

## Commands

| Command | Purpose |
|---------|---------|
| `npm run source:list` | List all sources with configured/imported/blocked status |
| `npm run source:validate` | Check env vars and snapshot paths |
| `npm run source:audit` | Write `source_import_status.json` and `source_readiness_report.json` |
| `npm run source:import:col` | Import Catalogue of Life local archive |
| `npm run source:import:gbif` | Import GBIF download |
| `npm run source:import:iucn` | Fetch IUCN Red List (token required) |
| `npm run source:import:pbdb` | Import PBDB fossil snapshot |
| `npm run source:import:nasa` | Fetch/cache NASA CMR, EONET, POWER metadata |
| `npm run source:import:neotoma` | Import Neotoma snapshot or API sample |
| `npm run source:import:all` | Attempt all imports (blocked sources fail gracefully) |

Python equivalents: `cd data-pipeline && uv run archive-pipeline import <source>`

## Catalogue of Life

1. Download approved ChecklistBank export (JSON).
2. Set `COL_SNAPSHOT_PATH` in `data-pipeline/.env`.
3. Run `npm run source:import:col`.

If missing:

```text
Catalogue of Life snapshot not found. Download approved snapshot and set COL_SNAPSHOT_PATH in data-pipeline/.env.
```

## GBIF

1. Download occurrence export (DOI or local path).
2. Set `GBIF_DOWNLOAD_PATH` and optional `GBIF_DOWNLOAD_DOI`.
3. Run `npm run source:import:gbif`.

Do not use live occurrence search for millions of records — use official downloads.

## IUCN

1. Obtain API token from IUCN Red List API.
2. Set `IUCN_API_TOKEN`.
3. Run `npm run source:import:iucn` (rate-limited; caches response).

## PBDB

1. Download PBDB taxon CSV/JSON export.
2. Set `PBDB_SNAPSHOT_PATH`.
3. Run `npm run source:import:pbdb`.

## NASA

1. Run `npm run source:import:nasa` (uses public CMR, EONET, POWER APIs).
2. Cached exports: `data-pipeline/exports/nasa/`
3. Game cache: `public/data/earth/nasa_metadata_cache.json`

Earth Layer Console shows **REAL NASA METADATA**, **CACHED NASA SNAPSHOT**, or **SAMPLE FALLBACK** per layer.

## Neotoma

1. Set `NEOTOMA_SNAPSHOT_PATH` for local export, or `NEOTOMA_API_ENABLED=true` for API sample.
2. Run `npm run source:import:neotoma`.

## After import

```bash
npm run source:audit
npm run generate:bundles
npm run audit:data
npm run audit:coverage
npm run audit:implementation
```

## Output files

- `data-pipeline/exports/<source>/` — normalized imports
- `public/data/status/source_import_status.json`
- `public/data/status/source_readiness_report.json`
- `public/data/status/real_data_completion_report.json`
