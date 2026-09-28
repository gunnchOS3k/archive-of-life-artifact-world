# Global Knowledge Ingestion Architecture

Archive of Life aims to represent every scientifically catalogued taxon across Earth's known biological history while explicitly representing uncertainty, disputed taxonomy, incomplete fossil evidence, and gaps in the scientific record.

## Pipeline

```text
RAW APPROVED SOURCE SNAPSHOTS
        ↓
streaming/chunk ingestion (`archive-pipeline bulk-import`)
        ↓
normalized source records + durable checkpoints
        ↓
identity + synonym graph
        ↓
canonical taxon reconciliation
        ↓
versioned scientific snapshot set + checksum chain
        ↓
coverage + quality gates
        ↓
partitioned search index + offline packs
        ↓
ArchiveDex / Time Atlas / gameplay
```

## Commands

```bash
archive-pipeline bulk-import <source|all> \
  --input PATH \
  --snapshot-id ID \
  --source-version VER \
  --chunk-size N \
  --resume \
  --checkpoint-dir DIR \
  --output-dir DIR \
  --max-records N \
  --dry-run

archive-pipeline run-global-ingestion-program [--skip-scale] [--scale-tiers 100000,1000000,5000000]
```

## Honesty firewall

- Must not claim catalogue-scale scientific completeness without an approved declared snapshot set.
- Forbidden completeness tokens remain false unless authentic evidence exists.
- Synthetic scale fixtures are labeled and never count as source-verified science.
- Conflicts remain evidence; disputed fields are not fabricated.
- Raw multi-GB snapshots are never committed to Git.
