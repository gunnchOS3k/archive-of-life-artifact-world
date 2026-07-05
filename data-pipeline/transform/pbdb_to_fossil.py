"""
Normalize Paleobiology Database taxa into fossil profiles and TaxonTimeRange entries.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "ingest" / "paleobiodb" / "mock_pbdb_sample.json"
EXPORT = ROOT / "exports" / "pbdb_normalized_sample.json"


def normalize_pbdb(record: dict) -> dict:
    return {
        "taxonId": record.get("taxon_id") or str(record.get("taxon_no")),
        "acceptedName": record.get("accepted_name"),
        "rank": record.get("rank", "species"),
        "firstAppearanceMa": record.get("first_ma"),
        "lastAppearanceMa": record.get("last_ma"),
        "timeUnitIds": record.get("time_unit_ids", []),
        "lifeStatus": "extinct",
        "paleobiodbTaxonNo": record.get("taxon_no"),
        "representationTier": 3,
        "provenance": {
            "source": "paleobiodb",
            "sourceVersion": record.get("source_version", "mock-sample"),
            "license": "CC-BY-4.0",
            "isMockData": True,
        },
    }


def main() -> None:
    data = json.loads(SAMPLE.read_text())
    records = [normalize_pbdb(r) for r in data.get("records", data if isinstance(data, list) else [])]
    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(json.dumps({"records": records}, indent=2))
    print(f"Normalized {len(records)} PBDB records -> {EXPORT}")


if __name__ == "__main__":
    main()
