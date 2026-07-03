# Data Architecture

Archive of Life uses a **tiered, bundle-based data architecture** designed to represent millions of species without loading the full global catalogue into browser memory.

## Fidelity Tiers

| Tier | Description | Loaded when |
|------|-------------|-------------|
| **Search index** | Lightweight id, names, group, conservation flags | Archive browse/filter |
| **Database entry** | Index + distribution summary | Search result card |
| **Conservation record** | IUCN overlay | Detail view / filters |
| **Regional species** | Playable in a biome | Region entered |
| **Hero species** | Full gameplay, artifacts, quests | Region entered / detail lazy-load |
| **Animated hero** | 3D/behavior (future) | Encounter |

## Bundle Types (`public/data/manifest.json`)

- `heroSpecies` — canonical detailed records (25 in sample)
- `regionSpecies` — per-region subsets loaded on demand
- `conservation` — IUCN overlay bundle
- `occurrence` — GBIF-style occurrence summaries
- `fossil` — PBDB-style fossil records
- `searchIndex` — paginated Archive browsing
- `gameConfig` — regions, quests, traits

## Runtime Loading

```
DataCatalogService
  ├── fetch manifest.json
  ├── load search index (cached in IndexedDB)
  ├── load game config (regions, quests, traits)
  └── on region enter → load region bundle only
```

Species detail records are lazy-loaded per id and cached in IndexedDB.

## Cache Invalidation

`IndexedDBCache` stores `snapshotId` + `manifestVersion`. When the manifest changes, all cached bundles are invalidated.

## Schema Layer

TypeScript schemas live in `src/schema/`:

- `ArchiveSpecies`, `Taxonomy`, `ConservationProfile`
- `DistributionProfile`, `FossilProfile`, `ArtifactTemplate`
- `LifelingTrait`, `RegionBundle`, `DataSourceProvenance`

## Adding Species at Scale

1. Ingest source data via `data-pipeline/`
2. Transform to `ArchiveSpecies` schema
3. Append to hero/regional bundles or generate new bundles
4. Rebuild search index shard
5. Update manifest coverage counts
6. Run `npm run audit:data`

## Player Save Data

Small save state (artifacts, quests, companion) remains in `localStorage`. Large structured biodiversity data uses IndexedDB only.
