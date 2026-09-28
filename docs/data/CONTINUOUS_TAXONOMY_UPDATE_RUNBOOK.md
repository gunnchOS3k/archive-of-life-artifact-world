# Continuous Taxonomy Update Runbook

## Supported operations

`ADD` · `UPDATE` · `DELETE`/`TOMBSTONE` · `SYNONYM_CHANGE` · `LINEAGE_CHANGE` · `SOURCE_WITHDRAWAL`

## Equivalence requirement

```text
snapshot A + deterministic delta  ==  full rebuild of snapshot B
```

## Downstream invalidation

- search bootstrap + partitions
- offline packs that include touched taxa
- coverage / conflict ledgers

## Rollback

Retain prior snapshot set + checksums. Rollback restores snapshot A and regenerates invalidated indexes/packs.
