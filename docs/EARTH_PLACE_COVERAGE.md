# Earth place coverage

Place coverage tracks continents, ocean basins, ecoregions, grid cells, and playable expedition zones.

## Registries

- `public/data/coverage/place_registry.json` — continents, oceans, zones
- `public/data/coverage/earth_grid_registry.json` — deterministic 648-cell, 10° × 10° full-Earth audit grid
- `public/data/maps/temporal_map_catalog.json` — one scientific map requirement per supported Time Atlas gate

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
- Every supported Time Atlas gate has exactly one map requirement
- A map counts as globally complete only when all 648 grid cells, the packaged asset checksum, and approved non-mock source snapshots validate

## Audit

```bash
npm run audit:earth
npm run audit:maps
npm run audit:maps:production  # expected to fail until all scientific assets are imported
```

See `docs/TEMPORAL_EARTH_MAPS.md`.
