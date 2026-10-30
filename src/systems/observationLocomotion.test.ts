import { describe, expect, it } from 'vitest';
import {
  resolveObservationMotionForTaxon,
  resolveObservationMotionMode,
  stepObservationPose,
} from '@/systems/observationLocomotion';
import { listFlagshipTaxonIds } from '@/services/flagshipTaxonProfiles';

describe('observationLocomotion', () => {
  it('maps all 24 flagships to a motion mode without finished-model claims', () => {
    const ids = listFlagshipTaxonIds();
    expect(ids).toHaveLength(24);
    for (const id of ids) {
      const motion = resolveObservationMotionForTaxon(id);
      expect(motion.finishedModel).toBe(false);
      expect(motion.humanApproved).toBe(false);
      expect(motion.mode).toBeTruthy();
      expect(motion.locomotionCue).toBeTruthy();
    }
  });

  it('uses authored modes for flutter / sit_wait / static fossil taxa', () => {
    expect(resolveObservationMotionMode('danaus_plexippus')).toBe('flutter');
    expect(resolveObservationMotionMode('latrodectus_mactans')).toBe('sit_wait');
    expect(resolveObservationMotionMode('trilobita_order')).toBe('static_fossil');
    expect(resolveObservationMotionMode('tyrannosaurus_rex')).toBe('bipedal');
  });

  it('holds pose under reduced motion and advances under normal motion', () => {
    const base = {
      x: 200,
      y: 180,
      facing: 1 as const,
      timer: 1.5,
      moveSpeedPx: 40,
      baseY: 180,
      canvasWidth: 400,
      canvasHeight: 300,
    };
    const still = stepObservationPose('amble', base, 0.5, true);
    expect(still.x).toBe(200);
    expect(Math.abs(still.y - 180)).toBeLessThan(1);

    const moved = stepObservationPose('amble', { ...base, x: 200 }, 0.5, false);
    expect(moved.x).toBeGreaterThan(200);

    const fossil = stepObservationPose('static_fossil', base, 1, false);
    expect(fossil.x).toBe(200);
  });
});
