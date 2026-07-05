# Time Atlas & Known Life Archive Architecture

## Core principle: representation vs. gameplay depth

Every known taxon from approved source snapshots must exist in the Archive at **Tier 0** minimum. Full animation, quests, and hero content (Tier 6) are reserved for curated subsets.

| Tier | Label | Meaning |
|------|-------|---------|
| 0 | Archive record | Minimum representation — taxon exists in Known Life Archive |
| 1 | Searchable | Indexed for paginated search |
| 2 | Region mapped | GBIF occurrence / regional summary attached |
| 3 | Time mapped | TaxonTimeRange linked to ICS units |
| 4 | Artifact-ready | Ethical artifact templates defined |
| 5 | Questable | Included in active quest chains |
| 6 | Hero taxon | Full gameplay — encounters, Lifeling traits, educational depth |

## Time Atlas

- **Data:** `public/data/time/` — ICS geologic units, playable time gates, taxon time ranges
- **Service:** `src/time/TimeAtlasService.ts` — lazy-loaded; never loads full global catalogue
- **UI:** Museum Time Atlas panel (`Y` key) — browse eons→ages, inspect taxa per period, view playable gates

## Known Life Archive

- **Index:** `bundles/search-index.json` — lightweight paginated entries (millions-safe)
- **Detail:** `bundles/hero-species.json` (Tier 6) + `bundles/archive-stubs.json` (Tier 0–3)
- **UI:** Archive panel with filters for time period, life status, representation tier, and source

## Source provenance (required)

| Source | Role |
|--------|------|
| Catalogue of Life | Extant taxonomy |
| GBIF | Modern occurrence summaries |
| IUCN | Conservation assessments |
| Paleobiology Database | Fossil taxa & time ranges |
| Neotoma | Late Quaternary paleoecology |
| NASA Earthdata | Environmental context |
| ICS Chronostratigraphic Chart | Official time divisions |

## Pipeline

```
data-pipeline/ingest/{col,gbif,iucn,pbdb,neotoma,nasa,ics_time_scale}/
  → data-pipeline/transform/
  → data-pipeline/exports/
  → npm run generate:time-atlas && npm run generate:bundles
  → npm run audit:coverage
```

## Commands

```bash
npm run generate:time-atlas   # Regenerate ICS time bundles
npm run generate:bundles      # Regenerate species bundles + manifest
npm run audit:coverage        # Full coverage audit (time + taxa + provenance)
npm run audit:data            # Legacy data integrity checks
npm run typecheck
npm run dev
```

## Scalability invariants

1. Search index is paginated — never render all records at once
2. Species detail is lazy-loaded per ID from hero or stub bundles
3. Region bundles load only active-region species for gameplay
4. Time Atlas loads time JSON separately from biodiversity catalogue
5. Coverage audits validate snapshot scope files in `data-pipeline/exports/sample_scope/`
