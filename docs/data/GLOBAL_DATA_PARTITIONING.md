# Global Data Partitioning

## Tiers

| Tier | Purpose | Shipped in Android/web release? |
|---|---|---|
| HOT | Current user / expedition / hero taxa | Yes (bounded) |
| WARM | Offline lessons, regions, recent packs | Yes (bounded, optional packs) |
| COLD | Global archive / source warehouse | No — external/local warehouse only |

## Pack axes

region · biome · taxonomic group · geologic interval · course/lesson · favorites · expedition · hero taxa

## Tradeoffs

- HOT prioritizes first interaction latency and memory on device.
- WARM balances offline utility against download size; packs carry SHA-256 + license manifests.
- COLD holds catalogue-scale corpora and official source snapshots outside release artifacts.
- The global corpus must never be accidentally bundled into Android/web release packages.
- Delta/update metadata on pack manifests supports replace-pack updates without full corpus reship.

See `artifacts/global_ingestion/OFFLINE_PACK_MATRIX.json` and `PARTITION_BENCHMARK.json`.
