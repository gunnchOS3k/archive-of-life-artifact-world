# Representation audit policy

Audits prove whether Archive of Life meets its scientific representation commitments.

## Audit commands

| Command | Scope |
|---------|-------|
| `npm run audit:coverage` | Full orchestrator + release gates |
| `npm run audit:species` | Taxon identity, COL/IUCN scope, mock flags |
| `npm run audit:time` | ICS units, gates, PBDB ranges, Holocene mapping |
| `npm run audit:biomes` | Playable biomes, realm registry |
| `npm run audit:earth` | Continents, oceans, expedition zones |
| `npm run audit:provenance` | Source snapshots, hero provenance |
| `npm run audit:bias` | Taxonomic balance warnings |
| `npm run report:coverage` | Writes gap + bias JSON |

Python SQL validation: `npm run pipeline:sql`

## Gap severity

- **critical** — blocks release (missing provenance on Tier 4+, etc.)
- **high** — major representation hole
- **medium** — partial mapping
- **low / info** — documented uncertainty or scaffold gap

## Mock data rule

Records with `mock_sample` source or `isMockData` provenance are excluded from “source-complete” counts.

## CI

GitHub Actions runs all TypeScript audits plus Python lint/test/SQLFluff on every PR.
