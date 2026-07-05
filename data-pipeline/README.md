# Archive Life Pipeline

Python data engineering workflow for Archive of Life — ingestion validation, SQL audits, and snapshot manifests.

## Setup

```bash
npm run pipeline:install
# or: cd data-pipeline && uv sync --all-extras
```

## Commands

| npm script | Action |
|------------|--------|
| `pipeline:install` | `uv sync --all-extras` |
| `pipeline:test` | pytest |
| `pipeline:lint` | ruff check |
| `pipeline:sql` | Run DuckDB SQL pipeline |
| `pipeline:build-snapshot` | Write snapshot manifest |
| `pipeline:audit` | Python pipeline audit |
| `pipeline:all` | install + lint + test + sql + audit |

## Layout

- `src/archive_life_pipeline/` — Python package
- `sql/` — numbered validation SQL (00–09)
- `tests/` — pytest
- `snapshots/` — local large downloads (gitignored)
- `exports/` — scoped extracts and sample_scope
