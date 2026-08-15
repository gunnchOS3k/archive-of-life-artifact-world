/**
 * Lightweight VISUAL pack harness — manifests + headless checks only.
 * Heavy framebuffer capture / Godot soak / large asset-gen are DEFERRED
 * while Product-Use QEMU is active.
 */

export type VisualPackStatus =
  | 'HARNESS_READY'
  | 'CAPTURE_DEFERRED'
  | 'HISTORICAL_ONLY'
  | 'UNAVAILABLE';

export interface VisualPackManifest {
  schema: 'gunnchos.game_rc.visual_pack_harness/v1';
  game: 'archive-of-life-artifact-world';
  packet: 'GAME-RC-004';
  status: VisualPackStatus;
  VISUAL_MODEL_REVIEW: 'UNAVAILABLE';
  surfaces: Array<{ id: string; kind: string; capture: 'DEFERRED' | 'PROCEDURAL_PROXY' }>;
  deferred_heavy_work: string[];
  notes: string;
}

export function buildVisualPackHarness(): VisualPackManifest {
  return {
    schema: 'gunnchos.game_rc.visual_pack_harness/v1',
    game: 'archive-of-life-artifact-world',
    packet: 'GAME-RC-004',
    status: 'HARNESS_READY',
    VISUAL_MODEL_REVIEW: 'UNAVAILABLE',
    surfaces: [
      { id: 'museum_hub', kind: 'world', capture: 'PROCEDURAL_PROXY' },
      { id: 'region_field', kind: 'world', capture: 'PROCEDURAL_PROXY' },
      { id: 'archivedex_modal', kind: 'ui', capture: 'DEFERRED' },
      { id: 'lifeling_customize', kind: 'ui', capture: 'DEFERRED' },
      { id: 'achievement_toast', kind: 'ui', capture: 'DEFERRED' },
      { id: 'credits_overlay', kind: 'ui', capture: 'DEFERRED' },
    ],
    deferred_heavy_work: [
      'large Android/iOS export batches',
      'long Godot soak (N/A — web/canvas title)',
      'repeated video capture of playthrough',
      'large asset-gen / painted remasters',
      'additional QEMU device soaks',
    ],
    notes:
      'Harness + manifest only. No invented pixel critique. VISUAL_MODEL_REVIEW stays UNAVAILABLE until live framebuffer review.',
  };
}
