/**
 * Flagship original-art progress beyond emoji identity marks.
 * Advancing to procedural_candidate / silhouette briefs ≠ finished models.
 */

import {
  FLAGSHIP_OBSERVATION_PROFILES,
  assertFlagshipArtHonesty,
  flagshipArtStatusLabel,
  listFlagshipTaxonIds,
  type FinalArtStatus,
  type FlagshipObservationProfile,
} from '@/services/flagshipTaxonProfiles';

export type SilhouetteBrief = {
  taxonId: string;
  posture: string;
  anatomyFocus: string[];
  locomotionCue: string;
  habitatBackdrop: string;
  /** Procedural / authored brief only — not a packaged final asset. */
  assetKind: 'silhouette_brief';
  finishedModel: false;
  humanApproved: false;
};

export type FlagshipArtProgressRow = {
  taxonId: string;
  scientificName: string;
  representationMark: string;
  priorStatus: FinalArtStatus;
  currentStatus: FinalArtStatus;
  artStatusLabel: string;
  silhouetteBrief: SilhouetteBrief | null;
  emojiEqualsFinished: false;
  finishedModelClaimed: false;
  originalArtApproved: false;
  progressNote: string;
};

export type FlagshipArtProgressReport = {
  schema: 'aol.flagship_original_art_progress.v1';
  generatedAt: string;
  flagshipCount: number;
  proceduralCandidateCount: number;
  emojiIdentityCount: number;
  finishedModelsClaimed: false;
  emojiEqualsFinished: false;
  anyHumanApprovedFinal: false;
  rows: FlagshipArtProgressRow[];
  rule: string;
};

/** First-wave species advancing emoji → procedural silhouette briefs. */
export const PROCEDURAL_ART_WAVE1: readonly string[] = [
  'panthera_leo',
  'loxodonta_africana',
  'equus_caballus_ferus',
  'mammuthus_primigenius',
  'canis_lupus',
  'balaenoptera_musculus',
] as const;

/** Second-wave briefs — still procedural candidates, never finished models. */
export const PROCEDURAL_ART_WAVE2: readonly string[] = [
  'odocoileus_virginianus',
  'ursus_americanus',
  'danaus_plexippus',
  'tyrannosaurus_rex',
  'lontra_canadensis',
  'castor_canadensis',
] as const;

/** Third-wave briefs — still procedural candidates, never finished models. */
export const PROCEDURAL_ART_WAVE3: readonly string[] = [
  'phoca_vitulina',
  'apis_mellifera',
  'ursus_maritimus',
  'anax_junius',
  'dynastes_hercules',
  'trilobita_order',
] as const;

/** Fourth-wave briefs — closes remaining emoji identity candidates; still not finished models. */
export const PROCEDURAL_ART_WAVE4: readonly string[] = [
  'formica_rufa',
  'bombus_terrestris',
  'latrodectus_mactans',
  'libellula_quadrimaculata',
  'acanthoscurria_geniculata',
  'pachnoda_marginata',
] as const;

export const PROCEDURAL_ART_WAVES: readonly string[] = [
  ...PROCEDURAL_ART_WAVE1,
  ...PROCEDURAL_ART_WAVE2,
  ...PROCEDURAL_ART_WAVE3,
  ...PROCEDURAL_ART_WAVE4,
] as const;

const SILHOUETTE_BRIEFS: Record<string, Omit<SilhouetteBrief, 'taxonId' | 'assetKind' | 'finishedModel' | 'humanApproved'>> = {
  panthera_leo: {
    posture: 'lateral walk cycle, head slightly below withers',
    anatomyFocus: ['mane mass (male adult candidate)', 'digitigrade limbs', 'long counterbalancing tail'],
    locomotionCue: 'ambulatory stalk → short bound',
    habitatBackdrop: 'open grassland / termite-mound vantage',
  },
  loxodonta_africana: {
    posture: '¾ front-quarter with trunk mid-reach',
    anatomyFocus: ['large ears', 'columnar limbs', 'trunk tip finger cues'],
    locomotionCue: 'slow amble, weight-shift honesty',
    habitatBackdrop: 'watering hole / acacia browse',
  },
  equus_caballus_ferus: {
    posture: 'alert stand, erect dorsal mane',
    anatomyFocus: ['stocky Przewalski proportions', 'erect mane (not domestic fall)', 'short convex profile'],
    locomotionCue: 'steppe trot readiness',
    habitatBackdrop: 'Asian steppe — never African savanna substitution',
  },
  mammuthus_primigenius: {
    posture: 'lateral with curved tusks forward',
    anatomyFocus: ['high shoulder hump', 'curved tusks', 'woolly coat mass'],
    locomotionCue: 'heavy amble on mammoth-steppe',
    habitatBackdrop: 'Pleistocene steppe / frozen silt — reconstruction framing',
  },
  canis_lupus: {
    posture: 'forward stalk, ears high',
    anatomyFocus: ['long legs', 'bushy tail carriage', 'narrow chest'],
    locomotionCue: 'trot → brief lope',
    habitatBackdrop: 'forest-edge pack trail',
  },
  balaenoptera_musculus: {
    posture: 'lateral surface skim with blow',
    anatomyFocus: ['elongate body', 'small dorsal fin placement', 'baleen-mouth mass'],
    locomotionCue: 'slow fluke drive',
    habitatBackdrop: 'upwelling / krill patch — pelagic',
  },
  odocoileus_virginianus: {
    posture: 'alert freeze, ears flared, white flag ready',
    anatomyFocus: ['white rump flag', 'antler candidate (buck seasonal)', 'slender legs'],
    locomotionCue: 'browse pause → explosive bound',
    habitatBackdrop: 'oak-edge browse / creek crossing — Nearctic forest margin',
  },
  ursus_americanus: {
    posture: '¾ rear-quarter forage stand',
    anatomyFocus: ['rounded ear profile', 'plantigrade gait mass', 'short tail'],
    locomotionCue: 'amble → brief gallop',
    habitatBackdrop: 'mixed forest berry / mast forage — not polar substitution',
  },
  danaus_plexippus: {
    posture: 'open-wing glide, dorsal orange field visible',
    anatomyFocus: ['veined wing panel', 'clubbed antennae', 'slender body'],
    locomotionCue: 'flutter → sustained migratory glide',
    habitatBackdrop: 'milkweed corridor / roost cluster — migratory honesty',
  },
  tyrannosaurus_rex: {
    posture: 'lateral mid-stride, skull foreshortened',
    anatomyFocus: ['massive skull', 'reduced forelimbs', 'bipedal balance tail'],
    locomotionCue: 'heavy bipedal walk — reconstruction framing',
    habitatBackdrop: 'Late Cretaceous floodplain — fossil reconstruction, not living zoo',
  },
  lontra_canadensis: {
    posture: 'streamside stretch with arched back',
    anatomyFocus: ['streamlined body', 'webbed feet cue', 'tapered tail'],
    locomotionCue: 'porpoise swim → bank scramble',
    habitatBackdrop: 'riparian pool / beaver-influenced waterway',
  },
  castor_canadensis: {
    posture: 'sitting haul-out with flat tail visible',
    anatomyFocus: ['paddle tail', 'large incisor focus', 'waterproof coat mass'],
    locomotionCue: 'waddle → powerful swim kick',
    habitatBackdrop: 'lodge pond / felled aspen shoreline',
  },
  phoca_vitulina: {
    posture: 'haul-out side profile, head raised',
    anatomyFocus: ['spotted coat candidate', 'hind-flipper stance', 'whisker mass'],
    locomotionCue: 'undulating swim → awkward haul-out',
    habitatBackdrop: 'rocky intertidal / harbor haul-out',
  },
  apis_mellifera: {
    posture: '¾ hover over blossom',
    anatomyFocus: ['pollen baskets', 'banded abdomen', 'transparent wing pair'],
    locomotionCue: 'hover → straight-line forage flight',
    habitatBackdrop: 'meadow blossom / hive-adjacent forage',
  },
  ursus_maritimus: {
    posture: 'lateral walk on ice edge',
    anatomyFocus: ['elongate neck', 'large plantigrade paws', 'insulating bulk'],
    locomotionCue: 'steady ice-edge amble',
    habitatBackdrop: 'sea-ice margin / polar coastal — never temperate forest substitution',
  },
  anax_junius: {
    posture: 'hover with wings horizontal',
    anatomyFocus: ['elongate abdomen', 'large compound eyes', 'paired wing planes'],
    locomotionCue: 'patrol hover → dart intercept',
    habitatBackdrop: 'pond margin / open water patrol lane',
  },
  dynastes_hercules: {
    posture: '¾ front with thoracic horn forward',
    anatomyFocus: ['thoracic horn', 'elytra mass', 'powerful forelegs'],
    locomotionCue: 'deliberate climb on trunk',
    habitatBackdrop: 'Neotropical canopy / rotting log stage',
  },
  trilobita_order: {
    posture: 'dorsal fossil plate, cephalon forward',
    anatomyFocus: ['cephalon shield', 'thoracic segments', 'pygidium'],
    locomotionCue: 'static reconstruction pose — not a living gait claim',
    habitatBackdrop: 'Paleozoic seafloor reconstruction — fossil framing only',
  },
  formica_rufa: {
    posture: 'lateral worker with raised antennae',
    anatomyFocus: ['narrow waist', 'mandible cue', 'segmented antennae'],
    locomotionCue: 'trail-follow scurries',
    habitatBackdrop: 'wood-ant mound / forest floor trail',
  },
  bombus_terrestris: {
    posture: '¾ hover at flower face',
    anatomyFocus: ['fuzzy thorax', 'banded abdomen', 'pollen-laden legs'],
    locomotionCue: 'heavy buzz hover → short forage hop',
    habitatBackdrop: 'meadow clover / nest-bank forage',
  },
  latrodectus_mactans: {
    posture: 'inverted web sit, abdomen down',
    anatomyFocus: ['globose abdomen', 'hourglass mark candidate', 'slender legs'],
    locomotionCue: 'web-vibration wait — not a chase predator claim',
    habitatBackdrop: 'sheltered web niche / debris overhang',
  },
  libellula_quadrimaculata: {
    posture: 'perch with wings outspread',
    anatomyFocus: ['four wing spots', 'broad abdomen', 'compound eyes'],
    locomotionCue: 'perch → short territorial sally',
    habitatBackdrop: 'marsh edge / sunlit reed perch',
  },
  acanthoscurria_geniculata: {
    posture: 'forward threat-display candidate, legs spread',
    anatomyFocus: ['banded leg joints', 'robust cephalothorax', 'urticating-hair framing'],
    locomotionCue: 'deliberate terrestrial walk',
    habitatBackdrop: 'Neotropical leaf litter / burrow mouth — husbandry not wild claim',
  },
  pachnoda_marginata: {
    posture: '¾ dorsal on fruit surface',
    anatomyFocus: ['shield-shaped elytra', 'margin contrast', 'clubbed antennae'],
    locomotionCue: 'clumsy climb → short buzz flight',
    habitatBackdrop: 'fruiting canopy / rotting fruit stage',
  },
};

const RULE =
  'Original-art progress may advance emoji → procedural silhouette briefs; emoji never equals finished art; human approval still required for final assets.';

export function buildSilhouetteBrief(taxonId: string): SilhouetteBrief | null {
  const brief = SILHOUETTE_BRIEFS[taxonId];
  if (!brief) return null;
  return {
    taxonId,
    ...brief,
    assetKind: 'silhouette_brief',
    finishedModel: false,
    humanApproved: false,
  };
}

/** Effective art status after wave-1/2 procedural progress (does not mutate profiles). */
export function effectiveFlagshipArtStatus(profile: FlagshipObservationProfile): FinalArtStatus {
  assertFlagshipArtHonesty(profile);
  if (PROCEDURAL_ART_WAVES.includes(profile.taxonId)) {
    if (profile.finalArtStatus === 'emoji_identity_candidate') {
      return 'procedural_candidate';
    }
  }
  return profile.finalArtStatus;
}

function proceduralWaveNote(taxonId: string): string {
  if (PROCEDURAL_ART_WAVE4.includes(taxonId)) {
    return 'Wave-4 silhouette brief authored; still not a finished model';
  }
  if (PROCEDURAL_ART_WAVE3.includes(taxonId)) {
    return 'Wave-3 silhouette brief authored; still not a finished model';
  }
  if (PROCEDURAL_ART_WAVE2.includes(taxonId)) {
    return 'Wave-2 silhouette brief authored; still not a finished model';
  }
  if (PROCEDURAL_ART_WAVE1.includes(taxonId)) {
    return 'Wave-1 silhouette brief authored; still not a finished model';
  }
  return 'Remains emoji identity candidate — not finished';
}

export function buildFlagshipOriginalArtProgressReport(
  generatedAt = new Date().toISOString(),
): FlagshipArtProgressReport {
  const rows: FlagshipArtProgressRow[] = listFlagshipTaxonIds().map((id) => {
    const profile = FLAGSHIP_OBSERVATION_PROFILES[id];
    assertFlagshipArtHonesty(profile);
    const currentStatus = effectiveFlagshipArtStatus(profile);
    const silhouetteBrief = currentStatus === 'procedural_candidate' ? buildSilhouetteBrief(id) : null;
    const priorStatus: FinalArtStatus = PROCEDURAL_ART_WAVES.includes(id)
      ? 'emoji_identity_candidate'
      : profile.finalArtStatus;
    return {
      taxonId: profile.taxonId,
      scientificName: profile.scientificName,
      representationMark: profile.representationMark,
      priorStatus,
      currentStatus,
      artStatusLabel:
        currentStatus === 'procedural_candidate'
          ? 'Art status: procedural candidate (silhouette brief — not human-approved final art)'
          : flagshipArtStatusLabel(profile),
      silhouetteBrief,
      emojiEqualsFinished: false,
      finishedModelClaimed: false,
      originalArtApproved: false,
      progressNote: proceduralWaveNote(id),
    };
  });

  return {
    schema: 'aol.flagship_original_art_progress.v1',
    generatedAt,
    flagshipCount: rows.length,
    proceduralCandidateCount: rows.filter((r) => r.currentStatus === 'procedural_candidate').length,
    emojiIdentityCount: rows.filter((r) => r.currentStatus === 'emoji_identity_candidate').length,
    finishedModelsClaimed: false,
    emojiEqualsFinished: false,
    anyHumanApprovedFinal: false,
    rows,
    rule: RULE,
  };
}

export function assertFlagshipOriginalArtProgress(report: FlagshipArtProgressReport): void {
  if (report.finishedModelsClaimed || report.emojiEqualsFinished || report.anyHumanApprovedFinal) {
    throw new Error('Art progress must not claim finished/approved finals');
  }
  if (report.flagshipCount !== 24) {
    throw new Error(`Expected 24 flagships, got ${report.flagshipCount}`);
  }
  if (report.proceduralCandidateCount < 1) {
    throw new Error('Wave-1 art progress expects at least one procedural candidate');
  }
  for (const row of report.rows) {
    if (row.emojiEqualsFinished || row.finishedModelClaimed || row.originalArtApproved) {
      throw new Error(`Honesty violation: ${row.taxonId}`);
    }
    if (row.currentStatus === 'final_asset_human_approved') {
      throw new Error(`Honesty violation: ${row.taxonId} auto human-approved`);
    }
    if (row.silhouetteBrief) {
      if (row.silhouetteBrief.finishedModel || row.silhouetteBrief.humanApproved) {
        throw new Error(`Silhouette brief ${row.taxonId} claimed finished/approved`);
      }
    }
  }
}

export function renderFlagshipOriginalArtProgressHtml(
  report: FlagshipArtProgressReport = buildFlagshipOriginalArtProgressReport(),
): string {
  assertFlagshipOriginalArtProgress(report);
  return [
    '<aside class="flagship-art-progress" data-emoji-finished="false" data-procedural-wave="4" role="note">',
    `<p><strong>Original art progress:</strong> ${report.proceduralCandidateCount}/${report.flagshipCount} flagships have procedural silhouette briefs (waves 1–4) — emoji ≠ finished; human-approved finals still pending.</p>`,
    `<p>finishedModelsClaimed=false · humanApproved=false · ${escapeHtml(report.rule)}</p>`,
    '</aside>',
  ].join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
