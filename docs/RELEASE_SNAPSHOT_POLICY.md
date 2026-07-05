# Release snapshot policy

Each production release ships a **release snapshot** tying game build, data bundles, and audit state together.

## Release snapshot contents

| Component | Location / format |
|-----------|-------------------|
| Game version | `package.json` version + git tag |
| Data snapshot ID | `public/data/manifest.json` → `snapshotId` |
| Source snapshot IDs | `public/data/coverage/source_snapshots.json` |
| Bundle checksums | Pipeline manifest / CI artifact |
| Audit summary | CI logs + `gap_report.json` |
| Mock/sample count | Coverage dashboard / bias report |
| Coverage report | `npm run audit:coverage` output |
| Known gaps | `public/data/coverage/gap_report.json` |
| Build hash | Git commit SHA from CI |

## Release gates (blocking)

Build/release fails when:

- ArchiveDex entry lacks source provenance
- Tier 4+ record lacks artifact templates
- Tier 6 record lacks minimum educational sections
- Playable biome lacks species, artifacts, learning objective, and source
- Playable time gate lacks taxa/evidence or justified pre-life explanation
- Mock/sample data counted as real complete coverage
- Frontend loads full global catalogue into memory

Run `npm run audit:coverage` and `npm run audit:archivedex` before tagging.

## Snapshot promotion

1. Ingest and validate sources (`pipeline:all`)
2. Regenerate bundles and Time Atlas
3. Run full audit suite + `report:coverage`
4. Record snapshot IDs in release notes
5. Tag release with game version + data snapshot ID
