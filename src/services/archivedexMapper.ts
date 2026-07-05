import type { ArchiveSpecies, LifelingTrait } from '@/schema';
import type { TaxonTimeRange } from '@/time/schema';
import type {
  ArchiveDexEntry,
  ArchiveDexEntryStatus,
  ArchiveDexProfileOverlay,
  TaxonomyProfile,
} from '@/schema/archivedex';

function mergeDefined<T extends Record<string, unknown>>(base: T, overlay?: Partial<T>): T {
  if (!overlay) return base;
  const out = { ...base } as T;
  for (const [k, v] of Object.entries(overlay)) {
    if (v !== undefined && v !== null) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function buildTaxonomy(sp: ArchiveSpecies, overlay?: Partial<TaxonomyProfile>): TaxonomyProfile {
  const t = sp.taxonomy;
  return mergeDefined(
    {
      domain: 'Eukaryota',
      kingdom: t.kingdom ?? (sp.group === 'Microbe' ? undefined : 'Animalia'),
      phylum: t.phylum,
      className: t.class,
      order: t.order,
      family: t.family,
      genus: t.genus,
      species: sp.scientificName,
      rank: t.rank,
      acceptedName: t.acceptedName,
      synonyms: t.synonyms ?? [],
      sourceIds: {
        catalogueOfLifeId: t.catalogueOfLifeId,
        gbifTaxonKey: t.gbifTaxonKey ?? sp.distribution?.gbifTaxonKey,
        iucnTaxonId: sp.conservation?.iucnTaxonId,
        paleobiodbTaxonNo: sp.fossil?.paleobiodbTaxonNo,
      },
    },
    overlay
  );
}

export function mapSpeciesToArchiveDexEntry(
  sp: ArchiveSpecies,
  options: {
    overlay?: ArchiveDexProfileOverlay;
    timeRange?: TaxonTimeRange;
    traits?: LifelingTrait[];
    entryStatus: ArchiveDexEntryStatus;
    collectedArtifactTypes?: string[];
  }
): ArchiveDexEntry {
  const gp = sp.gameplay;
  const overlay = options.overlay;
  const timeRange = options.timeRange;
  const traits = options.traits ?? [];

  const lifelingUnlocks = traits
    .filter((t) => t.unlockedBy === sp.id)
    .map((t) => ({
      traitId: t.id,
      traitName: t.name,
      category: t.category,
      unlockCondition: `Document ${sp.commonName}`,
    }));

  const entry: ArchiveDexEntry = {
    id: sp.id,
    archiveNumber: overlay?.archiveNumber,
    commonName: sp.commonName,
    scientificName: sp.scientificName,
    pronunciation: overlay?.pronunciation,
    nameMeaning: overlay?.nameMeaning,
    group: sp.group,
    lifeStatus: sp.lifeStatus ?? (sp.fossil ? 'extinct' : 'extant'),
    representationTier: sp.representationTier,
    entryStatus: options.entryStatus,
    region: gp?.region,
    overview: mergeDefined(
      {
        shortDescription: overlay?.overview?.shortDescription ?? gp?.behavior,
        whyItMatters: overlay?.overview?.whyItMatters ?? gp?.whyItMatters,
        playerFieldNote: overlay?.overview?.playerFieldNote,
      },
      overlay?.overview
    ),
    identity: overlay?.identity,
    taxonomy: buildTaxonomy(sp, overlay?.taxonomy),
    time: mergeDefined(
      {
        timeUnitIds: sp.timeUnitIds ?? timeRange?.timeUnitIds,
        firstAppearanceMa: timeRange?.firstAppearanceMa ?? null,
        lastAppearanceMa: timeRange?.lastAppearanceMa ?? null,
        timeRangeLabel: gp?.timeRange ?? sp.fossil?.timeRange,
        confidence: timeRange?.confidence,
        fossilRecordLimitations: timeRange?.notes,
      },
      overlay?.time
    ),
    habitatRange: mergeDefined(
      {
        continents: sp.distribution?.continents,
        biomes: sp.distribution?.habitats,
        habitats: sp.distribution?.habitats,
        fossilLocations: sp.fossil?.fossilLocations ?? gp?.fossilLocations,
        paleoenvironment: sp.fossil?.paleoenvironment,
      },
      overlay?.habitatRange
    ),
    bodyTraits: mergeDefined(
      {
        size: gp?.size,
        locomotion: overlay?.bodyTraits?.locomotion,
        keyFeatures: overlay?.bodyTraits?.keyFeatures,
        adaptations: overlay?.bodyTraits?.adaptations,
        sexualDimorphism: overlay?.bodyTraits?.sexualDimorphism,
      },
      overlay?.bodyTraits
    ),
    behavior: mergeDefined(
      {
        activity: gp?.activity,
        movement: overlay?.behavior?.movement,
        socialStructure: overlay?.behavior?.socialStructure,
        communication: overlay?.behavior?.communication,
        fieldSafety: gp?.ethicalInteraction?.replace(/_/g, ' ') ?? overlay?.behavior?.fieldSafety,
      },
      overlay?.behavior
    ),
    dietFoodWeb: mergeDefined(
      {
        dietCategory: gp?.diet?.toLowerCase(),
        mainFoods: overlay?.dietFoodWeb?.mainFoods,
        trophicLevel: overlay?.dietFoodWeb?.trophicLevel,
        prey: overlay?.dietFoodWeb?.prey,
        predators: overlay?.dietFoodWeb?.predators,
        foodWebDiagram: overlay?.dietFoodWeb?.foodWebDiagram,
        ecosystemRole: overlay?.dietFoodWeb?.ecosystemRole,
      },
      overlay?.dietFoodWeb
    ),
    lifeCycle: overlay?.lifeCycle,
    ecology: mergeDefined(
      {
        roles: gp?.learningTopics,
        ecosystemImpact: overlay?.ecology?.ecosystemImpact,
      },
      overlay?.ecology
    ),
    conservation: mergeDefined(
      {
        iucnCategory: sp.conservation?.iucnCategory,
        assessed: sp.conservation?.assessed,
        threatened: sp.conservation?.iucnCategory
          ? ['Vulnerable', 'Endangered', 'Critically Endangered'].includes(sp.conservation.iucnCategory)
          : undefined,
        majorThreats: overlay?.conservation?.majorThreats,
        conservationActions: overlay?.conservation?.conservationActions,
      },
      overlay?.conservation
    ),
    artifactsEvidence: {
      collectedArtifactTypes: options.collectedArtifactTypes,
      availableArtifacts: sp.artifactTemplates.map((a) => ({
        id: a.id,
        type: a.artifactType,
        ethical: a.ethical,
        label: a.label,
      })),
      ethicalRules: ['No capture', 'No harm', 'Observe from ethical distance', 'Leave no trace'],
      evidenceStrength: overlay?.artifactsEvidence?.evidenceStrength,
      ...overlay?.artifactsEvidence,
    },
    earthSystems: mergeDefined(
      {
        environmentalDependencies: sp.nasaLayerDependencies?.map((d) => `${d.layer}: ${d.reason}`),
        habitatSignals: sp.requiredHabitatSignals?.map((s) => s.description),
        climateSensitivity: overlay?.earthSystems?.climateSensitivity,
      },
      overlay?.earthSystems
    ),
    humanConnections: overlay?.humanConnections,
    lifeling: mergeDefined(
      {
        unlocks: lifelingUnlocks.length ? lifelingUnlocks : overlay?.lifeling?.unlocks,
        masteryBadge: overlay?.lifeling?.masteryBadge,
      },
      overlay?.lifeling
    ),
    media: overlay?.media,
    sources: sp.provenance,
    uncertainty: mergeDefined(
      {
        notes: 'Entry will update as source databases are refreshed.',
        missingFields: [],
      },
      overlay?.uncertainty
    ),
  };

  return entry;
}

export function getEntryRevealLevel(
  entry: ArchiveDexEntry,
  discovered: boolean
): 'hidden' | 'preview' | 'discovered' | 'studied' {
  if (entry.representationTier <= 3) return discovered ? 'studied' : 'preview';
  if (!discovered) return 'hidden';
  if (entry.representationTier >= 6 && entry.entryStatus === 'studied') return 'studied';
  if (discovered) return 'discovered';
  return 'preview';
}

export function getVisibleTabs(entry: ArchiveDexEntry, reveal: ReturnType<typeof getEntryRevealLevel>): import('@/schema/archivedex').ArchiveDexTabId[] {
  const all: import('@/schema/archivedex').ArchiveDexTabId[] = [
    'overview', 'identity', 'taxonomy', 'time', 'habitat', 'body', 'behavior',
    'diet', 'lifecycle', 'ecology', 'conservation', 'artifacts', 'earth',
    'human', 'lifeling', 'media', 'sources',
  ];

  if (reveal === 'hidden') return ['overview'];
  if (entry.representationTier === 0) return ['taxonomy', 'sources'];
  if (entry.representationTier <= 1) return ['overview', 'taxonomy', 'sources'];
  if (entry.representationTier <= 2) return ['overview', 'taxonomy', 'habitat', 'sources'];
  if (entry.representationTier <= 3) return ['overview', 'taxonomy', 'time', 'habitat', 'sources'];
  if (reveal === 'discovered' && entry.representationTier < 6) {
    return ['overview', 'taxonomy', 'time', 'habitat', 'artifacts', 'conservation', 'sources'];
  }
  if (reveal === 'studied' || entry.representationTier >= 6) return all;
  return ['overview', 'taxonomy', 'habitat', 'artifacts', 'sources'];
}

export function computeEntryCompletion(entry: ArchiveDexEntry, visibleTabs: string[]): number {
  const sections = visibleTabs.length;
  let filled = 0;
  const check = (v: unknown) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

  if (check(entry.overview?.shortDescription)) filled++;
  if (check(entry.taxonomy.family)) filled++;
  if (check(entry.time?.timeRangeLabel || entry.time?.timeUnitIds)) filled++;
  if (check(entry.habitatRange?.habitats)) filled++;
  if (check(entry.bodyTraits?.size)) filled++;
  if (check(entry.behavior?.activity)) filled++;
  if (check(entry.dietFoodWeb?.dietCategory)) filled++;
  if (check(entry.conservation?.iucnCategory)) filled++;
  if (check(entry.artifactsEvidence?.collectedArtifactTypes) || entry.representationTier >= 4) filled++;
  if (check(entry.sources)) filled++;

  return Math.min(100, Math.round((filled / Math.max(sections, 1)) * 100));
}
