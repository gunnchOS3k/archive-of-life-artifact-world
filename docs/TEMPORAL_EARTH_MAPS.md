# Full-Earth temporal map contract

Archive of Life supports 17 Time Atlas gates. Each gate must have one globally covering, source-verified map before the scientific production gate can pass.

## Current state

- `public/data/coverage/earth_grid_registry.json` contains a deterministic 10° × 10° full-Earth audit grid: 648 cells covering `[-180, -90, 180, 90]` exactly once.
- `public/data/maps/temporal_map_catalog.json` contains one map requirement for each supported Time Atlas gate.
- The catalog currently contains **0 source-verified maps**. Every entry is `blocked_external` and has no asset.
- The Time Atlas displays that status. It does not render invented coastlines or treat NASA metadata as a paleogeographic reconstruction.

The grid is a coverage index, not scientific data. `not_yet_ingested` cells do not count as coverage.

## Definition of a complete time-period map

A catalog record may use `source_verified` only when all of these conditions hold:

1. The asset is packaged under `public/data/` as GeoJSON or PMTiles.
2. Its bounds are the full WGS84 Earth extent.
3. Offline coverage analysis records all 648 grid cell IDs in `coveredGridCellIds`.
4. File size and SHA-256 match the catalog.
5. Every linked source snapshot exists in `source_snapshots.json`, is non-mock, has a valid checksum, and is `approvedForUse` after license review.
6. The map links to the exact Time Atlas gate and its current time-unit IDs.
7. Temporal and spatial uncertainty are documented.

The integrity audit also rejects duplicate gates, unknown time units, path traversal, missing assets, bad checksums, unapproved sources, and false full-coverage claims.

## Scientific evidence policy

- All maps require approved chronostratigraphic boundaries.
- Pre-Holocene gates additionally require an authoritative paleogeographic reconstruction with explicit license, citation, age, and uncertainty.
- Holocene/current geography requires an approved modern geography snapshot; NASA Earth observation can provide environmental overlays, but does not replace a base map.
- A reconstruction provider is deliberately not hard-coded until its dataset license and redistribution terms are reviewed. A provider name, URL, or citation alone is not an imported dataset.

## Workflow

```bash
npm run generate:maps          # deterministic grid + one requirement per Time Gate
npm run audit:maps             # structure, coverage declarations, paths, checksums, provenance
npm run audit:maps:production  # additionally requires all 17 maps to be source_verified
npm run audit:production       # maps + external sources + non-mock displayed science
```

`generate:temporal-maps` preserves existing asset/status fields while synchronizing gate IDs, time-unit IDs, and expected grid size. Always run the audits after changing a map record.

## Mobile packaging

Map assets must be local, immutable release files. Android builds must not depend on API keys or a network connection to display the selected release snapshot. Prefer PMTiles for large maps and keep source snapshots outside the application package; only normalized, licensed release assets belong in `public/data/`.
