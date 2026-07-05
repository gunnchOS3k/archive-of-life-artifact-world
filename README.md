# Archive of Life: Artifact World

Educational open-world exploration game — discover life, collect ethical artifacts, and build the Archive of Life with your Lifeling companion.

# Real Data Completion Pass — local systems are fully implemented for the **current verified snapshot scope**. Global scientific completeness still requires source snapshot imports.

## Release status

| Area | Status |
|------|--------|
| **Game** | Fully playable — museum hub, 5 expedition regions, minigames, quests, Lifeling |
| **ArchiveDex** | Fully implemented (17 tabs, provenance classes) — sample taxa only |
| **Time Atlas** | Fully implemented (ICS sample, gates, uncertainty) — live ICS via import workflow |
| **Earth Layer Console** | Metadata adapters + mode badges — run `source:import:nasa` for real cache |
| **Coverage Dashboard** | Fully implemented (dev/admin) — mock vs verified labeled |
| **Data pipeline** | Fully implemented — Python CLI, SQL validation, source import commands |
| **External sources** | Blocked until snapshots configured — see [Source ingestion runbook](docs/SOURCE_INGESTION_RUNBOOK.md) |

Game-authored content uses `game_authored_verified` provenance. Scientific fields from mock/sample sources are labeled and **not counted** as source-verified coverage.

## Quick start

```bash
npm install
npm run generate:time-atlas
npm run generate:bundles
npm run dev                # http://localhost:5173
```

Dev/admin dashboards: append `?dev=1` — keys **G** (Coverage), **I** (Implementation Status).

## Verify everything

```bash
npm run typecheck
npm run audit:data
npm run audit:coverage
npm run audit:archivedex
npm run audit:implementation
npm run audit:release
npm run source:validate
npm run source:audit
npm run build
npm run pipeline:all
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
| `npm run audit:data` | Data integrity + mock/verified counts |
| `npm run audit:coverage` | Global coverage matrix (45 checks) |
| `npm run audit:archivedex` | ArchiveDex integrity |
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

---

*Educational prototype — not affiliated with any creature-collection franchise.*
