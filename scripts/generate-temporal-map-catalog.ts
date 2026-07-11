import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { PlayableTimeGatesBundle, GeologicTimeUnitsBundle } from '../src/time/schema';
import type {
  EarthGridRegistry,
  TemporalEarthMapCatalog,
  TemporalEarthMapRecord,
  TemporalMapRequiredEvidence,
} from '../src/schema/temporalMap';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public', 'data');
const OUTPUT = join(DATA, 'maps', 'temporal_map_catalog.json');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

const gates = readJson<PlayableTimeGatesBundle>(join(DATA, 'time', 'playable_time_gates.json'));
const units = readJson<GeologicTimeUnitsBundle>(join(DATA, 'time', 'geologic_time_units.json'));
const grid = readJson<EarthGridRegistry>(join(DATA, 'coverage', 'earth_grid_registry.json'));
const unitsById = new Map(units.units.map((unit) => [unit.id, unit]));
const previous = existsSync(OUTPUT) ? readJson<TemporalEarthMapCatalog>(OUTPUT) : null;
const previousByGate = new Map(previous?.maps.map((map) => [map.timeGateId, map]) ?? []);

function requiredEvidenceFor(gateId: string): TemporalMapRequiredEvidence[] {
  if (gateId === 'gate_holocene') {
    return ['chronostratigraphy', 'modern_geography', 'earth_observation'];
  }
  return ['chronostratigraphy', 'paleogeographic_reconstruction'];
}

function buildBlockedRecord(
  gate: PlayableTimeGatesBundle['gates'][number]
): TemporalEarthMapRecord {
  const referencedUnits = gate.timeUnitIds.map((id) => unitsById.get(id)).filter((unit) => unit != null);
  if (referencedUnits.length !== gate.timeUnitIds.length) {
    throw new Error(`Cannot generate map requirement for ${gate.id}: unresolved time unit`);
  }
  const oldestMa = Math.max(...referencedUnits.map((unit) => unit.startMa));
  const youngestMa = Math.min(...referencedUnits.map((unit) => unit.endMa));

  return {
    id: `temporal_map_${gate.id}`,
    timeGateId: gate.id,
    timeUnitIds: [...gate.timeUnitIds],
    timeRange: { oldestMa, youngestMa },
    status: 'blocked_external',
    fullEarthCoverage: false,
    expectedGridCellCount: grid.expectedCellCount,
    coveredGridCellCount: 0,
    coveredGridCellIds: [],
    projection: 'EPSG:4326',
    globalBounds: [-180, -90, 180, 90],
    asset: null,
    sourceSnapshotIds: [],
    requiredEvidence: requiredEvidenceFor(gate.id),
    uncertaintyNotes:
      'No approved, source-verified global reconstruction asset has been ingested for this time gate.',
    blockedReason:
      gate.id === 'gate_holocene'
        ? 'Import an approved full-Earth modern geography asset and linked Earth-observation snapshot.'
        : 'Select and license an authoritative paleogeographic reconstruction, record its temporal uncertainty, then import and checksum the full-Earth asset.',
  };
}

const maps = gates.gates.map((gate) => {
  const prior = previousByGate.get(gate.id);
  if (!prior) return buildBlockedRecord(gate);
  return {
    ...prior,
    timeUnitIds: [...gate.timeUnitIds],
    expectedGridCellCount: grid.expectedCellCount,
    coveredGridCellIds: prior.coveredGridCellIds ?? [],
    requiredEvidence: requiredEvidenceFor(gate.id),
  };
});

const catalog: TemporalEarthMapCatalog = {
  version: '1.0.0',
  snapshotId: previous?.snapshotId ?? 'temporal-maps-unverified-v1',
  generatedAt: new Date().toISOString(),
  description:
    'One full-Earth map requirement per supported Time Atlas gate. Blocked records are intentional and never render fabricated paleogeography.',
  isMockData: maps.some((map) => map.status !== 'source_verified'),
  gridRegistryPath: 'coverage/earth_grid_registry.json',
  expectedTimeGateCount: gates.gates.length,
  maps,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Generated ${maps.length} temporal map requirements at ${OUTPUT}`);
