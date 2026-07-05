"""
Normalize ICS International Chronostratigraphic Chart into GeologicTimeUnit records.
Production: download official ICS chart JSON/XML and map to game schema.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "ingest" / "ics_time_scale" / "mock_ics_sample.json"
EXPORT = ROOT / "exports" / "ics_normalized_sample.json"


def normalize_ics_unit(record: dict) -> dict:
    return {
        "id": record["id"],
        "name": record["name"],
        "rank": record["rank"],
        "parentId": record.get("parent_id"),
        "startMa": record["start_ma"],
        "endMa": record["end_ma"],
        "displayOrder": record.get("display_order", 0),
        "description": record.get("description", ""),
        "majorEvents": record.get("major_events", []),
        "dominantLife": record.get("dominant_life", []),
        "climateSummary": record.get("climate_summary", ""),
        "sourceProvenance": [
            {
                "source": "ics_chronostratigraphic",
                "sourceVersion": record.get("source_version", "ICS-Chart-v2024/12"),
                "sourceRecordId": record["id"],
                "license": "CC-BY-4.0",
                "citation": "International Commission on Stratigraphy",
                "citationRequired": True,
                "isMockData": True,
            }
        ],
    }


def main() -> None:
    data = json.loads(SAMPLE.read_text())
    units = [normalize_ics_unit(u) for u in data.get("units", [])]
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps({"units": units}, indent=2))
    print(f"Normalized {len(units)} ICS units -> {EXPORT}")


if __name__ == "__main__":
    main()
