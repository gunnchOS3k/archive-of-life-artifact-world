# Global Coverage Matrix

The Global Coverage Matrix models whether each taxon is **properly represented** across identity, provenance, time, place, biome, gameplay, and quality dimensions.

## Matrix columns

| Field | Meaning |
|-------|---------|
| `taxonId` | Stable identifier |
| `scientificName` / `acceptedName` | Catalogue identity |
| `rank` | Taxonomic rank |
| `lifeStatus` | extant / extinct / uncertain / microbial_or_pre_animal |
| `representationTier` | T0–T6 depth |
| `sourceCoverage` | Provenance or index sources present |
| `timeCoverage` | Linked to Time Atlas |
| `placeCoverage` | Region / occurrence mapping |
| `biomeCoverage` | Biome or ecoregion linkage |
| `artifactCoverage` | Ethical artifact templates (T4+) |
| `archivedexCoverage` | Searchable archive record |
| `lifelingCoverage` | Companion unlock linkage |
| `gameplayCoverage` | Questable / playable |
| `dataQuality` | verified / sample / mock / partial |
| `gapFlags` | Machine-readable gap codes |

## Tier system (T0–T6)

- **T0** Archive record
- **T1** Searchable
- **T2** Region/place mapped
- **T3** Time mapped
- **T4** Artifact-ready
- **T5** Questable
- **T6** Hero taxon/species

## Implementation

- TypeScript services: `src/coverage/`
- Registries: `public/data/coverage/`
- Audits: `npm run audit:coverage` (orchestrator)
- Reports: `npm run report:coverage` → `gap_report.json`, `bias_report.json`
- Dashboard: Coverage Dashboard panel (`?dev=1`, key `G`, museum interactable)

## Principle

A taxon is not properly represented unless it has identity, provenance, tier, life status, applicable time/place/biome coverage, data quality status, and uncertainty notes when needed.
