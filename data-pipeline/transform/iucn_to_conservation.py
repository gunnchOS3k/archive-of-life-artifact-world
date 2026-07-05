"""
Normalize IUCN Red List assessments into conservation overlay records.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "ingest" / "iucn" / "mock_iucn_sample.json"
EXPORT = ROOT / "exports" / "iucn_normalized_sample.json"


def normalize_iucn(record: dict) -> dict:
    return {
        "speciesId": record.get("species_id") or record.get("taxonid"),
        "iucnCategory": record.get("category"),
        "assessed": True,
        "isThreatened": record.get("category") in ("VU", "EN", "CR", "Vulnerable", "Endangered", "Critically Endangered"),
        "provenance": {
            "source": "iucn",
            "sourceVersion": record.get("source_version", "mock-sample"),
            "iucnTaxonId": record.get("taxonid"),
            "license": "IUCN-TOS",
            "isMockData": True,
        },
    }


def main() -> None:
    data = json.loads(SAMPLE.read_text())
    records = [normalize_iucn(r) for r in data.get("records", data if isinstance(data, list) else [])]
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps({"records": records}, indent=2))
    print(f"Normalized {len(records)} IUCN records -> {EXPORT}")


if __name__ == "__main__":
    main()
