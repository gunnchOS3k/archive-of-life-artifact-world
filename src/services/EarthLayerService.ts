import type {
  EarthLayerCategory,
  NasaManifest,
  RegionEarthLayers,
  RegionEarthLayersBundle,
} from '@/schema/earth';

const NASA_MANIFEST = '/data/earth/nasa_manifest.json';

export class EarthLayerService {
  private manifest: NasaManifest | null = null;
  private regionBundle: RegionEarthLayersBundle | null = null;
  private metadataCache: {
    dataMode?: string;
    scope?: string;
    measurementDataMode?: string;
    verifiedRecordCount?: number;
    layers?: Array<{ id: string; mode: string; sourceUrl?: string; recordCount?: number }>;
    generatedAt?: string;
  } | null = null;

  async initialize(): Promise<NasaManifest> {
    this.manifest = await this.fetchJson<NasaManifest>(NASA_MANIFEST);
    this.regionBundle = await this.fetchJson<RegionEarthLayersBundle>(
      `/data/earth/${this.manifest.regionLayersPath}`
    );
    try {
      this.metadataCache = await this.fetchJson('/data/earth/nasa_metadata_cache.json');
    } catch {
      this.metadataCache = null;
    }
    return this.manifest;
  }

  getManifest(): NasaManifest {
    if (!this.manifest) throw new Error('EarthLayerService not initialized');
    return this.manifest;
  }

  getRegionLayers(regionId: string): RegionEarthLayers | null {
    return this.regionBundle?.regions[regionId] ?? null;
  }

  getLayerData(regionId: string, layer: EarthLayerCategory): unknown {
    const region = this.getRegionLayers(regionId);
    if (!region) return null;
    return region[layer];
  }

  getTabIds(): EarthLayerCategory[] {
    return this.getManifest().layers.map((l) => l.id);
  }

  getLayerDefinition(layer: EarthLayerCategory) {
    return this.getManifest().layers.find((l) => l.id === layer);
  }

  getLayerDataMode(layer: EarthLayerCategory): string {
    void layer;
    return this.regionBundle?.isMockData
      ? 'SAMPLE REGIONAL VALUES'
      : 'SOURCE-VERIFIED REGIONAL VALUES';
  }

  getLayerMetadataMode(layer: EarthLayerCategory): string {
    const cached = this.metadataCache?.layers?.find((item) => item.id === layer);
    if (cached?.mode) return cached.mode;
    return 'METADATA NOT CACHED';
  }

  getRegionalDataMode(): 'sample_fallback' | 'source_verified' {
    return this.regionBundle?.isMockData ? 'sample_fallback' : 'source_verified';
  }

  getGlobalDataMode(): string {
    // This describes the metadata cache only, never the displayed regional measurements.
    return this.metadataCache?.dataMode ?? (this.getManifest().isMockData ? 'sample_fallback' : 'real_metadata');
  }

  getMetadataCache() {
    return this.metadataCache;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json() as Promise<T>;
  }
}

export const earthLayerService = new EarthLayerService();

/** Map UI tab labels to layer categories */
export const EARTH_TAB_LABELS: Record<EarthLayerCategory, string> = {
  vegetation: 'Vegetation',
  fire: 'Fire',
  water: 'Water',
  forest_structure: 'Forest Structure',
  ocean_biology: 'Ocean Life',
  heat_drought: 'Heat / Drought',
  natural_events: 'Natural Events',
  climate: 'Climate',
};
