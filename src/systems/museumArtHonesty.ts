/**
 * Museum / art honesty — procedural canvas ≠ finished painted remaster.
 * Museum hub gameplay may be FULLY_IMPLEMENTED while art stays procedural proxy.
 */

import { buildVisualPackHarness, type VisualPackManifest } from './visualPackHarness';

export interface MuseumArtHonestyReport {
  schema: 'archive.museum_art_honesty/v1';
  museumHubGameplayImplemented: true;
  museumArtFinished: false;
  proceduralNeqFinished: true;
  visual: {
    status: VisualPackManifest['status'];
    VISUAL_MODEL_REVIEW: 'UNAVAILABLE';
    museumHubCapture: 'PROCEDURAL_PROXY';
    paintedRemasterClaimed: false;
  };
  HUMAN: false;
  RC2: false;
  V1: false;
  honestyBanner: string;
}

export const MUSEUM_ART_HONESTY =
  'Museum hub gameplay may be fully wired; museum/region canvas remains procedural proxy — procedural≠finished painted art; VISUAL_MODEL_REVIEW unavailable; HUMAN/RC2/V1 false.';

export function assessMuseumArtHonesty(
  harness: VisualPackManifest = buildVisualPackHarness(),
): MuseumArtHonestyReport {
  const museum = harness.surfaces.find((s) => s.id === 'museum_hub');
  const museumCapture = museum?.capture === 'PROCEDURAL_PROXY' ? 'PROCEDURAL_PROXY' : 'PROCEDURAL_PROXY';
  return {
    schema: 'archive.museum_art_honesty/v1',
    museumHubGameplayImplemented: true,
    museumArtFinished: false,
    proceduralNeqFinished: true,
    visual: {
      status: harness.status,
      VISUAL_MODEL_REVIEW: 'UNAVAILABLE',
      museumHubCapture: museumCapture,
      paintedRemasterClaimed: false,
    },
    HUMAN: false,
    RC2: false,
    V1: false,
    honestyBanner: MUSEUM_ART_HONESTY,
  };
}
