# Data Reconciliation Policy

When scientific providers disagree, Archive of Life must not silently collapse conflicting assertions.

## Rules

1. **Preserve all provider assertions** for the same field (name, range, status, occurrence count).
2. **Mark the in-game interpretation** with `selectedProviderId` and `selectionReason`.
3. **Show uncertainty** in the Sources and Evidence panel when confidence differs.
4. **Domain-specific priority** — not one global hierarchy:
   - Taxonomy: COL → GBIF taxonomy → WoRMS (marine)
   - Modern occurrence: GBIF, iNaturalist (with quality flags)
   - Paleontology: PBDB, Neotoma, Smithsonian where licensed
   - Environmental layers: NASA, NOAA, USGS by layer type
   - Marine: OBIS + WoRMS
5. **Reconstructions** must use `interpretation: reconstructed` and display a learner-facing notice.
6. **Never strip attribution** when normalizing records (`FederatedRecord` schema).

## Implementation

- `src/services/providers/types.ts` — `ProviderConflict` type
- `FederationService.buildConflictNotice()` — UI hook
- Game-facing copy defaults to conservative wording when conflicts exist

## Configuration

Provider priority tables will live in `docs/data/DATA_SOURCE_REGISTRY.md` and future `provider-priority.json` once live adapters are verified.
