# Beta / Digital RC status (Cont VII)

**Engine Digital RC** = frozen launch Tier E/F + systems + science-DB runtime + MOCK firewall.  
Does **not** mean global scientific catalog complete.

| Token | Status | Scope |
|-------|--------|-------|
| `LAUNCH_TIER_E_COMPLETE` | E≥120 playable | engine launch floor |
| `LAUNCH_TIER_F_COMPLETE` | F=24 | engine launch floor |
| `PIPELINE_COMPLETE` | production ops path | engine |
| `ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL` | earned | engine |
| `ARCHIVE_DIGITAL_RC_READY` | earned with runtime DB + MOCK firewall | **engine RC only** |
| `GLOBAL_DATA_COMPLETE` | always rejected | global catalog |
| `ALL_SPECIES_INGESTED` | always rejected | global catalog |

## Cont VII honesty

- MOCK / sample provenance cannot satisfy release completeness.
- Deepened bulk ingest (COL/GBIF/PBDB/IUCN/Neotoma/ICS/Smithsonian manifests) ≠ global catalog.
- `encounterTaxa≥120` restored via frozen `search-index.json` in `restore:launch-floors`.

```bash
npm run restore:launch-floors
npm run ingest:bulk-manifest
npm run audit:mock-firewall
npm run rc:digital-suite
npm run audit:claim-firewall
```
