# Beta + Digital RC status — Archive of Life

**Branch:** `cursor/full-product-archive-beta-rc`  
**Base:** origin/main `49b2bc4` (#19)  
**Primary tokens:** `ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL`, `ARCHIVE_DIGITAL_RC_READY`

This continuation builds **toward Beta digital content completeness and Digital RC**. It does not restate Alpha-exit as the product claim.

## Production ingest

| Capability | Status |
|------------|--------|
| Pagination / checkpoint / resume | Yes (`CheckpointStore`, `--resume`) |
| Backoff / rate-limit | Yes (`ScientificHttpClient`) |
| Cache | Yes (`IngestCache`) |
| Snapshot / validation / provenance / license | Yes |
| Synonyms / dedup / conflicts | Yes (`synonyms.ts`, `dedup.ts`) |
| Source states | `LIVE_PUBLIC` \| `AUTHORIZED_BULK` \| `SNAPSHOT` \| `FIXTURE_TEST_ONLY` \| `UNAVAILABLE` |
| Never call fixture live | Enforced (`assertNeverCallFixtureLive`) |

## Machine-readable actual counts

Artifact: `public/data/coverage/actual_counts.json`

Fields include `records_by_source`, `unique_taxa`, `synonyms`, `conflicts`, with `globalCompleteClaim: false`.

## Commands

```bash
npm run ingest:batch
npm run ingest:batch:live   # bounded optional live; not global
npm run report:beta-rc
npm test
```

## Non-claims

- Not global live COL/GBIF/PBDB completeness
- Not IUCN authorized-bulk completeness
- Not physical / device RC
- Fixtures never counted as live
