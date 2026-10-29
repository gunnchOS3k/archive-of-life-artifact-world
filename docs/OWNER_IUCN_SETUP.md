# Owner setup — IUCN Red List (gated)

IUCN is **not** a public no-credential source. The adapter and import path exist; production remains blocked until authorized.

## Steps

1. Request IUCN Red List API access under **IUCN terms of use** (do not assume CC-BY).
2. Confirm redistribution / in-game display rights with a human rights reviewer.
3. Place the token only in `data-pipeline/.env` as `IUCN_API_TOKEN=…` — **never commit** the token.
4. Run:
   - `npm run source:import:iucn`
   - `npm run source:audit`
   - `npm run audit:production`
5. Keep `production_readiness_report.ready=false` until:
   - `verified_record_count > 0`
   - `data_mode === "source_verified"` after human review
   - Hero `conservation.assessed` only when assessments are truly source-verified
6. Do **not** promote quarantined mock IUCN category labels to `source_verified` or `assessed=true`.

## Honesty invariants

- `iucnAssessed` / source-verified assessment count stays `0` without an approved import.
- Mock / gameplay category labels remain `mock_sample` or quarantined.
- Adapter presence ≠ live verified integration.
