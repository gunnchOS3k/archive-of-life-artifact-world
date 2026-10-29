/**
 * Flagship 24 — species-specific art/behavior/habitat honesty.
 * Emoji / procedural marks are identity candidates, never final art approval.
 */

export type FinalArtStatus =
  | 'emoji_identity_candidate'
  | 'procedural_candidate'
  | 'final_asset_candidate'
  | 'final_asset_human_approved';

export interface FlagshipObservationProfile {
  taxonId: string;
  scientificName: string;
  moveSpeedPx: number;
  baseAlertness: number;
  patienceGain: number;
  patienceDecay: number;
  alertDecayWhileHolding: number;
  alertRiseIdle: number;
  habitatCues: string[];
  behaviorNote: string;
  representationMark: string;
  finalArtStatus: FinalArtStatus;
  genericIconForbiddenAsFinal: true;
}

const DEFAULTS: Omit<
  FlagshipObservationProfile,
  'taxonId' | 'scientificName' | 'habitatCues' | 'behaviorNote' | 'representationMark'
> = {
  moveSpeedPx: 30,
  baseAlertness: 30,
  patienceGain: 25,
  patienceDecay: 5,
  alertDecayWhileHolding: 15,
  alertRiseIdle: 10,
  finalArtStatus: 'emoji_identity_candidate',
  genericIconForbiddenAsFinal: true,
};

/** Authored observation kinetics — not IUCN/PBDB claims. */
export const FLAGSHIP_OBSERVATION_PROFILES: Record<string, FlagshipObservationProfile> = {
  panthera_leo: {
    ...DEFAULTS,
    taxonId: 'panthera_leo',
    scientificName: 'Panthera leo',
    moveSpeedPx: 42,
    baseAlertness: 45,
    habitatCues: ['open grassland', 'pride shade', 'termite mound vantage'],
    behaviorNote: 'Social pride hunter; cooperative group living — observe from distance',
    representationMark: '🦁',
  },
  loxodonta_africana: {
    ...DEFAULTS,
    taxonId: 'loxodonta_africana',
    scientificName: 'Loxodonta africana',
    moveSpeedPx: 18,
    baseAlertness: 35,
    patienceGain: 18,
    habitatCues: ['watering hole', 'acacia browse', 'dust wallow'],
    behaviorNote: 'Matriarchal herd browser; slow deliberate movement',
    representationMark: '🐘',
  },
  canis_lupus: {
    ...DEFAULTS,
    taxonId: 'canis_lupus',
    scientificName: 'Canis lupus',
    moveSpeedPx: 48,
    baseAlertness: 55,
    habitatCues: ['forest edge', 'pack trail', 'howl ridge'],
    behaviorNote: 'Pack hunter with high vigilance at forest margins',
    representationMark: '🐺',
  },
  odocoileus_virginianus: {
    ...DEFAULTS,
    taxonId: 'odocoileus_virginianus',
    scientificName: 'Odocoileus virginianus',
    moveSpeedPx: 55,
    baseAlertness: 60,
    habitatCues: ['browse edge', 'oak mast', 'creek crossing'],
    behaviorNote: 'Flight-prone browser; startle threshold is low',
    representationMark: '🦌',
  },
  balaenoptera_musculus: {
    ...DEFAULTS,
    taxonId: 'balaenoptera_musculus',
    scientificName: 'Balaenoptera musculus',
    moveSpeedPx: 22,
    baseAlertness: 20,
    patienceGain: 12,
    habitatCues: ['upwelling zone', 'krill patch', 'surface blow'],
    behaviorNote: 'Pelagic filter feeder; long calm observation windows',
    representationMark: '🐋',
  },
  ursus_americanus: {
    ...DEFAULTS,
    taxonId: 'ursus_americanus',
    scientificName: 'Ursus americanus',
    moveSpeedPx: 28,
    baseAlertness: 40,
    habitatCues: ['berry thicket', 'fallen log', 'den slope'],
    behaviorNote: 'Opportunistic omnivore; alert near food caches',
    representationMark: '🐻',
  },
  castor_canadensis: {
    ...DEFAULTS,
    taxonId: 'castor_canadensis',
    scientificName: 'Castor canadensis',
    moveSpeedPx: 16,
    baseAlertness: 50,
    habitatCues: ['lodge pool', 'gnawed aspen', 'dam crest'],
    behaviorNote: 'Semiquatic engineer; dives when startled',
    representationMark: '🦫',
  },
  lontra_canadensis: {
    ...DEFAULTS,
    taxonId: 'lontra_canadensis',
    scientificName: 'Lontra canadensis',
    moveSpeedPx: 38,
    baseAlertness: 35,
    habitatCues: ['river bend', 'slide bank', 'fish eddy'],
    behaviorNote: 'Playful aquatic predator; quick bank-to-water transitions',
    representationMark: '🦦',
  },
  phoca_vitulina: {
    ...DEFAULTS,
    taxonId: 'phoca_vitulina',
    scientificName: 'Phoca vitulina',
    moveSpeedPx: 20,
    baseAlertness: 45,
    habitatCues: ['haul-out rock', 'tidal flat', 'kelp edge'],
    behaviorNote: 'Coastal pinniped; haul-out vigilance toward shore approach',
    representationMark: '🦭',
  },
  equus_caballus_ferus: {
    ...DEFAULTS,
    taxonId: 'equus_caballus_ferus',
    scientificName: 'Equus ferus przewalskii',
    moveSpeedPx: 50,
    baseAlertness: 50,
    habitatCues: ['steppe wind', 'shortgrass forage', 'dust plume'],
    behaviorNote: 'Asian steppe wild horse — never lion-coded representation',
    representationMark: '🐴',
  },
  danaus_plexippus: {
    ...DEFAULTS,
    taxonId: 'danaus_plexippus',
    scientificName: 'Danaus plexippus',
    moveSpeedPx: 70,
    baseAlertness: 15,
    patienceGain: 35,
    habitatCues: ['milkweed patch', 'nectar corridor', 'sunfleck'],
    behaviorNote: 'Migratory lepidopteran; erratic flutter path',
    representationMark: '🦋',
  },
  apis_mellifera: {
    ...DEFAULTS,
    taxonId: 'apis_mellifera',
    scientificName: 'Apis mellifera',
    moveSpeedPx: 65,
    baseAlertness: 25,
    habitatCues: ['flower cluster', 'hive traffic', 'pollen basket'],
    behaviorNote: 'Eusocial forager; short hover then dart',
    representationMark: '🐝',
  },
  formica_rufa: {
    ...DEFAULTS,
    taxonId: 'formica_rufa',
    scientificName: 'Formica rufa',
    moveSpeedPx: 25,
    baseAlertness: 40,
    habitatCues: ['mound trail', 'pine needle thatch', 'aphid farm'],
    behaviorNote: 'Wood ant colony traffic; trail-following motion',
    representationMark: '🐜',
  },
  anax_junius: {
    ...DEFAULTS,
    taxonId: 'anax_junius',
    scientificName: 'Anax junius',
    moveSpeedPx: 80,
    baseAlertness: 20,
    habitatCues: ['pond margin', 'reed perch', 'aerial hunt'],
    behaviorNote: 'Aerial hawker; rapid patrol loops',
    representationMark: '🪰',
  },
  latrodectus_mactans: {
    ...DEFAULTS,
    taxonId: 'latrodectus_mactans',
    scientificName: 'Latrodectus mactans',
    moveSpeedPx: 8,
    baseAlertness: 70,
    patienceGain: 15,
    habitatCues: ['web retreat', 'ground clutter', 'egg sac shade'],
    behaviorNote: 'Sit-and-wait; low locomotion, high startle',
    representationMark: '🕷️',
  },
  dynastes_hercules: {
    ...DEFAULTS,
    taxonId: 'dynastes_hercules',
    scientificName: 'Dynastes hercules',
    moveSpeedPx: 14,
    baseAlertness: 25,
    habitatCues: ['rotting log', 'canopy drip', 'night branch'],
    behaviorNote: 'Heavy scarab; slow terrestrial crawl',
    representationMark: '🪲',
  },
  libellula_quadrimaculata: {
    ...DEFAULTS,
    taxonId: 'libellula_quadrimaculata',
    scientificName: 'Libellula quadrimaculata',
    moveSpeedPx: 75,
    baseAlertness: 22,
    habitatCues: ['sunny pond', 'perch stick', 'territorial beat'],
    behaviorNote: 'Skimmer territory flights over still water',
    representationMark: '🪰',
  },
  bombus_terrestris: {
    ...DEFAULTS,
    taxonId: 'bombus_terrestris',
    scientificName: 'Bombus terrestris',
    moveSpeedPx: 55,
    baseAlertness: 28,
    habitatCues: ['clover patch', 'nest burrow', 'buzz pollination'],
    behaviorNote: 'Bumblebee forager; heavier flight than honeybee',
    representationMark: '🐝',
  },
  acanthoscurria_geniculata: {
    ...DEFAULTS,
    taxonId: 'acanthoscurria_geniculata',
    scientificName: 'Acanthoscurria geniculata',
    moveSpeedPx: 12,
    baseAlertness: 55,
    habitatCues: ['burrow mouth', 'leaf litter', 'nocturnal forage'],
    behaviorNote: 'Terrestrial tarantula; deliberate stalking gait',
    representationMark: '🕷️',
  },
  pachnoda_marginata: {
    ...DEFAULTS,
    taxonId: 'pachnoda_marginata',
    scientificName: 'Pachnoda marginata',
    moveSpeedPx: 20,
    baseAlertness: 30,
    habitatCues: ['fruit fall', 'savanna litter', 'dung edge'],
    behaviorNote: 'Flower beetle; short hops between fruit',
    representationMark: '🪲',
  },
  mammuthus_primigenius: {
    ...DEFAULTS,
    taxonId: 'mammuthus_primigenius',
    scientificName: 'Mammuthus primigenius',
    moveSpeedPx: 16,
    baseAlertness: 30,
    habitatCues: ['mammoth steppe', 'tusk polish', 'frozen silt'],
    behaviorNote: 'Extinct megafauna reconstruction — fossil/excavation framing',
    representationMark: '🦣',
  },
  tyrannosaurus_rex: {
    ...DEFAULTS,
    taxonId: 'tyrannosaurus_rex',
    scientificName: 'Tyrannosaurus rex',
    moveSpeedPx: 24,
    baseAlertness: 40,
    habitatCues: ['floodplain track', 'bonebed', 'Cretaceous forest'],
    behaviorNote: 'Extinct apex theropod — excavation / reconstruction loop',
    representationMark: '🦖',
  },
  trilobita_order: {
    ...DEFAULTS,
    taxonId: 'trilobita_order',
    scientificName: 'Trilobita',
    moveSpeedPx: 10,
    baseAlertness: 10,
    patienceGain: 20,
    habitatCues: ['Cambrian seafloor', 'molt assemblage', 'shale lamina'],
    behaviorNote: 'Representative trilobite group — order-level honesty, not a single species icon as Earth-complete',
    representationMark: '🦴',
  },
  ursus_maritimus: {
    ...DEFAULTS,
    taxonId: 'ursus_maritimus',
    scientificName: 'Ursus maritimus',
    moveSpeedPx: 32,
    baseAlertness: 48,
    habitatCues: ['sea ice edge', 'seal breathing hole', 'pressure ridge'],
    behaviorNote: 'Arctic marine mammal predator; ice-edge stalking',
    representationMark: '🐻',
  },
};

export function getFlagshipProfile(taxonId: string): FlagshipObservationProfile | undefined {
  return FLAGSHIP_OBSERVATION_PROFILES[taxonId];
}

export function listFlagshipTaxonIds(): string[] {
  return Object.keys(FLAGSHIP_OBSERVATION_PROFILES);
}

export function assertFlagshipArtHonesty(profile: FlagshipObservationProfile): void {
  if (profile.finalArtStatus === 'final_asset_human_approved') {
    throw new Error(
      `Flagship ${profile.taxonId}: final art must not be auto-approved; human review required`,
    );
  }
  if (!profile.genericIconForbiddenAsFinal) {
    throw new Error(`Flagship ${profile.taxonId}: generic icon cannot count as final art`);
  }
  if (!profile.representationMark || profile.representationMark === '◇') {
    throw new Error(`Flagship ${profile.taxonId}: missing species-specific representation mark`);
  }
}
