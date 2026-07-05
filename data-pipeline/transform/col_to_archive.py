"""
Normalize Catalogue of Life taxonomy snapshots into ArchiveSpecies / index entries.
Run after ingest: python -m data-pipeline.transform.col_to_archive
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "ingest" / "catalogue_of_life" / "mock_col_sample.json"
EXPORT = ROOT / "exports" / "col_normalized_sample.json"


def normalize_col_record(record: dict) -> dict:
    """Map COL accepted name record to minimal Archive index shape (tier 0–1)."""
    return {
        "id": record.get("col_id") or record.get("id"),
        "commonName": record.get("common_name") or record.get("scientific_name"),
        "scientificName": record.get("scientific_name"),
        "group": record.get("group", "Unknown"),
        "representationTier": 1,
        "lifeStatus": "extant",
        "sources": ["catalogue_of_life"],
        "provenance": [
            {
                "source": "catalogue_of_life",
                "sourceVersion": record.get("source_version", "mock-sample"),
                "catalogueOfLifeId": record.get("col_id"),
                "license": "CC-BY-4.0",
                "citation": "Catalogue of Life — mock sample",
                "citationRequired": True,
                "isMockData": True,
            }
        ],
    }


def main() -> None:
    data = json.loads(SAMPLE.read_text())
    records = [normalize_col_record(r) for r in data.get("records", data if isinstance(data, list) else [])]
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps({"records": records}, indent=2))
    print(f"Normalized {len(records)} COL records -> {EXPORT}")


if __name__ == "__main__":
    main()
