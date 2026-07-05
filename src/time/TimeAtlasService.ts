import type {
  GeologicTimeUnit,
  GeologicTimeUnitsBundle,
  PlayableTimeGate,
  PlayableTimeGatesBundle,
  TaxonTimeRange,
  TaxonTimeRangesBundle,
  TimeManifest,
  GeologicTimeRank,
} from './schema';

const TIME_MANIFEST_PATH = '/data/time/time_manifest.json';

export class TimeAtlasService {
  private manifest: TimeManifest | null = null;
  private units = new Map<string, GeologicTimeUnit>();
  private unitsByRank = new Map<GeologicTimeRank, GeologicTimeUnit[]>();
  private gates: PlayableTimeGate[] = [];
  private taxonRanges = new Map<string, TaxonTimeRange>();
  private rangesByTimeUnit = new Map<string, TaxonTimeRange[]>();

  async initialize(): Promise<TimeManifest> {
    this.manifest = await this.fetchJson<TimeManifest>(TIME_MANIFEST_PATH);

    const unitsBundle = await this.fetchJson<GeologicTimeUnitsBundle>(
      `/data/${this.manifest.bundles.geologicTimeUnits.path}`
    );
    const gatesBundle = await this.fetchJson<PlayableTimeGatesBundle>(
      `/data/${this.manifest.bundles.playableTimeGates.path}`
    );
    const rangesBundle = await this.fetchJson<TaxonTimeRangesBundle>(
      `/data/${this.manifest.bundles.taxonTimeRanges.path}`
    );

    this.units.clear();
    this.unitsByRank.clear();
    for (const unit of unitsBundle.units) {
      this.units.set(unit.id, unit);
      const list = this.unitsByRank.get(unit.rank) ?? [];
      list.push(unit);
      this.unitsByRank.set(unit.rank, list);
    }
    for (const [, list] of this.unitsByRank) {
      list.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    this.gates = gatesBundle.gates;

    this.taxonRanges.clear();
    this.rangesByTimeUnit.clear();
    for (const range of rangesBundle.ranges) {
      this.taxonRanges.set(range.taxonId, range);
      for (const unitId of range.timeUnitIds) {
        const list = this.rangesByTimeUnit.get(unitId) ?? [];
        list.push(range);
        this.rangesByTimeUnit.set(unitId, list);
      }
    }

    return this.manifest;
  }

  getManifest(): TimeManifest {
    if (!this.manifest) throw new Error('TimeAtlasService not initialized');
    return this.manifest;
  }

  getCoverage(): TimeManifest['coverage'] {
    return this.getManifest().coverage;
  }

  getUnit(id: string): GeologicTimeUnit | undefined {
    return this.units.get(id);
  }

  getAllUnits(): GeologicTimeUnit[] {
    return Array.from(this.units.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getUnitsByRank(rank: GeologicTimeRank): GeologicTimeUnit[] {
    return this.unitsByRank.get(rank) ?? [];
  }

  getChildren(parentId: string): GeologicTimeUnit[] {
    return this.getAllUnits().filter((u) => u.parentId === parentId);
  }

  getAncestors(unitId: string): GeologicTimeUnit[] {
    const chain: GeologicTimeUnit[] = [];
    let current = this.units.get(unitId);
    while (current?.parentId) {
      const parent = this.units.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }

  getPlayableGates(): PlayableTimeGate[] {
    return this.gates;
  }

  getGate(id: string): PlayableTimeGate | undefined {
    return this.gates.find((g) => g.id === id);
  }

  isGateUnlocked(gate: PlayableTimeGate, progress: {
    artifactsCollected: number;
    regionsExplored: number;
    completedQuests: string[];
  }): boolean {
    if (!gate.isPlayable) return false;
    if (progress.artifactsCollected < gate.requiredProgress.artifactsCollected) return false;
    if (
      gate.requiredProgress.regionsExplored !== undefined &&
      progress.regionsExplored < gate.requiredProgress.regionsExplored
    ) {
      return false;
    }
    if (gate.requiredProgress.completedQuests?.length) {
      const done = new Set(progress.completedQuests);
      if (!gate.requiredProgress.completedQuests.every((q) => done.has(q))) return false;
    }
    return true;
  }

  getTaxonTimeRange(taxonId: string): TaxonTimeRange | undefined {
    return this.taxonRanges.get(taxonId);
  }

  getTaxaForTimeUnit(unitId: string): TaxonTimeRange[] {
    return this.rangesByTimeUnit.get(unitId) ?? [];
  }

  /** Taxa whose range overlaps a time unit's Ma bounds */
  getTaxaOverlappingUnit(unitId: string): TaxonTimeRange[] {
    const unit = this.units.get(unitId);
    if (!unit) return [];
    return Array.from(this.taxonRanges.values()).filter(
      (r) => r.firstAppearanceMa <= unit.startMa && r.lastAppearanceMa >= unit.endMa
    );
  }

  searchUnits(query: string): GeologicTimeUnit[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllUnits();
    return this.getAllUnits().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.description.toLowerCase().includes(q)
    );
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json() as Promise<T>;
  }
}

export const timeAtlasService = new TimeAtlasService();
