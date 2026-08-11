# archive-of-life-artifact-world

Educational open-world exploration — discover life, collect ethical artifacts, build the Archive with a Lifeling companion.

> **Current release/state:** `INTEGRATED` playable game loop — scientific bundles are **sample/mock-labeled** until external sources verify.

Ecosystem portal: [gunnchos-research-portal](https://github.com/gunnchOS3k/gunnchos-research-portal) · Product charter: [gunnchOS3k_PRODUCT_CHARTER.md](https://github.com/gunnchOS3k/gunnchos-7gc-ai-ran-field-kit/blob/main/program/charter/gunnchOS3k_PRODUCT_CHARTER.md)

## What is this?

Web/game client + data pipeline for Archive of Life / Artifact World with provenance-aware science layers.

## Why does it exist?

Learning-through-exploration game that respects scientific provenance and does not fake Earth coverage.

## Where does it fit?

Product Charter **layer 9**. Lab packaging optional; strict production science gates intentionally fail until imports verify.

## What is real today?

- Playable museum hub, regions, minigames, ArchiveDex/Time Atlas implementations
- `npm run dev` + audit scripts
- Provenance classes separating game-authored vs mock vs verified

## What is simulated / modelled?

- Sample taxa / ICS sample / mock regional measurements
- Full-Earth temporal maps indexed but 0/17 source-verified until imports

## What is physical / external pending?

- External source snapshots (NASA/COL/etc.) and production science audits
- Device Lab production-runtime earn where applicable

## Try / inspect in 5 minutes

```bash
npm install
npm run generate:time-atlas && npm run generate:bundles && npm run generate:maps
npm run dev   # http://localhost:5173
```

## Architecture

`src/` game/UI; `data-pipeline/` Python; `public/data/` bundles with mock-vs-verified labels.

## Repo map

| Path | Role |
|---|---|
| `src/` | Game client |
| `data-pipeline/` | Import/audit CLI |
| `public/data/` | Bundles + status JSON |
| `docs/` | Ingestion runbooks |

## Interfaces

npm audit/import scripts; optional Lab packaging. No claim of full-Earth verified science today.

## Tests

```bash
npm run typecheck
npm run audit:data audit:coverage audit:release
npm run build
```

## Evidence

Coverage/implementation audit JSON under `public/data/status/` — read labels carefully.

## Known gaps

External verified science imports; production audit green; Lab runtime tokens.

## Beginner path

Explore, collect, learn — treat science badges as labeled honesty, not magic completeness.

## Intern path

Run audits; explain one mock vs verified field.

## Expert path

Source ingestion runbook; keep production gates strict.

## Contribution path

Gameplay + honest data pipeline. Never strip mock labels to fake coverage.

## Current release / state

**INTEGRATED** gameplay · science **sample/external-pending**. `game_repo_not_lab_runtime_proof`.

## Claim boundary

No commercial 6G · mock science ≠ verified Earth · Cursor DRAFT-only.

---

## Retained detail (post–Cycle 3A front door)

Full prior README: [docs/history/README_PRE_WP012.md](docs/history/README_PRE_WP012.md).

See [docs/SOURCE_INGESTION_RUNBOOK.md](docs/SOURCE_INGESTION_RUNBOOK.md) and [docs/EXTERNAL_DATA_REQUIREMENTS.md](docs/EXTERNAL_DATA_REQUIREMENTS.md).
