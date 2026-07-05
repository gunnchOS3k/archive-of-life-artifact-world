"""ICS International Chronostratigraphic Chart ingestion placeholder."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ingest" / "ics_time_scale" / "mock_ics_sample.json"


def fetch_ics_chart() -> dict:
    """Production: parse official ICS chart from stratigraphy.org or distributed JSON."""
    return json.loads(OUT.read_text())


if __name__ == "__main__":
    print(json.dumps(fetch_ics_chart(), indent=2))
