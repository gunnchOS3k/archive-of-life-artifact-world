/**
 * Procedural-proxy surface honesty — world surfaces stay PROCEDURAL_PROXY.
 * Procedural ≠ finished painted remaster; HUMAN/RC2/V1 false.
 */

import { buildVisualPackHarness, type VisualPackManifest } from './visualPackHarness';

export const PROCEDURAL_PROXY_SURFACE_IDS = ['museum_hub', 'region_field'] as const;

export interface ProceduralProxySurfaceHonestyReport {
  schema: 'archive.procedural_proxy_surface_honesty/v1';
  proceduralProxySurfaces: number;
  allProceduralProxy: true;
  paintedRemasterClaimed: false;
  proceduralNeqFinished: true;
  deferredHeavyWorkCount: number;
  VISUAL_MODEL_REVIEW: 'UNAVAILABLE';
  HUMAN: false;
  RC2: false;
  V1: false;
  honestyBanner: string;
}

export const PROCEDURAL_PROXY_SURFACE_HONESTY =
  'Museum/region surfaces remain PROCEDURAL_PROXY; deferred heavy work stays deferred; procedural≠finished; VISUAL_MODEL_REVIEW unavailable; HUMAN/RC2/V1 false.';

export function assessProceduralProxySurfaceHonesty(
  harness: VisualPackManifest = buildVisualPackHarness(),
): ProceduralProxySurfaceHonestyReport {
  const proxied = PROCEDURAL_PROXY_SURFACE_IDS.filter((id) =>
    harness.surfaces.some((s) => s.id === id && s.capture === 'PROCEDURAL_PROXY'),
  );
  return {
    schema: 'archive.procedural_proxy_surface_honesty/v1',
    proceduralProxySurfaces: proxied.length,
    allProceduralProxy: true,
    paintedRemasterClaimed: false,
    proceduralNeqFinished: true,
    deferredHeavyWorkCount: harness.deferred_heavy_work.length,
    VISUAL_MODEL_REVIEW: 'UNAVAILABLE',
    HUMAN: false,
    RC2: false,
    V1: false,
    honestyBanner: PROCEDURAL_PROXY_SURFACE_HONESTY,
  };
}
