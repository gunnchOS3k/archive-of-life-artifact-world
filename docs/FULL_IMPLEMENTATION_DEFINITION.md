# Full implementation definition

Archive of Life uses explicit status labels so we never overclaim scientific completeness.

## Status values

| Status | Meaning |
|--------|---------|
| `FULLY_IMPLEMENTED` | Works end-to-end for the current sample release scope |
| `PARTIAL_IMPLEMENTATION` | Functional but incomplete vs long-term platform goals |
| `SCAFFOLD_ONLY` | Structure exists; not safe for players or release |
| `MOCK_SAMPLE_ONLY` | Illustrative sample data with visible labeling |
| `BLOCKED_BY_EXTERNAL_DATA` | Requires external downloads, APIs, licenses, or ingestion |
| `PLANNED_NOT_STARTED` | Documented future work only |
| `DEPRECATED` | Retained for history; not used in release |

## Player-facing vs dev-only

- **Player-facing** systems must not be `SCAFFOLD_ONLY` or `PLANNED_NOT_STARTED` at release.
- **Dev-only** panels (`?dev=1`) may show partial coverage/implementation metrics if mock counts are labeled.

## Mock vs verified data

Mock/sample data may prove pipelines and gameplay, but **never** counts as source-verified scientific coverage.

Release audits enforce:

- `mockSampleCount` tracked separately
- `releaseEligibleCount` only for non-mock, approved sources
- `totalSourceVerified` excludes mock/sample records

## Machine-readable source of truth

- `public/data/status/implementation_status.json`
- `public/data/status/incomplete_inventory.json`
- `public/data/status/release_readiness_report.json`
- `public/data/status/temporal_map_readiness_report.json`
- `public/data/status/production_readiness_report.json`

Regenerate with:

```bash
npm run audit:implementation
npm run audit:release
npm run audit:maps
npm run audit:production  # strict; fails while external scientific data remains incomplete
```
