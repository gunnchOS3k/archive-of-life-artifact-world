"""
Normalize GBIF occurrence summaries into distribution overlay records.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "ingest" / "gbif" / "mock_gbif_sample.json"
EXPORT = ROOT / "exports" / "gbif_normalized_sample.json"


def normalize_gbif(record: dict) -> dict:
    return {
        "speciesId": record.get("species_id") or record.get("taxonKey"),
        "gbifTaxonKey": record.get("taxonKey"),
        "occurrenceSummaries": record.get("summaries", []),
        "representationTier": 2,
        "provenance": {
            "source": "gbif",
            "sourceVersion": record.get("source_version", "mock-sample"),
            "license": "CC-BY-4.0",
            "isMockData": True,
        },
    }


def main() -> None:
    data = json.loads(SAMPLE.read_text())
    records = [normalize_gbif(r) for r in data.get("records", data if isinstance(data, list) else [])]
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps({"records": records}, indent=2))
    print(f"Normalized {len(records)} GBIF records -> {EXPORT}")


if __name__ == "__main__":
    main()
