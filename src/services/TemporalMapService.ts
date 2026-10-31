import type {
  TemporalEarthMapCatalog,
  TemporalEarthMapRecord,
} from '@/schema/temporalMap';
import {
  isAuthorizedSourceVerifiedMap,
  resolveTemporalMapPresentation,
  summarizeTemporalMapCatalogHonesty,
} from '@/systems/timeAtlasBlockedPresentation';

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
    const catalog = this.getCatalog();
    const maps = catalog.maps;
    const honesty = summarizeTemporalMapCatalogHonesty(catalog);
    return {
      total: maps.length,
      /** Scientifically unlocked count — never raw status labels alone. */
      sourceVerified: honesty.scientificallyUnlocked,
      scientificallyUnlocked: honesty.scientificallyUnlocked,
      labeledSourceVerified: honesty.labeledSourceVerified,
      partial: maps.filter((map) => map.status === 'partial').length,
      blocked: honesty.blocked,
      illustration: honesty.illustration,
      honestyCopy: honesty.honestyCopy,
    };
  }

  /**
   * Only authorized source-verified maps may unlock scientific paleogeography.
   * Status hacks / mock catalogs / missing assets stay locked.
   */
  isScientificallyUnlocked(map: TemporalEarthMapRecord | undefined): boolean {
    if (!map) return false;
    return isAuthorizedSourceVerifiedMap(map, this.getCatalog().isMockData);
  }

  /** Honest status string for UI — never upgrades blocked → unlocked. */
  unlockLabel(map: TemporalEarthMapRecord): string {
    const presentation = resolveTemporalMapPresentation(map, {
      catalogIsMockData: this.getCatalog().isMockData,
    });
    if (presentation.playerState === 'verified') return 'SOURCE VERIFIED — unlocked';
    if (presentation.playerState === 'illustration') {
      return `ILLUSTRATION — not unlocked (${map.coveredGridCellCount}/${map.expectedGridCellCount} cells)`;
    }
    return `BLOCKED — ${map.blockedReason ?? map.uncertaintyNotes ?? 'no authorized external reconstruction'}`;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return response.json() as Promise<T>;
  }
}

export const temporalMapService = new TemporalMapService();
