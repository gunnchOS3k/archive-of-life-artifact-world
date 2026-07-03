"""NASA POWER climate and meteorology placeholder."""

MOCK_POWER_CLIMATE = {
    "savanna": {"T2M": 28.1, "RH2M": 45.0, "ALLSKY_SFC_SW_DWN": 6.9, "WS10M": 4.2},
    "forest": {"T2M": 14.2, "RH2M": 78.0, "ALLSKY_SFC_SW_DWN": 3.9, "WS10M": 1.8},
    "coastal": {"T2M": 12.0, "RH2M": 72.0, "ALLSKY_SFC_SW_DWN": 5.1, "WS10M": 6.8},
}


def fetch_climate(lat: float, lon: float, region_id: str = "savanna") -> dict:
  """Placeholder POWER-style parameters for a location."""
  return MOCK_POWER_CLIMATE.get(region_id, MOCK_POWER_CLIMATE["savanna"])
