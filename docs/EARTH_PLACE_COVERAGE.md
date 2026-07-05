# Earth place coverage

Place coverage tracks continents, ocean basins, ecoregions, grid cells, and playable expedition zones.

## Registries

- `public/data/coverage/place_registry.json` — continents, oceans, zones
- `public/data/coverage/earth_grid_registry.json` — H3/S2-style audit grid (not all cells playable)

## Ecoregion status values

- `represented`
- `partial`
- `missing`
- `source_unavailable`
- `not_yet_ingested`

## Requirements

- Every continent and major ocean basin registered
- Playable regions link to place registry records
- Species with occurrence data link to place/ecoregion summaries (future GBIF overlay)
- Every gap produces a machine-readable item in `gap_report.json`

## Audit

`npm run audit:earth`
