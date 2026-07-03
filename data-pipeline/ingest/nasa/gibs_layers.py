"""NASA GIBS / Worldview layer metadata placeholder."""

GIBS_LAYERS = {
    "HLS_NDVI": {
        "name": "HLS NDVI",
        "service": "WMS",
        "url": "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/HLS_NDVI",
        "isMockData": True,
    },
    "MODIS_Terra_Thermal_Anomalies": {
        "name": "MODIS Terra Thermal Anomalies",
        "service": "WMS",
        "url": "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/MODIS_Terra_Thermal_Anomalies",
        "isMockData": True,
    },
}


def list_layers() -> dict:
    return GIBS_LAYERS


def get_layer(layer_id: str) -> dict | None:
    return GIBS_LAYERS.get(layer_id)
