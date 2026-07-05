"""
Normalize Neotoma paleoecology records into late Quaternary occurrence overlays.
Placeholder — requires Neotoma API credentials for production use.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "ingest" / "neotoma" / "mock_neotoma_sample.json"
EXPORT = ROOT / "exports" / "neotoma_normalized_sample.json"


def normalize_neotoma(record: dict) -> dict:
    return {
        "taxonId": record.get("taxon_id"),
        "siteName": record.get("site_name"),
        "ageRangeKa": record.get("age_range_ka"),
        "timeUnitIds": record.get("time_unit_ids", ["pleistocene", "holocene"]),
        "provenance": {
            "source": "neotoma",
            "sourceVersion": record.get("source_version", "mock-sample"),
            "license": "CC-BY-4.0",
            "isMockData": True,
        },
    }


def main() -> None:
    data = json.loads(SAMPLE.read_text())
    records = [normalize_neotoma(r) for r in data.get("records", [])]
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps({"records": records}, indent=2))
    print(f"Normalized {len(records)} Neotoma records -> {EXPORT}")


if __name__ == "__main__":
    main()
