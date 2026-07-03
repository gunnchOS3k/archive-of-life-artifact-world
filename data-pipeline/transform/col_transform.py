"""Transform mock Catalogue of Life sample into normalized ArchiveSpecies records."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MOCK = ROOT / "data-pipeline" / "ingest" / "catalogue_of_life" / "mock_col_sample.json"
OUT = ROOT / "data-pipeline" / "exports"


def transform():
    if not MOCK.exists():
        print(f"No mock input at {MOCK}")
        return
    data = json.loads(MOCK.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    out_path = OUT / "col_normalized_sample.json"
    out_path.write_text(json.dumps({"source": "catalogue_of_life", "records": data}, indent=2))
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    transform()
