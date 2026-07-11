# Archive of Life: Artifact World

Educational open-world exploration game — discover life, collect ethical artifacts, and build the Archive of Life with your Lifeling companion.

## Data readiness

The game loop is playable, but the current scientific bundles are a labeled sample release. The strict production gate intentionally fails until external source snapshots, regional NASA measurements, and all full-Earth temporal maps are imported and verified.

## Release status

| Area | Status |
|------|--------|
| **Game** | Fully playable — museum hub, 5 expedition regions, minigames, quests, Lifeling |
| **ArchiveDex** | Fully implemented (17 tabs, provenance classes) — sample taxa only |
| **Time Atlas** | Fully implemented (ICS sample, gates, uncertainty) — live ICS via import workflow |
| **Full-Earth temporal maps** | 648-cell global coverage index + 17 gate requirements; 0/17 source-verified assets |
| **Earth Layer Console** | Real metadata cache is separated from sample regional measurements |
| **Coverage Dashboard** | Fully implemented (dev/admin) — mock vs verified labeled |
| **Data pipeline** | Fully implemented — Python CLI, SQL validation, source import commands |
| **External sources** | Blocked until snapshots configured — see [Source ingestion runbook](docs/SOURCE_INGESTION_RUNBOOK.md) |

Game-authored content uses `game_authored_verified` provenance. Scientific fields from mock/sample sources are labeled and **not counted** as source-verified coverage.

## Quick start

```bash
npm install
npm run generate:time-atlas
npm run generate:bundles
npm run generate:maps
npm run dev                # http://localhost:5173
```

Dev/admin dashboards: append `?dev=1` — keys **G** (Coverage), **I** (Implementation Status).

## Verify everything

```bash
npm run typecheck
npm run audit:data
npm run audit:coverage
npm run audit:archivedex
npm run audit:maps
npm run audit:implementation
npm run audit:release
npm run source:validate
npm run source:audit
npm run build
npm run pipeline:all
```

Strict scientific release checks (currently expected to report external-data blockers):

```bash
npm run audit:maps:production
npm run audit:production
```

## Complete external data imports

1. Copy `data-pipeline/.env.example` → `data-pipeline/.env`
2. Configure snapshot paths / API tokens (see [External data requirements](docs/EXTERNAL_DATA_REQUIREMENTS.md))
3. Run imports:

```bash
npm run source:import:nasa    # public APIs — no token required
npm run source:import:col     # requires COL_SNAPSHOT_PATH
npm run source:audit
```

Blocked sources fail with actionable messages and next commands.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run generate:bundles` | Build `public/data/bundles/` |
| `npm run generate:time-atlas` | Build Time Atlas bundles |
| `npm run generate:maps` | Build full-Earth grid and synchronize 17 map requirements |
| `npm run audit:data` | Data integrity + mock/verified counts |
| `npm run audit:coverage` | Global coverage matrix (45 checks) |
| `npm run audit:archivedex` | ArchiveDex integrity |
| `npm run audit:maps` | Full-Earth grid, per-gate map, asset, checksum, and provenance integrity |
| `npm run audit:production` | Strict non-mock scientific production readiness |
| `npm run audit:implementation` | Implementation status JSON |
| `npm run audit:release` | Release readiness gates |
| `npm run source:list` | List external source import status |
| `npm run source:validate` | Validate source env configuration |
| `npm run source:audit` | Write source readiness JSON reports |
| `npm run source:import:nasa` | Fetch/cache NASA public metadata |
| `npm run source:import:col` | Import Catalogue of Life snapshot |
| `npm run pipeline:all` | Python lint, test, SQL, audit |

## Architecture

```
src/               Game, UI, services, coverage, schemas
public/data/       Manifest, bundles, time, earth, coverage, status
data-pipeline/     Python/uv ingestion validation (sample scope)
scripts/           Generators and audits
docs/              Architecture, provenance, release policies
```

## Controls

WASD/Arrows move · E interact · A/N/M/C/Q/T/Y menus · Escape close panels

## Documentation

- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Real data completion plan](docs/REAL_DATA_COMPLETION_PLAN.md)
- [Source ingestion runbook](docs/SOURCE_INGESTION_RUNBOOK.md)
- [External data requirements](docs/EXTERNAL_DATA_REQUIREMENTS.md)
- [Release readiness checklist](docs/RELEASE_READINESS_CHECKLIST.md)
- [Mock/sample data policy](docs/MOCK_SAMPLE_DATA_POLICY.md)
- [Global coverage matrix](docs/GLOBAL_COVERAGE_MATRIX.md)
- [Data architecture](docs/DATA_ARCHITECTURE.md)
- [ArchiveDex](docs/ARCHIVEDEX_SPECIES_ENTRY_SYSTEM.md)
- [Time Atlas](docs/TIME_ATLAS_ARCHITECTURE.md)
- [Full-Earth temporal maps](docs/TEMPORAL_EARTH_MAPS.md)

---

*Independent educational exploration game — not affiliated with any creature-collection franchise.*
