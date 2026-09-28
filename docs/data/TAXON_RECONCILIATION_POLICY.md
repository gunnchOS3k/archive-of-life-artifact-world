# Taxon Reconciliation Policy

## Canonical entity fields

`archive_taxon_id`, `accepted_name`, `rank`, `authorship`, `lineage`, `life_status`, `source_ids[]`, `synonyms[]`, `temporal_range`, `place_summary`, `provenance[]`, `confidence`, `reconciliation_status`

## Statuses

- `SOURCE_VERIFIED` — single non-mock source assertion
- `MULTI_SOURCE_CORROBORATED` — ≥2 sources agree
- `DERIVED_INFERRED` — explicit derivation (rare; must be labeled)
- `DISPUTED` — sources disagree on material fields
- `UNCERTAIN` — weak / incomplete evidence
- `HISTORICAL_CLASSIFICATION` — historical name retained with provenance
- `INSUFFICIENT_EVIDENCE` — cannot form a canonical claim

## Hard rule

Never fabricate a consensus value when sources disagree. Emit unresolved conflicts for human scientific review.
