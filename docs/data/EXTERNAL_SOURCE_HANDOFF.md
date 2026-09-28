# External Source Handoff

Cursor can complete the engineering program without these files, but actual global scientific ingestion cannot.

| Source | Purpose | Required handoff | Env / path |
|---|---|---|---|
| Catalogue of Life | Taxonomic backbone | Approved bulk snapshot/export + version/license | `COL_SNAPSHOT_PATH` |
| GBIF | Modern occurrences | Official download/export + DOI/license | `GBIF_DOWNLOAD_PATH` / `GBIF_DOWNLOAD_DOI` |
| PBDB | Fossils/deep time | Approved bulk CSV/JSON | `PBDB_SNAPSHOT_PATH` |
| Neotoma | Paleoecology | Snapshot or approved API configuration | `NEOTOMA_SNAPSHOT_PATH` / API |
| IUCN | Conservation | API access/token + terms review | `IUCN_API_TOKEN` |
| ICS | Geological time | Approved chart/data snapshot + license/version | `ICS_SNAPSHOT_PATH` |
| Paleogeography | Historical maps | Approved/licensed temporal assets | future source registry |
| Media | Photos/audio/specimens/3D | Rights-cleared collections | future media manifest |

## Rules

- no credentials in Git
- no raw multi-gigabyte snapshots in Git
- record license, citation, version, retrieval date, SHA-256
- mock/sample never counts as global scientific coverage
- live API connectivity does not equal complete source ingestion
- GBIF millions-row work must use official download/export mechanisms, not search pagination abuse
