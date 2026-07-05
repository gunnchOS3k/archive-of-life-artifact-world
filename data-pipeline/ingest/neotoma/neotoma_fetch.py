"""Neotoma paleoecology API ingestion placeholder."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ingest" / "neotoma" / "mock_neotoma_sample.json"


def fetch_neotoma_records(site_ids: list[str] | None = None) -> dict:
    """Production: query https://api.neotomadb.org/ with site/taxon filters."""
    return json.loads(OUT.read_text())


if __name__ == "__main__":
    print(json.dumps(fetch_neotoma_records(), indent=2))
