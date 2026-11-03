import { describe, expect, it } from 'vitest';
import {
  drawObservationSilhouetteStub,
  silhouetteStubMeta,
} from '@/systems/observationSilhouette';
import type { ObservationMotionMode } from '@/systems/observationLocomotion';

const MODES: ObservationMotionMode[] = [
  'amble',
  'bound',
  'flutter',
  'hover_dart',
  'swim_undulate',
  'sit_wait',
  'scurry',
  'static_fossil',
  'bipedal',
  'climb',
];

describe('observationSilhouette', () => {
  it('marks every mode stub as procedural ≠ finished', () => {
    for (const mode of MODES) {
      const meta = silhouetteStubMeta(mode);
      expect(meta.finishedModel).toBe(false);
      expect(meta.humanApproved).toBe(false);
      expect(meta.assetKind).toBe('procedural_silhouette_stub');
    }
  });

  it('draws stubs without throwing for each locomotion mode', () => {
    const path = {
      ellipse: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      quadraticCurveTo: () => undefined,
      closePath: () => undefined,
    };
    const ctx = {
      save: () => undefined,
      restore: () => undefined,
      scale: () => undefined,
      beginPath: () => undefined,
      fill: () => undefined,
      stroke: () => undefined,
      fillRect: () => undefined,
      setLineDash: () => undefined,
      fillText: () => undefined,
      ...path,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'center' as CanvasTextAlign,
      ellipse: path.ellipse,
      moveTo: path.moveTo,
      lineTo: path.lineTo,
      quadraticCurveTo: path.quadraticCurveTo,
      closePath: path.closePath,
    } as unknown as CanvasRenderingContext2D;

    for (const mode of MODES) {
      const meta = drawObservationSilhouetteStub(ctx, mode, -1);
      expect(meta.finishedModel).toBe(false);
      expect(meta.mode).toBe(mode);
    }
  });
});
