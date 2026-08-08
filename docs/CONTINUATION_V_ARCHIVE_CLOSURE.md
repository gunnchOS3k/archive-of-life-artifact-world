# Continuation V — Archive production data path + claim audit

**Branch:** `cursor/full-product-continuation-v-archive-closure`  
**Base:** origin/main `5cb81fb` (#20)

## Real source run evidence (live multi-page probe)

| Source | Records | Notes |
|--------|---------|-------|
| COL / ChecklistBank | 92 | paginated nameusage search |
| GBIF Species API | 100 | multi-page; occurrence fallback retained |
| PBDB | 12 | vocab=pbdb compact fields + taxa fallback |
| **Unique names** | **111** | after ingest |
| Pages fetched | 5 | checkpointed |

`PIPELINE_COMPLETE=True` — Multi-source live pagination with ≥10 records and ≥2 live sources

Fixture Tier R remains `unique_taxa=987` (`liveClaim=false`) and is **not** global coverage.

## Launch Tier E / F audit

| Tier | Required | Actual | Token |
|------|----------|--------|-------|
| E Encounter | 120 | 156 (playable 156) | LAUNCH_TIER_E_COMPLETE=True |
| F Flagship | 24 | 24 (gameplay 24, artifacts 24) | LAUNCH_TIER_F_COMPLETE=True |
| Regions | 12 | 12 (polar=True) | — |

## World traversal QA

`pass=True` class=`exploration_expedition_observation_research` — regions=12 observations=10 expeditions=3. Explicitly **not** Agar.io / arena-only.

## Claim firewall

Forbidden: `GLOBAL_DATA_COMPLETE`, `ALL_SPECIES_INGESTED` (always rejected without authoritative census).

Permitted when earned: `PIPELINE_COMPLETE`, `SNAPSHOT_VERSION_*_LOADED`, `LAUNCH_TIER_E_COMPLETE`, `LAUNCH_TIER_F_COMPLETE`.

Beta = launch content completeness (not global ingest). Digital RC requires Beta + `PIPELINE_COMPLETE`.

## Commands

```bash
npm run ingest:production-probe
npm run qa:world-traversal
npm run report:claims
npm run audit:claim-firewall
npm test
```
