# Archive data claim firewall

Cont V/VI — automatic rejection of over-claims.

## Forbidden (unless exact authoritative coverage evidence exists)

- `GLOBAL_DATA_COMPLETE`
- `ALL_SPECIES_INGESTED`

## Permitted when earned

- `PIPELINE_COMPLETE` — multi-source live production path (pagination, checkpoint, provenance) with recorded counts
- `SNAPSHOT_VERSION_X_LOADED` — fixture or official bulk snapshot registered (hash/manifest); fixture versions are labeled `SNAPSHOT_VERSION_FIXTURE_…`
- `LAUNCH_TIER_E_COMPLETE` — frozen launch encounter set ≥120 **playable**
- `LAUNCH_TIER_F_COMPLETE` — frozen flagship set = 24 with gameplay + artifact templates

## Beta / Digital RC

- `ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL` is **launch content** completeness (E/F + systems + world traversal). It does **not** mean global scientific ingest.
- `ARCHIVE_DIGITAL_RC_READY` requires Beta + `PIPELINE_COMPLETE` + **runtime science-DB integration** (Cont VI).

Fixture-scale `unique_taxa≈987` is never evidence of global coverage.

```bash
npm run audit:claim-firewall
npm run report:claims
```
