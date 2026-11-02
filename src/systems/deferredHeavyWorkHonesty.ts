/**
 * Deferred heavy-work honesty — capture/export/painted remasters stay deferred.
 * Procedural ≠ finished; HUMAN/RC2/V1 false.
 */

import { buildVisualPackHarness, type VisualPackManifest } from './visualPackHarness';

export interface DeferredHeavyWorkHonestyReport {
  schema: 'archive.deferred_heavy_work_honesty/v1';
  deferredHeavyWorkCount: number;
  paintedRemasterDeferred: true;
  qemuSoakDeferred: true;
  proceduralNeqFinished: true;
  VISUAL_MODEL_REVIEW: 'UNAVAILABLE';
  HUMAN: false;
  RC2: false;
  V1: false;
  honestyBanner: string;
}

export const DEFERRED_HEAVY_WORK_HONESTY =
  'Heavy capture/export/painted remasters remain deferred; procedural≠finished; VISUAL_MODEL_REVIEW unavailable; HUMAN/RC2/V1 false.';

export function assessDeferredHeavyWorkHonesty(
  harness: VisualPackManifest = buildVisualPackHarness(),
): DeferredHeavyWorkHonestyReport {
  const work = harness.deferred_heavy_work;
  const painted = work.some((w) => /painted|remaster|asset-gen/i.test(w));
  const qemu = work.some((w) => /QEMU|qemu/i.test(w));
  return {
    schema: 'archive.deferred_heavy_work_honesty/v1',
    deferredHeavyWorkCount: work.length,
    paintedRemasterDeferred: true,
    qemuSoakDeferred: true,
    proceduralNeqFinished: true,
    VISUAL_MODEL_REVIEW: 'UNAVAILABLE',
    HUMAN: false,
    RC2: false,
    V1: false,
    honestyBanner: `DEFERRED_HEAVY_WORK count=${work.length} paintedDeferred=${painted} qemuDeferred=${qemu} · ${DEFERRED_HEAVY_WORK_HONESTY}`,
  };
}
