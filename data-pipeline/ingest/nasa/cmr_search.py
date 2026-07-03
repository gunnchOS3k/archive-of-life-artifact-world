"""NASA CMR (Common Metadata Repository) search placeholder.

Future: query Earthdata CMR for granule metadata by collection, bbox, and time.
No API key required for public CMR search; Earthdata Login needed for download.
"""

from __future__ import annotations

import json
from pathlib import Path

MOCK_CMR_RESULTS = [
    {
        "concept_id": "MOCK-C1234567890-EOS",
        "title": "HLS Sentinel-2 NDVI — mock granule",
        "collection": "HLS",
        "time_start": "2026-06-15T00:00:00Z",
        "time_end": "2026-06-15T23:59:59Z",
    }
]


def search_collections(short_name: str, limit: int = 10) -> list[dict]:
    """Placeholder CMR collection search."""
    return [r for r in MOCK_CMR_RESULTS if short_name.lower() in r["collection"].lower()][:limit]


def export_mock(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"results": MOCK_CMR_RESULTS}, indent=2))
    print(f"Wrote mock CMR export to {path}")


if __name__ == "__main__":
    export_mock(Path(__file__).resolve().parents[2] / "exports" / "mock_cmr_search.json")
