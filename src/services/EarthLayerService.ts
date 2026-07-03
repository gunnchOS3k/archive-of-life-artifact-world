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

  async initialize(): Promise<NasaManifest> {
    this.manifest = await this.fetchJson<NasaManifest>(NASA_MANIFEST);
    this.regionBundle = await this.fetchJson<RegionEarthLayersBundle>(
      `/data/earth/${this.manifest.regionLayersPath}`
    );
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
