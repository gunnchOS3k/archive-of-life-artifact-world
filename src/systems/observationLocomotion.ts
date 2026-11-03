/**
 * Observation locomotion modes — drive WildlifeObservation from authored
 * silhouette locomotionCue / behaviorNote without claiming finished models.
 */

import { buildSilhouetteBrief } from '@/systems/flagshipOriginalArtProgress';
import { getFlagshipProfile } from '@/services/flagshipTaxonProfiles';

export type ObservationMotionMode =
  | 'amble'
  | 'bound'
  | 'flutter'
  | 'hover_dart'
  | 'swim_undulate'
  | 'sit_wait'
  | 'scurry'
  | 'static_fossil'
  | 'bipedal'
  | 'climb';

/** Per-taxon overrides — cue strings stay documentation; modes drive motion. */
const TAXON_MODE: Readonly<Record<string, ObservationMotionMode>> = {
  panthera_leo: 'amble',
  loxodonta_africana: 'amble',
  equus_caballus_ferus: 'amble',
  canis_lupus: 'amble',
  ursus_americanus: 'amble',
  ursus_maritimus: 'amble',
  odocoileus_virginianus: 'bound',
  lontra_canadensis: 'swim_undulate',
  castor_canadensis: 'swim_undulate',
  phoca_vitulina: 'swim_undulate',
  balaenoptera_musculus: 'swim_undulate',
  danaus_plexippus: 'flutter',
  apis_mellifera: 'hover_dart',
  bombus_terrestris: 'hover_dart',
  anax_junius: 'hover_dart',
  libellula_quadrimaculata: 'hover_dart',
  formica_rufa: 'scurry',
  latrodectus_mactans: 'sit_wait',
  acanthoscurria_geniculata: 'amble',
  dynastes_hercules: 'climb',
  pachnoda_marginata: 'climb',
  mammuthus_primigenius: 'amble',
  tyrannosaurus_rex: 'bipedal',
  trilobita_order: 'static_fossil',
};

export function resolveObservationMotionMode(
  taxonId: string,
  locomotionCue?: string | null,
  behaviorNote?: string | null,
): ObservationMotionMode {
  if (TAXON_MODE[taxonId]) return TAXON_MODE[taxonId];
  const blob = `${locomotionCue ?? ''} ${behaviorNote ?? ''}`.toLowerCase();
  if (/static|fossil|reconstruction pose|excavation/.test(blob)) return 'static_fossil';
  if (/flutter|migratory glide/.test(blob)) return 'flutter';
  if (/hover|patrol|buzz|dart intercept|sally/.test(blob)) return 'hover_dart';
  if (/swim|fluke|porpoise|undulat|haul-out|dive/.test(blob)) return 'swim_undulate';
  if (/scurr|trail-follow/.test(blob)) return 'scurry';
  if (/sit|web-vibration|wait/.test(blob)) return 'sit_wait';
  if (/climb|trunk|fruit/.test(blob)) return 'climb';
  if (/bipedal|theropod/.test(blob)) return 'bipedal';
  if (/bound|explosive/.test(blob)) return 'bound';
  return 'amble';
}

export function resolveObservationMotionForTaxon(taxonId: string): {
  mode: ObservationMotionMode;
  locomotionCue: string | null;
  behaviorNote: string | null;
  posture: string | null;
  habitatBackdrop: string | null;
  finishedModel: false;
  humanApproved: false;
} {
  const brief = buildSilhouetteBrief(taxonId);
  const profile = getFlagshipProfile(taxonId);
  const locomotionCue = brief?.locomotionCue ?? null;
  const behaviorNote = profile?.behaviorNote ?? null;
  return {
    mode: resolveObservationMotionMode(taxonId, locomotionCue, behaviorNote),
    locomotionCue,
    behaviorNote,
    posture: brief?.posture ?? null,
    habitatBackdrop: brief?.habitatBackdrop ?? null,
    finishedModel: false,
    humanApproved: false,
  };
}

export type ObservationPose = {
  x: number;
  y: number;
  facing: 1 | -1;
  bob: number;
};

/**
 * Advance observation pose for a motion mode.
 * When reducedMotion is true, hold near center (authentic stillness preference).
 */
export function stepObservationPose(
  mode: ObservationMotionMode,
  state: {
    x: number;
    y: number;
    facing: 1 | -1;
    timer: number;
    moveSpeedPx: number;
    baseY: number;
    canvasWidth: number;
    canvasHeight: number;
  },
  dt: number,
  reducedMotion: boolean,
): ObservationPose {
  const margin = 80;
  const minX = margin;
  const maxX = Math.max(margin + 1, state.canvasWidth - margin);
  let { x, facing } = state;
  const baseY = state.baseY;
  const timer = state.timer;
  let bob = 0;

  if (reducedMotion || mode === 'static_fossil' || mode === 'sit_wait') {
    const holdX = state.canvasWidth / 2 + (mode === 'sit_wait' ? 12 : 0);
    bob = mode === 'sit_wait' && !reducedMotion ? Math.sin(timer * 1.2) * 1.5 : 0;
    return { x: holdX, y: baseY + bob, facing: 1, bob };
  }

  const speed =
    mode === 'scurry'
      ? state.moveSpeedPx * 1.35
      : mode === 'flutter' || mode === 'hover_dart'
        ? state.moveSpeedPx * 1.1
        : mode === 'bound'
          ? state.moveSpeedPx * 1.2
          : state.moveSpeedPx;

  if (mode === 'hover_dart') {
    const dart = Math.abs(Math.sin(timer * 2.4)) > 0.92 ? 2.2 : 0.55;
    x += facing * speed * dart * dt;
    bob = Math.sin(timer * 5) * 6;
  } else if (mode === 'flutter') {
    x += facing * speed * dt;
    bob = Math.sin(timer * 14) * 10 + Math.sin(timer * 3) * 4;
  } else if (mode === 'swim_undulate') {
    x += facing * speed * 0.85 * dt;
    bob = Math.sin(timer * 3.2) * 8;
  } else if (mode === 'bound') {
    x += facing * speed * dt;
    bob = Math.max(0, Math.sin(timer * 6)) * 18;
  } else if (mode === 'scurry') {
    x += facing * speed * dt;
    bob = Math.sin(timer * 20) * 2;
  } else if (mode === 'climb') {
    x += facing * speed * 0.45 * dt;
    bob = Math.sin(timer * 2) * 4 - 8;
  } else if (mode === 'bipedal') {
    x += facing * speed * 0.9 * dt;
    bob = Math.abs(Math.sin(timer * 4)) * 6;
  } else {
    x += facing * speed * dt;
    bob = Math.sin(timer * 3.5) * 3;
  }

  if (x < minX) {
    x = minX;
    facing = 1;
  } else if (x > maxX) {
    x = maxX;
    facing = -1;
  }

  return { x, y: baseY + bob, facing, bob };
}
