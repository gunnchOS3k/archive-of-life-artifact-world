"""NASA FIRMS active fire events placeholder."""

MOCK_FIRMS_EVENTS = [
    {
        "latitude": -2.35,
        "longitude": 34.82,
        "brightness": 312.5,
        "confidence": "high",
        "acq_date": "2026-06-28",
        "satellite": "MOCK-VIIRS",
        "frp": 12.5,
        "region": "savanna",
    }
]


def fetch_active_fires(region_bbox: tuple[float, float, float, float] | None = None) -> list[dict]:
    """Placeholder — returns mock FIRMS-style detections."""
    return MOCK_FIRMS_EVENTS
