# Mock and sample data policy

## Purpose

Mock and sample data supports prototyping, pipeline validation, and gameplay demonstration. It is **never** equivalent to approved source snapshots.

## Labeling requirements

Every mock/sample record must be identifiable via one or more of:

- `isMockData: true` on provenance records
- `mock_sample` in index `sources`
- `MOCK-SAMPLE` license label
- Visible UI badges (`MOCK SAMPLE`, `MOCK NASA SAMPLE DATA`, etc.)
- Source snapshot registry: `isMockData: true`, `approvedForUse: false`

## Audit counts

Audits report separately:

| Field | Meaning |
|-------|---------|
| `totalIncludingMock` | All indexed taxa |
| `mockSampleCount` | Records flagged as mock/sample |
| `totalSourceVerified` | Non-mock records with real source linkage |
| `releaseEligibleCount` | Approved for release completeness claims |
| `blockedExternalDataCount` | Source snapshots not yet ingested |

## Rules

1. Mock data **cannot** satisfy release gates for “complete” coverage.
2. Dashboards must label mock metrics — never silently merge with verified counts.
3. Sample bundle generators (`generate:bundles`, `generate:time-atlas`) intentionally produce mock provenance.
4. Promoting to production requires new snapshots with `approvedForUse: true` and non-mock provenance.

## Verification

```bash
npm run audit:data
npm run audit:coverage
npm run audit:release
```
