# Source Provenance Policy

Every species record in Archive of Life must trace back to authoritative biodiversity sources.

## Required Sources

| Source | Use | Identifier field |
|--------|-----|------------------|
| Catalogue of Life | Taxonomy, accepted names | `catalogueOfLifeId` |
| GBIF | Distribution, occurrence | `gbifTaxonKey` |
| IUCN Red List | Conservation status | `iucnTaxonId` |
| Paleobiology Database | Fossil/extinct taxa | `paleobiodbTaxonNo` |
| Encyclopedia of Life | Descriptions (future) | TBD |

## Provenance Record Requirements

Each `DataSourceProvenance` entry must include:

- `source` — source system name
- `sourceVersion` — snapshot or API version
- `license` — SPDX-style label (CC-BY-4.0, IUCN-TOS, etc.)
- `citation` — human-readable attribution
- `citationRequired` — whether UI must display citation
- `lastUpdated` — ISO date of source record
- `isMockData` — true for sample/placeholder data

## UI Requirements

Species detail pages display:

1. All provenance sources
2. License labels
3. Citation text when required
4. Warning that taxonomy/conservation may change
5. MOCK SAMPLE badge when `isMockData: true`

## Mock vs Production Data

Sample data in this prototype is explicitly marked `isMockData: true` with `MOCK-SAMPLE` license. Production deployments must replace mock overlays with ingested source snapshots.

## Ethical Data Use

- No species data obtained through harm or capture
- IUCN data subject to IUCN Terms of Use
- GBIF data subject to publisher licenses
- Indigenous ecological knowledge requires community consent — never treated as loot

## Audit

Run `npm run audit:data` to verify:

- All game species have provenance
- Lifeling unlocks reference valid species
- Hero species have artifact templates
