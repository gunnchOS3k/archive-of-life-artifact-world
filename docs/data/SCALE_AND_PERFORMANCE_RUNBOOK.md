# Scale and Performance Runbook

## Synthetic tiers (engineering only)

Required: 100,000 · 1,000,000 · 5,000,000  
Optional: 10,000,000 if runner resources safely allow.

```bash
cd data-pipeline
uv run archive-pipeline run-global-ingestion-program --scale-tiers 100000,1000000,5000000
```

Synthetic datasets are written under `artifacts/global_ingestion/_work/` (gitignored patterns / temp) and must never be labeled as real science.

## Metrics

ingest throughput · peak memory · normalization · dedupe · reconciliation · science DB build · index build · search p50/p95 · offline-pack generation · artifact sizes

## Capacity-limited 5M

If hardware cannot safely complete 5M, report `runner_capacity_limited=true`. Do **not** misclassify that as missing scientific data.
