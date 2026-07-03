"""NASA HLS vegetation / land surface change placeholder."""

MOCK_HLS_SCENES = {
    "savanna": {"ndvi_mean": 0.42, "scene_date": "2026-06-15", "trend": "decreasing"},
    "forest": {"ndvi_mean": 0.78, "scene_date": "2026-06-20", "trend": "stable"},
    "wetland": {"ndvi_mean": 0.65, "scene_date": "2026-06-18", "trend": "increasing"},
}


def fetch_ndvi_summary(region_id: str) -> dict:
    return MOCK_HLS_SCENES.get(region_id, {"ndvi_mean": 0.5, "scene_date": "2026-06-01", "trend": "stable"})
