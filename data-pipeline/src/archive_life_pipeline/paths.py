from __future__ import annotations

from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PIPELINE_ROOT.parent
PUBLIC_DATA = REPO_ROOT / "public" / "data"
SQL_DIR = PIPELINE_ROOT / "sql"
SNAPSHOTS_DIR = PIPELINE_ROOT / "snapshots"
EXPORTS_DIR = PIPELINE_ROOT / "exports"
COVERAGE_DIR = PUBLIC_DATA / "coverage"
