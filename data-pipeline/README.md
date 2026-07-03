# Data Pipeline

Ingestion scaffolding for biodiversity data sources. Uses mock samples by default — no API keys required.

## Structure

```
data-pipeline/
  ingest/
    catalogue_of_life/   # COL mock/API samples
    gbif/                # GBIF occurrence samples
    iucn/                # IUCN Red List samples
    paleobiodb/          # PBDB fossil samples
  transform/             # Normalization scripts
  exports/               # Generated intermediate files
  audits/                # Pipeline audit outputs
```

## Usage

```bash
# Optional: copy and configure API credentials
cp data-pipeline/.env.example data-pipeline/.env

# Run mock COL transform
python3 data-pipeline/transform/col_transform.py

# Generate game bundles from legacy MVP data
npm run generate:bundles

# Run coverage audit
npm run audit:data
```

## Production Flow (future)

1. Ingest source snapshots (COL, GBIF, IUCN, PBDB)
2. Transform to `ArchiveSpecies` schema
3. Build search index and regional bundles
4. Export to `public/data/bundles/`
5. Update `manifest.json` with snapshot version
6. Run `npm run audit:data` before release
