# Source snapshot policy

External biodiversity and Earth systems data enter Archive of Life through versioned **source snapshots**.

## Registry

`public/data/coverage/source_snapshots.json`

## Required fields

- Source name and category
- Version or date
- DOI or citation (when available)
- License and citation requirement
- Retrieval date
- Checksum and local path placeholder
- `approvedForUse` boolean
- `isMockData` boolean
- Notes

## Approved sources (target set)

- Catalogue of Life
- GBIF
- IUCN Red List
- Paleobiology Database
- Neotoma
- NASA Earthdata
- International Chronostratigraphic Chart
- WWF/RESOLVE terrestrial ecoregions
- Freshwater Ecoregions of the World
- Marine Ecoregions of the World
- Natural Earth (admin geography)

## Rules

1. Never commit multi-GB downloads — store under `data-pipeline/snapshots/`
2. Mock snapshots stay `approvedForUse: false`
3. Production bundles reference only approved snapshots
4. Every derived record retains provenance back to snapshot ID

See `docs/DATA_VERSIONING_WORKFLOW.md`.
