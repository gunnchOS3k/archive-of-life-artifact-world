# Data Pipeline

Ingestion scaffolding for biodiversity and NASA Earth Systems data. Uses mock samples by default — no API keys required.

## Structure

```
data-pipeline/
  ingest/
    catalogue_of_life/   # COL mock/API samples
    gbif/                # GBIF occurrence samples
    iucn/                # IUCN Red List samples
    paleobiodb/          # PBDB fossil samples
    nasa/                # NASA Earthdata, FIRMS, EONET, POWER, etc.
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

# NASA pipeline modules (mock — no credentials required)
python3 -c "from ingest.nasa.firms_events import fetch_active_fires; print(fetch_active_fires())"
```

See [docs/NASA_EARTH_SYSTEMS_INTEGRATION.md](../docs/NASA_EARTH_SYSTEMS_INTEGRATION.md) for NASA layer details.

## Production Flow (future)

1. Ingest source snapshots (COL, GBIF, IUCN, PBDB, NASA Earthdata)
2. Transform to `ArchiveSpecies` and `RegionEarthLayers` schemas
3. Build search index and regional bundles
4. Export to `public/data/bundles/` and `public/data/earth/`
5. Update manifest snapshot versions
6. Run `npm run audit:data` before release
