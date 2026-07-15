import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { SourceSnapshotRecord } from '../src/coverage/CoverageTypes';
import type { EarthGridRegistry, TemporalEarthMapCatalog } from '../src/schema/temporalMap';
import type { GeologicTimeUnitsBundle, PlayableTimeGatesBundle } from '../src/time/schema';
import { auditTemporalMaps } from './audits/temporal-maps';
import { COVERAGE, DATA, ROOT, printResults, readJson } from './audits/shared';

const requireVerified = process.argv.includes('--require-verified');
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
const incompleteMaps = catalog.maps.filter((map) => map.status !== 'source_verified');
const report = {
  generatedAt: new Date().toISOString(),
  readyForProduction: structuralFailures.length === 0 && incompleteMaps.length === 0,
  strictMode: requireVerified,
  expectedGridCellCount: grid.expectedCellCount,
  supportedTimeGateCount: gates.gates.length,
  sourceVerifiedMapCount: catalog.maps.length - incompleteMaps.length,
  incompleteMapCount: incompleteMaps.length,
  blockedTimeGateIds: incompleteMaps.map((map) => map.timeGateId),
  checks: results,
};
mkdirSync(statusDir, { recursive: true });
writeFileSync(join(statusDir, 'temporal_map_readiness_report.json'), `${JSON.stringify(report, null, 2)}\n`);

const failed = printResults(results, requireVerified ? 'Production Temporal Map Audit' : 'Temporal Map Integrity Audit');
console.log(`Wrote public/data/status/temporal_map_readiness_report.json`);
process.exit(failed > 0 ? 1 : 0);
