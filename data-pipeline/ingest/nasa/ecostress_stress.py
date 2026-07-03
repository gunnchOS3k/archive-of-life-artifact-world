"""NASA ECOSTRESS plant water stress placeholder."""

MOCK_ECOSTRESS = {
    "savanna": {"lst_c": 38.2, "et_stress": 0.72, "alert": True},
    "forest": {"lst_c": 22.1, "et_stress": 0.18, "alert": False},
    "fossil_site": {"lst_c": 41.0, "et_stress": 0.85, "alert": True},
}


def fetch_stress_summary(region_id: str) -> dict:
    return MOCK_ECOSTRESS.get(region_id, {"lst_c": 25.0, "et_stress": 0.3, "alert": False})
