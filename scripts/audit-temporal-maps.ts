import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { SourceSnapshotRecord } from '../src/coverage/CoverageTypes';
import type { EarthGridRegistry, TemporalEarthMapCatalog } from '../src/schema/temporalMap';
import type { GeologicTimeUnitsBundle, PlayableTimeGatesBundle } from '../src/time/schema';
import { auditTemporalMaps } from './audits/temporal-maps';
import { COVERAGE, DATA, ROOT, printResults, readJson } from './audits/shared';

/** Strict Gate mode: source-verification incompleteness becomes a hard fail. */
const requireVerified =
  process.argv.includes('--require-source-verified') ||
  process.argv.includes('--require-verified');
const statusDir = join(DATA, 'status');
const grid = readJson<EarthGridRegistry>(join(COVERAGE, 'earth_grid_registry.json'));
const catalog = readJson<TemporalEarthMapCatalog>(join(DATA, 'maps', 'temporal_map_catalog.json'));
const gates = readJson<PlayableTimeGatesBundle>(join(DATA, 'time', 'playable_time_gates.json'));
const units = readJson<GeologicTimeUnitsBundle>(join(DATA, 'time', 'geologic_time_units.json'));
const sourceSnapshots = readJson<{ snapshots: SourceSnapshotRecord[] }>(
  join(COVERAGE, 'source_snapshots.json')
).snapshots;
const results = auditTemporalMaps({
  root: ROOT,
  grid,
  catalog,
  gates,
  units,
  sourceSnapshots,
  requireVerified,
});

const structuralFailures = results.filter((result) => !result.passed && result.blocking);
const softFailures = results.filter((result) => !result.passed && !result.blocking);
const incompleteMaps = catalog.maps.filter((map) => map.status !== 'source_verified');
const report = {
  generatedAt: new Date().toISOString(),
  readyForProduction: structuralFailures.length === 0 && incompleteMaps.length === 0,
  strictMode: requireVerified,
  ciMode: requireVerified ? 'REQUIRE_SOURCE_VERIFIED' : 'EXPECTED_INCOMPLETE_SOFT',
  expectedGridCellCount: grid.expectedCellCount,
  supportedTimeGateCount: gates.gates.length,
  sourceVerifiedMapCount: catalog.maps.length - incompleteMaps.length,
  incompleteMapCount: incompleteMaps.length,
  blockedTimeGateIds: incompleteMaps.map((map) => map.timeGateId),
  expectedIncompleteStatus:
    incompleteMaps.length > 0 && !requireVerified ? 'EXPECTED_INCOMPLETE' : null,
  checks: results,
};
mkdirSync(statusDir, { recursive: true });
writeFileSync(join(statusDir, 'temporal_map_readiness_report.json'), `${JSON.stringify(report, null, 2)}\n`);

const failed = printResults(
  results,
  requireVerified ? 'Production Temporal Map Audit' : 'Temporal Map Integrity Audit'
);

if (softFailures.length > 0 && !requireVerified) {
  console.log('\nEXPECTED_INCOMPLETE / EXPECTED_PHYSICAL_OR_SCIENTIFIC_BLOCKER');
  console.log(
    `${incompleteMaps.length}/${catalog.maps.length} temporal maps lack approved source-verified scientific assets.`
  );
  console.log(
    'Structural integrity checks remain hard-fail. Soft mode exits 0 for main CI until assets are approved.'
  );
  console.log('Re-run with --require-source-verified (npm run audit:maps:production) for Gate strict mode.\n');
}

console.log(`Wrote public/data/status/temporal_map_readiness_report.json`);
// Soft/expected incompleteness must not fail main CI; only blocking structural failures exit non-zero.
const exitFailures = requireVerified ? failed : structuralFailures.length;
process.exit(exitFailures > 0 ? 1 : 0);
