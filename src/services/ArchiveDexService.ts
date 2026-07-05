import type { SaveState, SpeciesIndexEntry, LifelingTrait } from '@/schema';
import type {
  ArchiveDexEntry,
  ArchiveDexCompletionScope,
  ArchiveDexCompletionStats,
  ArchiveDexProfilesBundle,
  ArchiveDexSearchFilters,
} from '@/schema/archivedex';
import { DataCatalogService } from './DataCatalogService';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import {
  mapSpeciesToArchiveDexEntry,
  getEntryRevealLevel,
  computeEntryCompletion,
} from './archivedexMapper';
import { getCollectedIds } from '@/systems/artifactSystem';

const PROFILES_PATH = '/data/bundles/archivedex-profiles.json';

export class ArchiveDexService {
  private catalog: DataCatalogService;
  private timeAtlas: TimeAtlasService;
  private profiles = new Map<string, ArchiveDexProfilesBundle['profiles'][0]>();
  private profilesLoaded = false;

  constructor(catalog: DataCatalogService, timeAtlas: TimeAtlasService) {
    this.catalog = catalog;
    this.timeAtlas = timeAtlas;
  }

  async ensureProfilesLoaded(): Promise<void> {
    if (this.profilesLoaded) return;
    try {
      const res = await fetch(PROFILES_PATH);
      if (res.ok) {
        const bundle = (await res.json()) as ArchiveDexProfilesBundle;
        for (const p of bundle.profiles) this.profiles.set(p.id, p);
      }
    } catch {
      /* optional bundle */
    }
    this.profilesLoaded = true;
  }

  async getEntryById(id: string, state: SaveState): Promise<ArchiveDexEntry | null> {
    await this.ensureProfilesLoaded();
    const sp = await this.catalog.getSpeciesDetail(id);
    if (!sp) return null;

    const collected = getCollectedIds(state);
    const discovered = collected.has(id) || sp.representationTier <= 3;
    const artifactTypes = state.artifacts.filter((a) => a.speciesId === id).map((a) => a.artifactType);
    const timeRange = this.timeAtlas.getTaxonTimeRange(id);
    const traits = this.catalog.getConfig().traits;

    const entry = mapSpeciesToArchiveDexEntry(sp, {
      overlay: this.profiles.get(id),
      timeRange,
      traits,
      entryStatus: collected.has(id) ? 'studied' : discovered ? 'discovered' : 'undocumented',
      collectedArtifactTypes: artifactTypes.length ? artifactTypes : undefined,
    });

    if (state.artifacts.find((a) => a.speciesId === id)) {
      const art = state.artifacts.find((a) => a.speciesId === id)!;
      entry.overview = {
        ...entry.overview,
        discoveryRegion: art.region,
        discoveryDate: new Date(art.collectedAt).toLocaleDateString(),
        playerFieldNote: state.notebook.find((n) => n.speciesId === id)?.text,
      };
    }

    const reveal = getEntryRevealLevel(entry, discovered);
    entry.overview = {
      ...entry.overview,
      completionPercent: computeEntryCompletion(entry, ['overview', 'taxonomy', 'habitat', 'artifacts']),
    };

    if (reveal === 'hidden') {
      return {
        ...entry,
        commonName: 'Undocumented',
        overview: {
          shortDescription: 'Document this species in the field to unlock the full ArchiveDex entry.',
        },
      };
    }

    return entry;
  }

  searchEntries(
    filters: ArchiveDexSearchFilters,
    state: SaveState
  ): { entries: SpeciesIndexEntry[]; total: number; page: number; pageSize: number } {
    const collectedIds = getCollectedIds(state);
    let result = this.catalog.searchSpecies({
      query: filters.query,
      group: filters.group,
      region: filters.region,
      conservationStatus: filters.conservationStatus,
      threatenedOnly: filters.threatenedOnly,
      extinctOnly: filters.extinctOnly,
      extantOnly: filters.extantOnly,
      collectedFilter: filters.collectedFilter,
      collectedIds,
      tier: filters.tier,
      representationTier: filters.representationTier,
      timePeriod: filters.timePeriod,
      lifeStatus: filters.lifeStatus,
      source: filters.source,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    if (filters.heroOnly) {
      result = {
        ...result,
        entries: result.entries.filter((e) => e.representationTier >= 6),
        total: result.entries.filter((e) => e.representationTier >= 6).length,
      };
    }
    if (filters.questableOnly) {
      result = {
        ...result,
        entries: result.entries.filter((e) => e.representationTier >= 5),
      };
    }
    if (filters.fossilOnly) {
      result = {
        ...result,
        entries: result.entries.filter(
          (e) => e.isExtinct || e.lifeStatus === 'extinct' || e.lifeStatus === 'fossil_only'
        ),
      };
    }
    if (filters.lifelingUnlockAvailable) {
      const traitSpecies = new Set(
        this.catalog.getConfig().traits.map((t) => t.unlockedBy).filter((id) => id !== 'any_artifact')
      );
      result = {
        ...result,
        entries: result.entries.filter((e) => traitSpecies.has(e.id)),
      };
    }

    return result;
  }

  getRelatedEntries(id: string, limit = 4): SpeciesIndexEntry[] {
    const index = this.catalog.getSearchIndex().entries;
    const current = index.find((e) => e.id === id);
    if (!current) return [];
    return index
      .filter(
        (e) =>
          e.id !== id &&
          (e.group === current.group ||
            e.family === current.family ||
            e.region === current.region ||
            e.timeUnitIds?.some((t) => current.timeUnitIds?.includes(t)))
      )
      .slice(0, limit);
  }

  getCompletionStats(scope: ArchiveDexCompletionScope, state: SaveState): ArchiveDexCompletionStats {
    const index = this.catalog.getSearchIndex().entries;
    const collected = getCollectedIds(state);
    let pool = index;

    if (scope.region) pool = pool.filter((e) => e.region === scope.region);
    if (scope.timePeriod) pool = pool.filter((e) => e.timeUnitIds?.includes(scope.timePeriod!));
    if (scope.group) pool = pool.filter((e) => e.group === scope.group);
    if (scope.heroOnly) pool = pool.filter((e) => e.representationTier >= 6);

    const documented = pool.filter(
      (e) => collected.has(e.id) || e.representationTier <= 3
    ).length;

    const label = scope.region
      ? `${scope.region} Archive`
      : scope.timePeriod
        ? `${scope.timePeriod} Archive`
        : scope.group
          ? `${scope.group} Archive`
          : scope.heroOnly
            ? 'Hero Species Archive'
            : 'Known Life Archive';

    return {
      scope: scope.region ?? scope.timePeriod ?? scope.group ?? 'global',
      documented,
      total: pool.length,
      percent: pool.length ? Math.round((documented / pool.length) * 100) : 0,
      label,
    };
  }

  getTraitUnlocksForSpecies(speciesId: string): LifelingTrait[] {
    return this.catalog.getConfig().traits.filter((t) => t.unlockedBy === speciesId);
  }
}

export const createArchiveDexService = (
  catalog: DataCatalogService,
  timeAtlas: TimeAtlasService
) => new ArchiveDexService(catalog, timeAtlas);
