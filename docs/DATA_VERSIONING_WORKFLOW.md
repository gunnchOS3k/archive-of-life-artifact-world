# Data versioning workflow

Archive of Life separates **code** from **large scientific data**.

## What Git stores

- Application code (TypeScript/Vite)
- Python pipeline code, SQL, tests
- Schemas, documentation, small sample scopes
- Manifests and checksums for bundles and snapshots
- Machine-readable coverage registries and audit reports (sample scope)

## What Git does not store

- Full Catalogue of Life, GBIF, IUCN, PBDB, or ecoregion downloads
- Multi-gigabyte parquet/CSV extracts
- Full global catalogues loaded into the frontend

Place large files under `data-pipeline/snapshots/` locally or track with DVC/object storage later.

## Source snapshot requirements

Every snapshot manifest must record:

| Field | Purpose |
|-------|---------|
| Source name | e.g. `catalogue_of_life`, `gbif`, `iucn` |
| Version / date | Authoritative release identifier |
| License | Legal use constraints |
| Checksum | Reproducibility |
| Retrieval date | Audit trail |
| `approvedForUse` | Gate for production bundles |

Mock and sample snapshots must set `approvedForUse: false` and `isMockData: true`.

## Mock vs real coverage

Mock/sample records support prototyping and gameplay. They **never** count as source-complete scientific coverage in audits or release gates.

## Workflow

1. Download source → `data-pipeline/snapshots/<source>/`
2. Validate with SQL + Python pipeline (`npm run pipeline:sql`, `pipeline:audit`)
3. Transform to scoped exports → `data-pipeline/exports/`
4. Generate game bundles → `npm run generate:bundles`
5. Run audits → `npm run audit:coverage`, `report:coverage`
6. Commit manifests, checksums, and sample scopes — not raw downloads

See also: `docs/SOURCE_SNAPSHOT_POLICY.md`, `docs/RELEASE_SNAPSHOT_POLICY.md`.
