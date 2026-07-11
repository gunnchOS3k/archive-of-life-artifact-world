# External Data Requirements

What is required to move from sample/mock scope to source-verified scientific coverage.

## Environment variables (`data-pipeline/.env`)

| Variable | Source | Required for |
|----------|--------|--------------|
| `COL_SNAPSHOT_PATH` | Local COL/ChecklistBank JSON | Full taxonomy ingestion |
| `GBIF_DOWNLOAD_PATH` | GBIF download file | Occurrence summaries |
| `GBIF_DOWNLOAD_DOI` | GBIF download metadata | Citation/version |
| `IUCN_API_TOKEN` | IUCN Red List API | Conservation overlay |
| `PBDB_SNAPSHOT_PATH` | PBDB export | Fossil taxa/time ranges |
| `NEOTOMA_SNAPSHOT_PATH` | Neotoma export | Paleoecology links |
| `NEOTOMA_API_ENABLED` | `true` | API sample fetch |

NASA public metadata (CMR, EONET, POWER) requires **no credentials** for metadata fetch. Earthdata Login is required for granule **download**, not implemented in this pass.

NASA metadata and regional measurements are separate scopes. A successful metadata fetch never upgrades `sample_region_layers.json` to source-verified measurements.

## Full-Earth maps

Each of the 17 supported Time Atlas gates requires a licensed, redistributable global map asset. Pre-Holocene maps require an approved paleogeographic reconstruction; Holocene/current maps require approved modern geography. Each import must include a local release asset, SHA-256, all 648 covered grid cell IDs, citation, license review, and uncertainty notes.

No reconstruction provider has been silently selected. Review redistribution terms before adding a source snapshot and setting `approvedForUse: true`.

## Licenses and citations

Each import writes:

- `sourceVersion`
- `license`
- `citation`
- `checksum`
- `lastImportTime`

Source snapshots in `public/data/coverage/source_snapshots.json` must have `approvedForUse: true` only after human review of license and citation metadata.

## Provenance classes

| Class | Meaning |
|-------|---------|
| `game_authored_verified` | Original game content (mechanics, quests, regions) |
| `source_verified` | Imported from approved external snapshot |
| `mock_sample` | Illustrative pipeline data — not real coverage |
| `derived_inferred` | Educated inference without primary source |
| `blocked_external` | Awaiting snapshot import |

## What cannot be claimed without real imports

- Full Catalogue of Life species catalogue
- Global GBIF occurrence completeness
- IUCN-assessed conservation for all taxa
- PBDB-global fossil record
- NASA granule-level regional rasters
- Neotoma late Quaternary completeness
- Full-Earth paleogeography for any Time Atlas gate still marked `blocked_external` or `partial`

## Credentials security

- Never commit `.env` or API tokens.
- IUCN token is rate-limited; cache responses under `data-pipeline/exports/iucn/`.
