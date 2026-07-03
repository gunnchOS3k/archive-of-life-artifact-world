/** NASA Earth Systems environmental layer categories */
export type EarthLayerCategory =
  | 'vegetation'
  | 'fire'
  | 'water'
  | 'forest_structure'
  | 'ocean_biology'
  | 'heat_drought'
  | 'natural_events'
  | 'climate';

export type NasaDataProduct =
  | 'earthdata'
  | 'gibs'
  | 'hls'
  | 'gedi'
  | 'ecostress'
  | 'firms'
  | 'eonet'
  | 'power'
  | 'ocean_color'
  | 'pace';

export interface NasaLayerDefinition {
  id: EarthLayerCategory;
  name: string;
  description: string;
  nasaProduct: NasaDataProduct;
  gibsLayerId?: string;
  citation: string;
  isMockData: boolean;
}

export interface NasaManifest {
  version: string;
  snapshotId: string;
  generatedAt: string;
  isMockData: boolean;
  description: string;
  layers: NasaLayerDefinition[];
  regionLayersPath: string;
}

export interface VegetationLayerData {
  ndvi: number;
  ndviLabel: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  hlsSceneDate?: string;
  summary: string;
}

export interface FireLayerData {
  activeFires: number;
  fireRadiativePower?: number;
  recentBurnScar: boolean;
  firmsSource: string;
  summary: string;
}

export interface WaterLayerData {
  surfaceWaterPct: number;
  wetlandIndex: number;
  precipitationMm?: number;
  summary: string;
}

export interface ForestStructureLayerData {
  canopyHeightM: number;
  canopyCoverPct: number;
  biomassEstimate?: string;
  gediFootprint?: string;
  summary: string;
}

export interface OceanBiologyLayerData {
  chlorophyllMgM3: number;
  productivityIndex: number;
  bloomDetected: boolean;
  seaSurfaceTempC?: number;
  summary: string;
}

export interface HeatDroughtLayerData {
  landSurfaceTempC: number;
  evapotranspirationStress: number;
  droughtIndex: number;
  ecostressAlert: boolean;
  summary: string;
}

export interface NaturalEventData {
  id: string;
  title: string;
  category: string;
  date: string;
  eonetId?: string;
  summary: string;
}

export interface NaturalEventsLayerData {
  activeEvents: NaturalEventData[];
  summary: string;
}

export interface ClimateLayerData {
  avgTempC: number;
  humidityPct: number;
  solarRadiation?: number;
  windSpeedMs?: number;
  powerSource: string;
  summary: string;
}

export interface RegionEarthLayers {
  regionId: string;
  vegetation: VegetationLayerData;
  fire: FireLayerData;
  water: WaterLayerData;
  forest_structure: ForestStructureLayerData;
  ocean_biology: OceanBiologyLayerData;
  heat_drought: HeatDroughtLayerData;
  natural_events: NaturalEventsLayerData;
  climate: ClimateLayerData;
}

export interface RegionEarthLayersBundle {
  snapshotId: string;
  isMockData: boolean;
  regions: Record<string, RegionEarthLayers>;
}

/** Species environmental requirements linked to NASA layers */
export interface HabitatSignal {
  signal: string;
  layer: EarthLayerCategory;
  minValue?: number;
  maxValue?: number;
  required: boolean;
  description: string;
}

export interface NasaLayerDependency {
  layer: EarthLayerCategory;
  product: NasaDataProduct;
  reason: string;
}
