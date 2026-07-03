"""NASA EONET natural event metadata placeholder."""

MOCK_EONET_EVENTS = [
    {
        "id": "MOCK-EONET-001",
        "title": "Savanna dry-season dust plume",
        "categories": [{"title": "Dust and Haze"}],
        "date": "2026-06-28",
        "region": "savanna",
    },
    {
        "id": "MOCK-EONET-003",
        "title": "Coastal phytoplankton bloom",
        "categories": [{"title": "Water Color"}],
        "date": "2026-06-25",
        "region": "coastal",
    },
]


def fetch_open_events() -> list[dict]:
    return MOCK_EONET_EVENTS
