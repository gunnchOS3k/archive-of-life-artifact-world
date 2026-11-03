# Cross-game V1 acceptance ledger

Machine-readable source of truth: [`V1_ACCEPTANCE_LEDGER.json`](./V1_ACCEPTANCE_LEDGER.json).

## Gates (all false this shift)

| Gate | Value |
|------|-------|
| human_test / human_v1 | false |
| rc | false |
| v1_0_0_release_authorized | false |
| commercial_authorized | false |

## Distinct statuses

`data_registered` → `runtime_playable` → `gameplay_tested` → `final_asset_candidate` → `final_asset_human_approved` → `rc` → `commercial_authorized`

## Sections

| Game | Section | Notes |
|------|---------|-------|
| **Archive of Life** | Fully filled | ArchiveDex, Time Atlas, science DB, expedition/collection/journal, Lifelings, museum, steppe exploration, offline integrity, taxon-honest icons, mock provenance quarantine |
| Anime Aggressors | Stub | Fields present; not owned here |
| Pedestrian Pursuit | Stub | Fields present; not owned here |
| BeatLink Party | Stub | Fields present; not owned here |

Each system row carries: `implemented`, `runtime`, `automated_evidence`, `native_evidence`, `final_art`, `human_test`, `blocker`, `owner`, plus a distinct `status`.

## Honesty

- Earth-complete catalog is **not** claimed.
- Quarantined mock provenance is **never** `source_verified`.
- Temporal maps stay **blocked** until authorized external reconstructions exist.
- Production-readiness audit remains a hard fail while incompleteness is real.
