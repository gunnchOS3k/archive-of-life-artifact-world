import type {
  TemporalEarthMapCatalog,
  TemporalEarthMapRecord,
} from '@/schema/temporalMap';

const TEMPORAL_MAP_CATALOG_PATH = '/data/maps/temporal_map_catalog.json';

export class TemporalMapService {
  private catalog: TemporalEarthMapCatalog | null = null;
  private mapsByGate = new Map<string, TemporalEarthMapRecord>();
  private mapsByTimeUnit = new Map<string, TemporalEarthMapRecord[]>();

  async initialize(): Promise<TemporalEarthMapCatalog> {
    const catalog = await this.fetchJson<TemporalEarthMapCatalog>(TEMPORAL_MAP_CATALOG_PATH);
    this.catalog = catalog;
    this.mapsByGate.clear();
    this.mapsByTimeUnit.clear();

    for (const map of catalog.maps) {
      this.mapsByGate.set(map.timeGateId, map);
      for (const timeUnitId of map.timeUnitIds) {
        const records = this.mapsByTimeUnit.get(timeUnitId) ?? [];
        records.push(map);
        this.mapsByTimeUnit.set(timeUnitId, records);
      }
    }

    return catalog;
  }

  getCatalog(): TemporalEarthMapCatalog {
    if (!this.catalog) throw new Error('TemporalMapService not initialized');
    return this.catalog;
  }

  getMapForGate(timeGateId: string): TemporalEarthMapRecord | undefined {
    return this.mapsByGate.get(timeGateId);
  }

  getMapsForTimeUnit(timeUnitId: string): TemporalEarthMapRecord[] {
    return this.mapsByTimeUnit.get(timeUnitId) ?? [];
  }

  getSummary() {
    const maps = this.getCatalog().maps;
    return {
      total: maps.length,
      sourceVerified: maps.filter((map) => map.status === 'source_verified').length,
      partial: maps.filter((map) => map.status === 'partial').length,
      blocked: maps.filter((map) => map.status === 'blocked_external').length,
    };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return response.json() as Promise<T>;
  }
}

export const temporalMapService = new TemporalMapService();
