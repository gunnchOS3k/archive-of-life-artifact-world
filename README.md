# Archive of Life: Artifact World

Educational open-world exploration game — discover life, collect ethical artifacts, and build the Archive of Life with your Lifeling companion.

**v2.0 — Sample release scope.** TypeScript + Vite game with auditable biodiversity data architecture. All current scientific data is **mock/sample labeled** until approved source snapshots are ingested.

## Release status

| Area | Status |
|------|--------|
| **Game** | Fully playable — museum hub, 5 expedition regions, minigames, quests, Lifeling |
| **ArchiveDex** | Partial — 17-tab entries for sample taxa (39 indexed) |
| **Time Atlas** | Partial — ICS sample units with mock banner |
| **Earth Layer Console** | Mock/sample NASA layers with visible banner |
| **Data pipeline** | Partial — Python/uv + SQL validation on sample bundles |
| **Global coverage** | Partial — audits prove sample-scope representation, not global completeness |

Full real-world species coverage requires **approved source snapshot ingestion** (Catalogue of Life, GBIF, IUCN, PBDB, etc.). Mock/sample data is labeled and **not counted** as source-verified coverage.

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
npm run build
npm run pipeline:all
```

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
- [Release readiness checklist](docs/RELEASE_READINESS_CHECKLIST.md)
- [Mock/sample data policy](docs/MOCK_SAMPLE_DATA_POLICY.md)
- [Global coverage matrix](docs/GLOBAL_COVERAGE_MATRIX.md)
- [Data architecture](docs/DATA_ARCHITECTURE.md)
- [ArchiveDex](docs/ARCHIVEDEX_SPECIES_ENTRY_SYSTEM.md)
- [Time Atlas](docs/TIME_ATLAS_ARCHITECTURE.md)

---

*Educational prototype — not affiliated with any creature-collection franchise.*
