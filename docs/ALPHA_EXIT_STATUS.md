# Alpha exit status — Archive of Life

**Branch:** `cursor/full-product-archive-alpha-exit`  
**Base:** origin/main `5028aa0` (merged #18 Wave F Alpha)  
**Claim level:** Alpha exit digital systems only — **not** Beta/RC.

## Honest baseline (post-#18)

| Floor (ADR-GAME-AR-001) | Required | Actual | Notes |
|-------------------------|----------|--------|-------|
| Regions | 12 | 12 | Includes `polar_ice` |
| Encounter (E) | ≥120 | ~157–167 | `authored_public_taxonomy`, `liveClaim=false` |
| Flagship (F) | 24 | 24 | Authored heroes |
| Tier R live global | — | **not claimed** | Index references ≠ live ingest |

## This continuation

1. **Batch/snapshot ingest** (`BatchSnapshotIngest`) — pagination, resume checkpoints, rate-limit/backoff (via `ScientificHttpClient`), snapshot version, validation, provenance, license, dedup. Fixture default; optional bounded `--live`.
2. **Tier R index** (`TierRRecordIndex`) — scalable Map index beyond encounter catalog; reports **actual** imported counts by source with explicit `liveClaim`.
3. **Game systems** — observation, scanning, deep time helpers, codex progress, offline pack, expedition objective types (`observe_species`, `scan_taxon`, `view_time_unit`).
4. **Alpha exit evaluator** — status tokens:
   - `ARCHIVE_ALPHA_EXIT_DIGITAL_PASS` — launch-critical systems present + ADR floors met
   - `ARCHIVE_ALPHA_EXIT_IN_PROGRESS` — partial
   - `ARCHIVE_ALPHA_EXIT_NOT_READY` — missing critical pieces

## Commands

```bash
npm run ingest:batch          # fixture snapshot → Tier R index
npm run ingest:batch:live     # optional bounded live COL/GBIF/PBDB
npm run report:alpha-exit     # write alpha_exit_report.json
npm test
```

## Non-claims

- Not Beta / RC / production scientific release
- Not global live COL/GBIF/PBDB coverage
- Fixtures never counted as live
- Authored encounter catalog remains `liveClaim=false`
