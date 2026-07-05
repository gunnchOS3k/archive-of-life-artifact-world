# ArchiveDex Data Schema

Known Life Entries use `ArchiveDexEntry` (`src/schema/archivedex.ts`).

## Core fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable taxon key |
| `commonName` | yes | Player-facing name |
| `scientificName` | yes | Accepted scientific name |
| `representationTier` | yes | 0–6 |
| `lifeStatus` | yes | extant, extinct, fossil_only, etc. |
| `sources` | yes | `DataSourceProvenance[]` |

## Profile sections

Optional nested profiles map to UI tabs:

- `overview`, `identity`, `taxonomy`, `time`, `habitatRange`
- `bodyTraits`, `behavior`, `dietFoodWeb`, `lifeCycle`, `ecology`
- `conservation`, `artifactsEvidence`, `earthSystems`, `humanConnections`
- `lifeling`, `media`, `uncertainty`

## Data sources

1. **Hero species** — `bundles/hero-species.json` (Tier 6 gameplay)
2. **Archive stubs** — `bundles/archive-stubs.json` (Tier 0–3)
3. **Profile overlays** — `bundles/archivedex-profiles.json` (enriched educational content)
4. **Time ranges** — `time/taxon_time_ranges.json`

`ArchiveDexService` merges these at runtime via `archivedexMapper.ts`.

## Tier minimum fields

| Tier | Minimum |
|------|---------|
| 0 | accepted name, rank, source, provenance |
| 1 | + common name, group |
| 2 | + region, habitat |
| 3 | + time units, life status |
| 4 | + artifact templates |
| 5 | + quest hooks |
| 6 | + full tab content, Lifeling, NASA links |

## Missing data policy

UI displays `Not yet available`, `Unknown`, or `Scientifically uncertain` — never crashes on missing optional fields.
