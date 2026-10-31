/**
 * Region exploration depth — authored gameplay loops without Earth-complete claims.
 */

export type RegionExplorationStatus =
  | 'data_registered'
  | 'runtime_playable'
  | 'gameplay_tested'
  | 'final_asset_candidate'
  | 'final_asset_human_approved'
  | 'rc'
  | 'commercial_authorized';

export interface RegionExplorationCard {
  regionId: string;
  displayName: string;
  continents: string[];
  biome: string;
  encounterTaxonIds: string[];
  objectives: string[];
  offlineIntegrityKey: string;
  status: RegionExplorationStatus;
  earthCompleteClaim: false;
  scientificScope: string;
  blockers: string[];
}

const SHARED_BLOCKERS = [
  'External source-verified CoL/GBIF/IUCN/PBDB provenance not yet release-approved for hero fields',
  'Human playtest / RC / commercial authorization remain false',
  'Final species/region art not human-approved (emoji marks are identity candidates only)',
];

const SCOPE =
  'Game-authored planning twin for expedition loops. Not a surveyed Earth-complete regional catalog; external scientific fields remain quarantined until approved snapshot import.';

/** Authored exploration cards for museum + 12 field regions (13 total registry entries). */
export const REGION_EXPLORATION_CARDS: RegionExplorationCard[] = [
  {
    regionId: 'museum',
    displayName: 'Archive of Life Museum',
    continents: [],
    biome: 'museum',
    encounterTaxonIds: [],
    objectives: [
      'Enter museum hub and open ArchiveDex',
      'Review Lifeling companion modules',
      'Launch a field expedition portal',
      'Verify offline pack integrity after return',
    ],
    offlineIntegrityKey: 'regionMuseum',
    status: 'gameplay_tested',
    earthCompleteClaim: false,
    scientificScope: 'Hub / presentation layer — not a biodiversity survey.',
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'savanna',
    displayName: 'African Savanna',
    continents: ['Africa'],
    biome: 'savanna',
    encounterTaxonIds: [
      'panthera_leo',
      'loxodonta_africana',
      'danaus_plexippus',
      'apis_mellifera',
      'latrodectus_mactans',
      'pachnoda_marginata',
    ],
    objectives: [
      'Observe lion with lion-correct representation (never horse)',
      'Observe elephant with species-specific kinetics',
      'Record field observation → ArchiveDex entry',
      'Return to museum with save intact',
    ],
    offlineIntegrityKey: 'regionSavanna',
    status: 'gameplay_tested',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'steppe',
    displayName: 'Central Asian Steppe',
    continents: ['Asia'],
    biome: 'steppe',
    encounterTaxonIds: ['equus_caballus_ferus'],
    objectives: [
      'Enter the Asian Steppe portal from the museum hub',
      "Observe Przewalski's horse with a horse-correct representation (never lion)",
      'Record a field observation and open ArchiveDex for the collected taxon',
      'Verify offline pack still hashes region-steppe + hero bundles',
    ],
    offlineIntegrityKey: 'regionSteppe',
    status: 'gameplay_tested',
    earthCompleteClaim: false,
    scientificScope:
      "Central Asian Steppe is a game-authored planning twin for Przewalski's horse encounters. Not a surveyed Earth-complete regional catalog; external CoL/GBIF/IUCN fields remain quarantined until approved snapshot import.",
    blockers: [
      'Single authored steppe encounter; not a surveyed regional catalog',
      ...SHARED_BLOCKERS,
    ],
  },
  {
    regionId: 'forest',
    displayName: 'Temperate Forest',
    continents: ['North America', 'Europe'],
    biome: 'forest',
    encounterTaxonIds: [
      'canis_lupus',
      'odocoileus_virginianus',
      'ursus_americanus',
      'formica_rufa',
      'dynastes_hercules',
      'acanthoscurria_geniculata',
    ],
    objectives: [
      'Track wolf / deer / bear with taxon-correct marks',
      'Complete ethical observation without category impersonation',
      'Notebook → ArchiveDex → Lifeling growth path',
    ],
    offlineIntegrityKey: 'regionForest',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'wetland',
    displayName: 'Midwest Wetlands',
    continents: ['North America'],
    biome: 'wetland',
    encounterTaxonIds: [
      'castor_canadensis',
      'lontra_canadensis',
      'anax_junius',
      'libellula_quadrimaculata',
    ],
    objectives: [
      'Observe beaver lodge / otter bank habitats',
      'Dragonfly aerial observation with species kinetics',
      'Save expedition state offline',
    ],
    offlineIntegrityKey: 'regionWetland',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'coastal',
    displayName: 'Pacific Coast',
    continents: ['North America'],
    biome: 'coastal',
    encounterTaxonIds: ['balaenoptera_musculus', 'phoca_vitulina'],
    objectives: [
      'Blue whale pelagic observation pacing',
      'Harbor seal haul-out vigilance loop',
      'Museum return with coastal artifacts',
    ],
    offlineIntegrityKey: 'regionCoastal',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'fossil_site',
    displayName: 'Fossil Dig Site',
    continents: [],
    biome: 'fossil_bed',
    encounterTaxonIds: ['mammuthus_primigenius', 'tyrannosaurus_rex', 'trilobita_order'],
    objectives: [
      'Excavate mammoth / T. rex / trilobite with extinct framing',
      'Label reconstruction uncertainty honestly',
      'ArchiveDex fossil tabs without fake IUCN assessed=true',
    ],
    offlineIntegrityKey: 'regionFossilSite',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'indiana_ancient_swamp',
    displayName: 'Indiana — Ancient Swamp Era',
    continents: ['North America'],
    biome: 'ancient_swamp',
    encounterTaxonIds: ['anax_junius', 'trilobita_order'],
    objectives: [
      'Walk Carboniferous swamp reconstruction paths',
      'Distinguish living analog vs fossil evidence',
      'Keep Time Atlas map gates blocked without approved assets',
    ],
    offlineIntegrityKey: 'regionIndianaSwamp',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'polar_ice',
    displayName: 'Polar Ice Systems',
    continents: ['Antarctica', 'Arctic'],
    biome: 'polar_ice',
    encounterTaxonIds: ['ursus_maritimus'],
    objectives: [
      'Polar bear ice-edge observation',
      'Cryosphere habitat cues without inventing NASA measurements',
      'Offline integrity after polar expedition',
    ],
    offlineIntegrityKey: 'regionPolarIce',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'subterranean_cave',
    displayName: 'Subterranean Cave System',
    continents: [],
    biome: 'subterranean_cave',
    encounterTaxonIds: [],
    objectives: [
      'Explore troglobite / bat authored encounters',
      'Low-light observation UX',
      'Museum notebook sync',
    ],
    offlineIntegrityKey: 'regionCave',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'urban_park',
    displayName: 'Urban / Human-Modified',
    continents: [],
    biome: 'urban_human_modified',
    encounterTaxonIds: [],
    objectives: [
      'Synanthropic species observation loops',
      'Ethical interaction near people',
      'Dex entries for urban taxa',
    ],
    offlineIntegrityKey: 'regionUrban',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'atmospheric_corridor',
    displayName: 'Atmospheric Migration Corridor',
    continents: [],
    biome: 'atmospheric_aerial',
    encounterTaxonIds: [],
    objectives: [
      'Migratory aerial observation pacing',
      'Weather-linked movement without fake NASA raster claims',
      'Companion unlock themes',
    ],
    offlineIntegrityKey: 'regionAtmospheric',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
  {
    regionId: 'deep_marine',
    displayName: 'Deep Marine Pelagic',
    continents: [],
    biome: 'marine_coastal',
    encounterTaxonIds: [],
    objectives: [
      'Pelagic observation of authored marine taxa',
      'Museum return with marine artifacts',
      'Offline pack hash after deep expedition',
    ],
    offlineIntegrityKey: 'regionDeepMarine',
    status: 'runtime_playable',
    earthCompleteClaim: false,
    scientificScope: SCOPE,
    blockers: SHARED_BLOCKERS,
  },
];

export function getRegionExplorationCard(regionId: string): RegionExplorationCard | undefined {
  return REGION_EXPLORATION_CARDS.find((c) => c.regionId === regionId);
}

export function evaluateRegionExploration(
  _card: RegionExplorationCard,
  evidence: {
    portalReachable: boolean;
    taxonEncountered: boolean;
    iconHonest: boolean;
    observationRecorded: boolean;
    offlineIntegrityOk: boolean;
  },
): {
  complete: boolean;
  status: RegionExplorationStatus;
  earthCompleteClaim: false;
  missing: string[];
} {
  const missing: string[] = [];
  if (!evidence.portalReachable) missing.push('portalReachable');
  if (!evidence.taxonEncountered) missing.push('taxonEncountered');
  if (!evidence.iconHonest) missing.push('iconHonest');
  if (!evidence.observationRecorded) missing.push('observationRecorded');
  if (!evidence.offlineIntegrityOk) missing.push('offlineIntegrityOk');

  const complete = missing.length === 0;
  return {
    complete,
    status: complete ? 'gameplay_tested' : 'runtime_playable',
    earthCompleteClaim: false,
    missing,
  };
}

export function assertNoEarthCompleteClaim(card: RegionExplorationCard): void {
  if (card.earthCompleteClaim !== false) {
    throw new Error(`Region ${card.regionId} must not claim Earth-complete catalog`);
  }
}

export function assertRegionDepthFloor(minExploreRegions = 12): void {
  const explore = REGION_EXPLORATION_CARDS.filter((c) => c.regionId !== 'museum');
  if (explore.length < minExploreRegions) {
    throw new Error(`Expected ≥${minExploreRegions} explore region cards, got ${explore.length}`);
  }
  for (const card of REGION_EXPLORATION_CARDS) assertNoEarthCompleteClaim(card);
}
