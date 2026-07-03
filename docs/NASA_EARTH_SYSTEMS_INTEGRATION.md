# NASA Earth Systems Integration

Archive of Life uses **NASA Earth observation data as the environmental and planetary context layer**. NASA does not replace biodiversity authority sources — Catalogue of Life, GBIF, IUCN, and Paleobiology Database remain the taxonomic, occurrence, conservation, and fossil record layers.

NASA answers: *What is happening on Earth right now that shapes where life can survive?*

## Role in the Game Stack

```
┌─────────────────────────────────────────────────────────┐
│  Biodiversity Layer (COL, GBIF, IUCN, PBDB)            │
│  — species identity, distribution, status, fossils      │
├─────────────────────────────────────────────────────────┤
│  NASA Earth Systems Layer                               │
│  — habitat, climate, fire, water, canopy, ocean, events │
├─────────────────────────────────────────────────────────┤
│  Gameplay Layer                                         │
│  — exploration, ethical artifacts, quests, Lifeling     │
└─────────────────────────────────────────────────────────┘
```

## NASA Data Products

| Product | Role in Archive of Life | Game layer |
|---------|-------------------------|------------|
| **NASA Earthdata** | Gateway to Earth observation collections | Pipeline ingest entry point |
| **GIBS / Worldview** | Visual satellite layer browse (WMS) | Earth Layer Console map context |
| **HLS** (Harmonized Landsat Sentinel-2) | Vegetation health, NDVI, land surface change | Vegetation tab |
| **GEDI** | Forest canopy height and vertical structure | Forest Structure tab |
| **ECOSTRESS** | Plant water stress, land surface temperature, drought | Heat / Drought tab |
| **FIRMS** | Active fire and wildfire detections (MODIS/VIIRS) | Fire tab |
| **EONET** | Natural event metadata (storms, dust, blooms, floods) | Natural Events tab |
| **NASA POWER** | Climate and meteorology for field planning | Climate tab |
| **Ocean Color / OB.DAAC / PACE** | Marine chlorophyll, productivity, blooms | Ocean Life tab |

## Data Files

```
public/data/earth/
  nasa_manifest.json          — layer registry and product metadata
  sample_region_layers.json   — per-region mock environmental summaries
```

All current NASA layer data is marked `isMockData: true` until real ingestion is connected.

## In-Game: Earth Layer Console

Located in the **museum hub** (interact with 🛰️ console or press **T**).

Tabs:
- Vegetation
- Fire
- Water
- Forest Structure
- Ocean Life
- Heat / Drought
- Natural Events
- Climate

Each tab shows regional metrics, NASA product citation, and species environment links when applicable.

## Species Environment Dependencies

Species records may include:

```typescript
requiredHabitatSignals: [
  { signal: 'dense_canopy', layer: 'forest_structure', required: true, ... }
]
nasaLayerDependencies: [
  { layer: 'ocean_biology', product: 'ocean_color', reason: '...' }
]
```

Examples:
- **Rainforest species** → dense canopy (GEDI), water proximity, low fire
- **Blue whale** → ocean productivity (Ocean Color), migration season (POWER)
- **Amphibian** → wetland water (GIBS), temperature (ECOSTRESS)

## NASA-Inspired Quests

| Quest | Layers used |
|-------|----------------|
| Missing Pollinators | HLS vegetation + ECOSTRESS drought |
| Fire on the Range | FIRMS fire |
| Ocean Bloom | Ocean Color productivity |

## Pipeline Scaffolding

```
data-pipeline/ingest/nasa/
  cmr_search.py
  gibs_layers.py
  firms_events.py
  eonet_events.py
  power_climate.py
  hls_vegetation.py
  gedi_forest_structure.py
  ecostress_stress.py
  ocean_color.py
```

Optional credentials in `data-pipeline/.env.example` — not required for mock data.

## Production Integration Path

1. Ingest NASA snapshots via Earthdata Login / public APIs
2. Transform to `RegionEarthLayers` schema per game region
3. Update `nasa_manifest.json` snapshot version
4. Connect GIBS WMS tiles in Earth Layer Console (future)
5. Validate species `requiredHabitatSignals` against live layer values

## Ethics & Gameplay Identity

- NASA data supports **exploration, learning, and conservation decisions**
- No animal capture or battle mechanics
- Environmental context informs *when and where* to observe ethically
- Fire and drought layers teach real threats — not punitive gameplay

## References

- [NASA Earthdata](https://www.earthdata.nasa.gov/)
- [GIBS / Worldview](https://www.earthdata.nasa.gov/engage/open-data-services-and-software/api/earthdata-developer-portal/gibs-api)
- [FIRMS](https://firms.modaps.eosdis.nasa.gov/)
- [EONET](https://eonet.gsfc.nasa.gov/)
- [NASA POWER](https://power.larc.nasa.gov/)
- [OB.DAAC Ocean Color](https://oceancolor.gsfc.nasa.gov/)
