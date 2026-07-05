# Data quality and uncertainty

Scientific representation requires explicit quality status and uncertainty notes.

## Quality statuses

| Status | Use when |
|--------|----------|
| `verified` | Multiple authoritative sources agree |
| `sample` | Curated prototype scope |
| `mock` | Explicit mock/sample data |
| `partial` | Incomplete mapping |
| `uncertain` | Competing interpretations |
| `source_unavailable` | License or access blocked |

## Uncertainty notes

Required when:

- Pre-life or Hadean reconstructions
- Ediacaran body-plan ambiguity
- Fossil range endpoints approximate
- Biome assignment inferred from region proxy

Time gates and taxon ranges store `uncertaintyNotes` in Time Atlas bundles.

## Audit integration

- Mock records cannot satisfy release gates for “complete” coverage
- Tier 3+ taxa without time mapping generate gap items
- Tier 2+ without place mapping generate gap items

## Dashboard

Coverage Dashboard shows mock/sample count separately from provenance-complete taxa.
