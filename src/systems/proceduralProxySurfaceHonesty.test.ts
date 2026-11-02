import assert from 'node:assert/strict';
import {
  PROCEDURAL_PROXY_SURFACE_HONESTY,
  assessProceduralProxySurfaceHonesty,
} from './proceduralProxySurfaceHonesty.ts';

const report = assessProceduralProxySurfaceHonesty();
assert.equal(report.proceduralProxySurfaces, 2);
assert.equal(report.allProceduralProxy, true);
assert.equal(report.paintedRemasterClaimed, false);
assert.equal(report.proceduralNeqFinished, true);
assert.ok(report.deferredHeavyWorkCount >= 4);
assert.equal(report.VISUAL_MODEL_REVIEW, 'UNAVAILABLE');
assert.equal(report.HUMAN, false);
assert.equal(report.RC2, false);
assert.equal(report.V1, false);
assert.ok(report.honestyBanner.includes(PROCEDURAL_PROXY_SURFACE_HONESTY.slice(0, 24)));
console.log('proceduralProxySurfaceHonesty.test.ts PASS');
