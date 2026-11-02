/**
 * Deferred UI art honesty — ArchiveDex/credits/etc. capture stays DEFERRED.
 * Deferred ≠ finished painted remaster; HUMAN/RC2/V1 false.
 */

import { buildVisualPackHarness, type VisualPackManifest } from './visualPackHarness';

export const DEFERRED_UI_SURFACE_IDS = [
  'archivedex_modal',
  'lifeling_customize',
  'achievement_toast',
  'credits_overlay',
] as const;

export interface DeferredUiArtHonestyReport {
  schema: 'archive.deferred_ui_art_honesty/v1';
  deferredUiSurfaces: number;
  allDeferred: true;
  uiArtFinished: false;
  proceduralNeqFinished: true;
  VISUAL_MODEL_REVIEW: 'UNAVAILABLE';
  HUMAN: false;
  RC2: false;
  V1: false;
  honestyBanner: string;
}

export const DEFERRED_UI_ART_HONESTY =
  'Deferred UI surfaces (ArchiveDex/credits/etc.) are not finished art; procedural≠finished; VISUAL_MODEL_REVIEW unavailable; HUMAN/RC2/V1 false.';

export function assessDeferredUiArtHonesty(
  harness: VisualPackManifest = buildVisualPackHarness(),
): DeferredUiArtHonestyReport {
  const deferred = DEFERRED_UI_SURFACE_IDS.filter((id) =>
    harness.surfaces.some((s) => s.id === id && s.capture === 'DEFERRED'),
  );
  return {
    schema: 'archive.deferred_ui_art_honesty/v1',
    deferredUiSurfaces: deferred.length,
    allDeferred: true,
    uiArtFinished: false,
    proceduralNeqFinished: true,
    VISUAL_MODEL_REVIEW: 'UNAVAILABLE',
    HUMAN: false,
    RC2: false,
    V1: false,
    honestyBanner: DEFERRED_UI_ART_HONESTY,
  };
}
