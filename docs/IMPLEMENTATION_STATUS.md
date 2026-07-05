# Implementation status

Current snapshot classification for Archive of Life: Artifact World.

> Regenerate: `npm run audit:implementation` → `public/data/status/implementation_status.json`

## Summary (sample release v2.0)

| Category | Count | Notes |
|----------|------:|-------|
| Fully implemented | 17 | Core game loop, museum, regions, minigames, quests, CI, audits, implementation dashboard |
| Partial implementation | 6 | ArchiveDex, Time Atlas, coverage matrix, Python/SQL pipeline |
| Mock/sample only | 2 | Earth Layer Console, provenance layer (all `isMockData`) |
| Blocked by external data | 4 | Full COL/GBIF/IUCN/PBDB/NASA/Neotoma ingestion |
| Scaffold only | 0 | None in player-facing paths |
| Planned not started | 0 | None in player-facing paths |

## Player-facing systems

| System | Status | Safe for players? |
|--------|--------|-----------------|
| Game loop, museum, regions, artifacts, Lifeling | FULLY_IMPLEMENTED | Yes |
| ArchiveDex | PARTIAL_IMPLEMENTATION | Yes — sample taxa only |
| Time Atlas | PARTIAL_IMPLEMENTATION | Yes — mock banner shown |
| Earth Layer Console | MOCK_SAMPLE_ONLY | Yes — mock banner shown |
| Quests, map, notebook | FULLY_IMPLEMENTED | Yes |

## Dev/admin only (`?dev=1`)

| System | Status |
|--------|--------|
| Coverage Dashboard | PARTIAL_IMPLEMENTATION |
| Implementation Status Dashboard | FULLY_IMPLEMENTED |

## Blocked external work (not release-blocking)

- Catalogue of Life full snapshot ingestion
- GBIF / IUCN / PBDB production downloads
- NASA Earthdata live layer fetch
- Neotoma paleoecology API integration

See `docs/RELEASE_READINESS_CHECKLIST.md` and `npm run audit:release`.
