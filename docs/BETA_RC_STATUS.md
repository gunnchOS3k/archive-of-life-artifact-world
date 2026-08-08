# Beta / Digital RC status (Cont VI)

**Beta digital** = frozen launch Tier E/F + systems + world/runtime traversal.  
Does **not** mean global scientific ingest.

**Digital RC** = Beta + `PIPELINE_COMPLETE` + **runtime science-DB integration** + RC suite.

| Token | Status |
|-------|--------|
| `LAUNCH_TIER_E_COMPLETE` | E=156 playable (floor 120) |
| `LAUNCH_TIER_F_COMPLETE` | F=24 gameplay+artifacts |
| `PIPELINE_COMPLETE` | Cont VI multi-query live ops (see `production_ops_report.json`) |
| `ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL` | earned |
| `ARCHIVE_DIGITAL_RC_READY` | earned only with runtime DB integration |
| `GLOBAL_DATA_COMPLETE` | always rejected |
| `ALL_SPECIES_INGESTED` | always rejected |

```bash
npm run ingest:production-ops
npm run build:science-db
npm run qa:tier-ef-runtime
npm run rc:digital-suite
npm run report:claims
npm run audit:claim-firewall
```
