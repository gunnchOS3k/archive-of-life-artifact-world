import type {
  ArchiveSpecies,
  DataManifest,
  LifelingTrait,
  Quest,
  RegionBundle,
  SpeciesIndexEntry,
  SpeciesSearchIndex,
} from '@/schema';
import { speciesCache } from './IndexedDBCache';

const MANIFEST_PATH = '/data/manifest.json';

export interface GameConfig {
  regions: RegionBundle[];
  quests: Quest[];
  traits: LifelingTrait[];
}

export interface RegionSpeciesBundle {
  regionId: string;
  speciesIds: string[];
  species: ArchiveSpecies[];
}

export interface LoadedGameContext {
  manifest: DataManifest;
  config: GameConfig;
  searchIndex: SpeciesSearchIndex;
  coverage: DataManifest['coverage'];
  /** Only hero/playable species loaded for active region — not full catalogue */
  activeRegionSpecies: Map<string, ArchiveSpecies>;
  speciesById: Map<string, ArchiveSpecies>;
}

export class DataCatalogService {
  private manifest: DataManifest | null = null;
  private config: GameConfig | null = null;
  private searchIndex: SpeciesSearchIndex | null = null;
  private loadedSpecies = new Map<string, ArchiveSpecies>();
  private activeRegionId: string | null = null;

  async initialize(): Promise<DataManifest> {
    this.manifest = await this.fetchJson<DataManifest>(MANIFEST_PATH);

    const stale = await speciesCache.isStale(
      this.manifest.snapshotId,
      this.manifest.version
    );
    if (stale) {
      await speciesCache.invalidate();
      await speciesCache.setMeta({
        snapshotId: this.manifest.snapshotId,
        manifestVersion: this.manifest.version,
        cachedAt: Date.now(),
      });
    }

    this.config = await this.loadBundle<GameConfig>(
      'game_config',
      'bundles/game-config.json'
    );

    this.searchIndex = await this.loadBundle<SpeciesSearchIndex>(
      'search_index',
      this.manifest.bundles.searchIndex.path
    );

    return this.manifest;
  }

  getManifest(): DataManifest {
    if (!this.manifest) throw new Error('DataCatalogService not initialized');
    return this.manifest;
  }

  getConfig(): GameConfig {
    if (!this.config) throw new Error('DataCatalogService not initialized');
    return this.config;
  }

  getSearchIndex(): SpeciesSearchIndex {
    if (!this.searchIndex) throw new Error('Search index not loaded');
    return this.searchIndex;
  }

  getCoverage(): DataManifest['coverage'] {
    return this.getManifest().coverage;
  }

  /** Load species for active region only — keeps memory bounded */
  async loadActiveRegion(regionId: string): Promise<ArchiveSpecies[]> {
    this.activeRegionId = regionId;
    const manifest = this.getManifest();
    const regionRef = manifest.bundles.regionSpecies[regionId];

    if (!regionRef) {
      return [];
    }

    const bundle = await this.loadBundle<RegionSpeciesBundle>(
      `region_${regionId}`,
      regionRef.path
    );

    for (const sp of bundle.species) {
      this.loadedSpecies.set(sp.id, sp);
      await speciesCache.setSpecies(sp.id, manifest.snapshotId, sp);
    }

    return bundle.species;
  }

  /** Lazy-load full species detail on demand */
  async getSpeciesDetail(id: string): Promise<ArchiveSpecies | null> {
    if (this.loadedSpecies.has(id)) {
      return this.loadedSpecies.get(id)!;
    }

    const manifest = this.getManifest();
    const cached = await speciesCache.getSpecies<ArchiveSpecies>(id);
    if (cached) {
      this.loadedSpecies.set(id, cached);
      return cached;
    }

    // Try hero bundle for detail records
    const heroBundle = await this.loadBundle<{ species: ArchiveSpecies[] }>(
      'hero_species',
      manifest.bundles.heroSpecies.path
    );
    const found = heroBundle.species.find((s) => s.id === id);
    if (found) {
      this.loadedSpecies.set(id, found);
      await speciesCache.setSpecies(id, manifest.snapshotId, found);
      return found;
    }

    // Try archive stubs for tier 0–3 records
    if (manifest.bundles.archiveStubs) {
      const stubBundle = await this.loadBundle<{ species: ArchiveSpecies[] }>(
        'archive_stubs',
        manifest.bundles.archiveStubs.path
      );
      const stub = stubBundle.species.find((s) => s.id === id);
      if (stub) {
        this.loadedSpecies.set(id, stub);
        await speciesCache.setSpecies(id, manifest.snapshotId, stub);
        return stub;
      }
    }

    return null;
  }

  /** Paginated search over index — does not load full catalogue */
  searchSpecies(params: {
    query?: string;
    group?: string;
    region?: string;
    conservationStatus?: string;
    threatenedOnly?: boolean;
    extinctOnly?: boolean;
    extantOnly?: boolean;
    collectedIds?: Set<string>;
    collectedFilter?: 'collected' | 'uncollected' | 'all';
    tier?: string;
    representationTier?: string;
    timePeriod?: string;
    lifeStatus?: string;
    source?: string;
    page?: number;
    pageSize?: number;
  }): { entries: SpeciesIndexEntry[]; total: number; page: number; pageSize: number } {
    const index = this.getSearchIndex();
    let results = [...index.entries];

    const q = params.query?.toLowerCase().trim();
    if (q) {
      results = results.filter(
        (e) =>
          e.commonName.toLowerCase().includes(q) ||
          e.scientificName.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      );
    }
    if (params.group && params.group !== 'all') {
      results = results.filter((e) => e.group === params.group);
    }
    if (params.region && params.region !== 'all') {
      results = results.filter((e) => e.region === params.region);
    }
    if (params.conservationStatus && params.conservationStatus !== 'all') {
      results = results.filter((e) => e.iucnCategory === params.conservationStatus);
    }
    if (params.threatenedOnly) {
      results = results.filter((e) => e.isThreatened);
    }
    if (params.extinctOnly) {
      results = results.filter((e) => e.isExtinct);
    }
    if (params.extantOnly) {
      results = results.filter((e) => !e.isExtinct && e.lifeStatus !== 'extinct' && e.lifeStatus !== 'fossil_only');
    }
    if (params.representationTier && params.representationTier !== 'all') {
      const tier = Number(params.representationTier) as SpeciesIndexEntry['representationTier'];
      results = results.filter((e) => e.representationTier === tier);
    }
    if (params.timePeriod && params.timePeriod !== 'all') {
      results = results.filter((e) => e.timeUnitIds?.includes(params.timePeriod!));
    }
    if (params.lifeStatus && params.lifeStatus !== 'all') {
      results = results.filter((e) => e.lifeStatus === params.lifeStatus);
    }
    if (params.source && params.source !== 'all') {
      results = results.filter((e) => e.sources?.includes(params.source as never));
    }
    if (params.tier && params.tier !== 'all') {
      results = results.filter((e) => e.tier === params.tier);
    }
    if (params.collectedFilter === 'collected' && params.collectedIds) {
      results = results.filter((e) => params.collectedIds!.has(e.id));
    }
    if (params.collectedFilter === 'uncollected' && params.collectedIds) {
      results = results.filter((e) => !params.collectedIds!.has(e.id));
    }

    const pageSize = params.pageSize ?? 12;
    const page = params.page ?? 1;
    const total = results.length;
    const start = (page - 1) * pageSize;
    const entries = results.slice(start, start + pageSize);

    return { entries, total, page, pageSize };
  }

  getLoadedSpeciesForRegion(): ArchiveSpecies[] {
    if (!this.activeRegionId) return [];
    const config = this.getConfig();
    const region = config.regions.find((r) => r.id === this.activeRegionId);
    if (!region) return [];
    return region.speciesIds
      .map((id) => this.loadedSpecies.get(id))
      .filter((s): s is ArchiveSpecies => !!s);
  }

  getAllLoadedSpecies(): ArchiveSpecies[] {
    return Array.from(this.loadedSpecies.values());
  }

  private async loadBundle<T>(cacheKey: string, path: string): Promise<T> {
    const manifest = this.manifest!;
    const cached = await speciesCache.getBundle<T>(cacheKey);
    if (cached) return cached;

    const data = await this.fetchJson<T>(`/data/${path.replace(/^\/?data\//, '')}`);
    await speciesCache.setBundle(cacheKey, manifest.snapshotId, data);
    return data;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const url = path.startsWith('/') ? path : `/${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json() as Promise<T>;
  }
}

export const dataCatalog = new DataCatalogService();

/** Adapter: expose playable species shape for world/minigames */
export interface PlayableSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  group: string;
  family: string;
  conservationStatus: string;
  artifactTypes: string[];
  region: string;
  questType: string;
  dangerLevel: number;
  ethicalInteraction: string;
  timeRange: string;
  habitats: string[];
  diet: string;
  activity: string;
  size: string;
  behavior: string;
  learningTopics: string[];
  funFacts: string[];
  whyItMatters: string;
  fossilLocations?: string[];
  livingRelatives?: string[];
}

export function toPlayableSpecies(sp: ArchiveSpecies): PlayableSpecies {
  const gp = sp.gameplay;
  return {
    id: sp.id,
    commonName: sp.commonName,
    scientificName: sp.scientificName,
    group: sp.group,
    family: sp.taxonomy.family,
    conservationStatus: sp.conservation?.iucnCategory ?? 'Not Evaluated',
    artifactTypes: sp.artifactTemplates.map((a) => a.artifactType),
    region: gp?.region ?? '',
    questType: gp?.questType ?? 'observation',
    dangerLevel: gp?.dangerLevel ?? 0,
    ethicalInteraction: gp?.ethicalInteraction ?? 'observe_from_distance',
    timeRange: gp?.timeRange ?? sp.fossil?.timeRange ?? 'Present',
    habitats: sp.distribution?.habitats ?? [],
    diet: gp?.diet ?? '',
    activity: gp?.activity ?? '',
    size: gp?.size ?? '',
    behavior: gp?.behavior ?? '',
    learningTopics: gp?.learningTopics ?? [],
    funFacts: gp?.funFacts ?? [],
    whyItMatters: gp?.whyItMatters ?? '',
    fossilLocations: sp.fossil?.fossilLocations ?? gp?.fossilLocations,
    livingRelatives: sp.fossil?.livingRelatives ?? gp?.livingRelatives,
  };
}

export function getSpeciesIcon(species: { group: string; conservationStatus?: string; conservation?: { iucnCategory: string } }): string {
  const status = species.conservationStatus ?? species.conservation?.iucnCategory;
  const icons: Record<string, string> = {
    Mammal: '🦁',
    Insect: '🦋',
    Arachnid: '🕷️',
    Reptile: '🦕',
  };
  if (status === 'Extinct') return '🦴';
  return icons[species.group] || '🐾';
}

export function getConservationClass(status: string): string {
  const map: Record<string, string> = {
    'Least Concern': 'least-concern',
    Vulnerable: 'vulnerable',
    Endangered: 'endangered',
    Extinct: 'extinct',
    'Data Deficient': 'data-deficient',
    'Near Threatened': 'vulnerable',
    'Critically Endangered': 'endangered',
  };
  return map[status] || 'data-deficient';
}
