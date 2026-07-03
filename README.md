# Archive of Life: Artifact World

Educational open-world exploration game — discover life, collect ethical artifacts, build the Archive of Life with your Lifeling companion.

**v2.0** — TypeScript + Vite architecture with scalable biodiversity data bundles, IndexedDB caching, schema validation, and pipeline scaffolding.

## Quick Start

```bash
npm install
npm run generate:bundles   # Build public/data bundles from legacy MVP JSON
npm run dev                # http://localhost:8080
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run generate:bundles` | Transform `data/` → `public/data/bundles/` |
| `npm run audit:data` | Coverage and integrity audit |

Press **T** in-game to open the **Earth Layer Console** (museum hub) — NASA environmental context layers.

## Architecture

```
src/
  schema/          TypeScript types (ArchiveSpecies, provenance, etc.)
  services/        DataCatalogService, IndexedDBCache
  game/            Player, World, Lifeling, Game loop
  systems/         Artifacts, quests, save
  ui/              Archive (paginated), notebook, map, companion, quests
  minigames/       Fossil excavation, wildlife observation
public/data/
  manifest.json    Bundle registry + coverage stats
  bundles/         Generated species, index, region data
data-pipeline/     Python ingestion scaffolding
docs/              Data architecture, DB plan, provenance policy
data/              Legacy MVP source JSON (used by generate:bundles)
```

## Data Loading

The game loads from `public/data/manifest.json` — **not** the full catalogue at once:

1. Manifest + search index + game config on startup
2. Region bundle when entering a biome
3. Species detail lazy-loaded on Archive card click
4. IndexedDB caches bundles; invalidated on snapshot change

## Controls

WASD/Arrows move · E interact · A/N/M/C/Q menus · Escape close panels

## Design Pillars

- **Wonder** — Every creature deserves attention
- **Accuracy** — Scientifically grounded with provenance
- **Respect** — Ethical artifacts, no capture
- **Exploration** — The world is the classroom
- **Conservation** — Learning creates responsibility

## Documentation

- [Data Architecture](docs/DATA_ARCHITECTURE.md)
- [NASA Earth Systems Integration](docs/NASA_EARTH_SYSTEMS_INTEGRATION.md)
- [Database Integration Plan](docs/DATABASE_INTEGRATION_PLAN.md)
- [Source Provenance Policy](docs/SOURCE_PROVENANCE_POLICY.md)

---

*Original educational prototype — not affiliated with any creature-collection franchise.*
