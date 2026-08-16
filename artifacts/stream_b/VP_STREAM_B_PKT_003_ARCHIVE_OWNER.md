# STREAM-B-PKT-003 — Archive of Life owner tip

## Tip
- Base: `main` @ `74f5761` (live)
- Branch: `stream/b-pkt-003-scientific-lifeling-expedition`

## Verify
```bash
npx vitest run src/systems/streamBPkt003.test.ts
npx tsx scripts/run_b_pkt_003_archive.ts
python3 - <<'PY'
import json
s=json.load(open('artifacts/stream_b/STREAM_B_PKT_003_ARCHIVE_STATE.json'))
assert s['HUMAN_PLAYTEST_VALIDATED'] is False
assert s['GLOBAL_DATA_COMPLETE'] is False
assert s['ALL_SPECIES_INGESTED'] is False
assert s['scientific_ingest']['conflicts']
assert s['lifeling_progression']['progressionOk'] is True
assert s['expedition_diversity']['diversityOk'] is True
assert s['playtest_packet']['HUMAN_PLAYTEST_VALIDATED'] is False
assert s['offline_scientific_pack']['bounded'] is True
assert s['offline_scientific_pack']['globalComplete'] is False
print('PASS')
PY
```

## Claims
- Scientific ingestion with provenance + conflict/synonym handling (fixture, liveClaim=false)
- Bounded offline scientific pack (not global)
- Lifeling progression advances modules/traits
- Expedition diversity across biomes/objective types
- Playtest packet present; `HUMAN_PLAYTEST_VALIDATED=false`
- `GLOBAL_DATA_COMPLETE=false`; `ALL_SPECIES_INGESTED=false`
- Cursor NEVER merges
