import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, normalize, sep } from 'path';
import type { SourceSnapshotRecord } from '../../src/coverage/CoverageTypes';
import type {
  EarthGridRegistry,
  TemporalEarthMapCatalog,
  TemporalEarthMapRecord,
} from '../../src/schema/temporalMap';
import type { GeologicTimeUnitsBundle, PlayableTimeGatesBundle } from '../../src/time/schema';
import type { AuditResult } from './shared';

export interface TemporalMapAuditInput {
  root: string;
  grid: EarthGridRegistry;
  catalog: TemporalEarthMapCatalog;
  gates: PlayableTimeGatesBundle;
  units: GeologicTimeUnitsBundle;
  sourceSnapshots: SourceSnapshotRecord[];
  requireVerified?: boolean;
}

const GLOBAL_BOUNDS = [-180, -90, 180, 90] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function validateGrid(grid: EarthGridRegistry): AuditResult[] {
  const results: AuditResult[] = [];
  const longitudeCells = 360 / grid.cellSizeDegrees.longitude;
  const latitudeCells = 180 / grid.cellSizeDegrees.latitude;
  const dimensionsValid =
    Number.isInteger(longitudeCells) &&
    Number.isInteger(latitudeCells) &&
    longitudeCells > 0 &&
    latitudeCells > 0;
  const calculatedCount = dimensionsValid ? longitudeCells * latitudeCells : 0;

  results.push({
    name: 'earth_grid_global_bounds',
    passed: sameNumbers(grid.globalBounds, GLOBAL_BOUNDS),
    message: sameNumbers(grid.globalBounds, GLOBAL_BOUNDS)
      ? 'Earth grid declares the complete WGS84 world extent'
      : `Invalid global bounds: ${grid.globalBounds.join(', ')}`,
    category: 'temporal_maps',
    blocking: true,
  });

  results.push({
    name: 'earth_grid_dimensions',
    passed: dimensionsValid && grid.expectedCellCount === calculatedCount,
    message: dimensionsValid
      ? `${longitudeCells} × ${latitudeCells} cells; expected=${grid.expectedCellCount}`
      : 'Grid cell size must divide 360° longitude and 180° latitude exactly',
    category: 'temporal_maps',
    blocking: true,
  });

  const cellsById = new Map(grid.cells.map((cell) => [cell.id, cell]));
  const duplicates = grid.cells.length - cellsById.size;
  const invalidCells: string[] = [];
  if (dimensionsValid) {
    for (let latitudeIndex = 0; latitudeIndex < latitudeCells; latitudeIndex += 1) {
      const south = -90 + latitudeIndex * grid.cellSizeDegrees.latitude;
      const north = south + grid.cellSizeDegrees.latitude;
      for (let longitudeIndex = 0; longitudeIndex < longitudeCells; longitudeIndex += 1) {
        const west = -180 + longitudeIndex * grid.cellSizeDegrees.longitude;
        const east = west + grid.cellSizeDegrees.longitude;
        const id = `eq10:${latitudeIndex.toString().padStart(2, '0')}:${longitudeIndex.toString().padStart(2, '0')}`;
        const cell = cellsById.get(id);
        if (
          !cell ||
          !sameNumbers(cell.bbox, [west, south, east, north]) ||
          !sameNumbers(cell.center, [(west + east) / 2, (south + north) / 2])
        ) {
          invalidCells.push(id);
        }
      }
    }
  }

  const gridComplete =
    dimensionsValid &&
    duplicates === 0 &&
    grid.cells.length === calculatedCount &&
    invalidCells.length === 0;
  results.push({
    name: 'earth_grid_no_gaps_or_overlaps',
    passed: gridComplete,
    message: gridComplete
      ? `All ${grid.cells.length} deterministic cells cover the full Earth exactly once`
      : `cells=${grid.cells.length}/${calculatedCount}, duplicates=${duplicates}, invalidOrMissing=${invalidCells.length}`,
    category: 'temporal_maps',
    blocking: true,
  });

  return results;
}

function validateAsset(
  record: TemporalEarthMapRecord,
  root: string,
  snapshotsById: Map<string, SourceSnapshotRecord>
): string[] {
  const errors: string[] = [];
  if (!record.asset) return ['source_verified map has no packaged asset'];
  if (!SHA256_PATTERN.test(record.asset.sha256)) errors.push('asset SHA-256 is malformed');
  if (record.asset.sizeBytes <= 0) errors.push('asset size must be positive');

  const dataRoot = normalize(join(root, 'public', 'data'));
  const assetPath = normalize(join(dataRoot, record.asset.path));
  if (!assetPath.startsWith(`${dataRoot}${sep}`)) {
    errors.push('asset path escapes public/data');
  } else if (!existsSync(assetPath)) {
    errors.push(`asset missing: ${record.asset.path}`);
  } else {
    if (statSync(assetPath).size !== record.asset.sizeBytes) errors.push('asset byte size does not match');
    if (SHA256_PATTERN.test(record.asset.sha256) && sha256(assetPath) !== record.asset.sha256) {
      errors.push('asset SHA-256 does not match');
    }
  }

  if (record.sourceSnapshotIds.length === 0) errors.push('no source snapshots linked');
  for (const id of record.sourceSnapshotIds) {
    const snapshot = snapshotsById.get(id);
    if (!snapshot) {
      errors.push(`unknown source snapshot: ${id}`);
      continue;
    }
    if (!snapshot.approvedForUse || snapshot.isMockData) {
      errors.push(`source snapshot is not production-approved: ${id}`);
    }
    const digest = snapshot.checksum?.replace(/^sha256:/, '') ?? '';
    if (!SHA256_PATTERN.test(digest)) errors.push(`source snapshot checksum is malformed: ${id}`);
  }
  return errors;
}

function validateCatalog(input: TemporalMapAuditInput): AuditResult[] {
  const { catalog, gates, grid, units, root, sourceSnapshots, requireVerified = false } = input;
  const results: AuditResult[] = [];
  const gateById = new Map(gates.gates.map((gate) => [gate.id, gate]));
  const unitById = new Map(units.units.map((unit) => [unit.id, unit]));
  const mapsByGate = new Map(catalog.maps.map((map) => [map.timeGateId, map]));
  const snapshotsById = new Map(sourceSnapshots.map((snapshot) => [snapshot.id, snapshot]));
  const gridCellIds = new Set(grid.cells.map((cell) => cell.id));
  const duplicateGateRecords = catalog.maps.length - mapsByGate.size;
  const missingGates = gates.gates.filter((gate) => !mapsByGate.has(gate.id));
  const unknownGates = catalog.maps.filter((map) => !gateById.has(map.timeGateId));

  const inventoryComplete =
    duplicateGateRecords === 0 &&
    missingGates.length === 0 &&
    unknownGates.length === 0 &&
    catalog.expectedTimeGateCount === gates.gates.length &&
    catalog.maps.length === gates.gates.length;
  results.push({
    name: 'one_temporal_map_requirement_per_gate',
    passed: inventoryComplete,
    message: inventoryComplete
      ? `All ${gates.gates.length} supported time gates have exactly one map requirement`
      : `missing=${missingGates.length}, unknown=${unknownGates.length}, duplicates=${duplicateGateRecords}`,
    category: 'temporal_maps',
    blocking: true,
  });

  const invalidRecords: string[] = [];
  for (const record of catalog.maps) {
    const gate = gateById.get(record.timeGateId);
    if (!gate) continue;
    const referencedUnits = gate.timeUnitIds.map((id) => unitById.get(id));
    const oldestMa = referencedUnits.every((unit) => unit != null)
      ? Math.max(...referencedUnits.map((unit) => unit!.startMa))
      : Number.NaN;
    const youngestMa = referencedUnits.every((unit) => unit != null)
      ? Math.min(...referencedUnits.map((unit) => unit!.endMa))
      : Number.NaN;
    const coveredCellIds = new Set(record.coveredGridCellIds);
    const baseValid =
      sameStrings(record.timeUnitIds, gate.timeUnitIds) &&
      record.timeRange.oldestMa === oldestMa &&
      record.timeRange.youngestMa === youngestMa &&
      record.timeRange.oldestMa >= record.timeRange.youngestMa &&
      record.projection === 'EPSG:4326' &&
      sameNumbers(record.globalBounds, GLOBAL_BOUNDS) &&
      record.expectedGridCellCount === grid.expectedCellCount &&
      record.coveredGridCellCount >= 0 &&
      record.coveredGridCellCount <= record.expectedGridCellCount &&
      record.coveredGridCellCount === record.coveredGridCellIds.length &&
      coveredCellIds.size === record.coveredGridCellIds.length &&
      record.coveredGridCellIds.every((id) => gridCellIds.has(id)) &&
      record.requiredEvidence.length > 0 &&
      record.uncertaintyNotes.trim().length > 0;

    let statusValid = false;
    if (record.status === 'blocked_external') {
      statusValid =
        record.asset === null &&
        !record.fullEarthCoverage &&
        record.coveredGridCellCount === 0 &&
        Boolean(record.blockedReason?.trim());
    } else if (record.status === 'partial') {
      statusValid =
        record.asset !== null &&
        !record.fullEarthCoverage &&
        record.coveredGridCellCount > 0 &&
        record.coveredGridCellCount < record.expectedGridCellCount;
    } else {
      statusValid =
        record.fullEarthCoverage &&
        record.coveredGridCellCount === record.expectedGridCellCount &&
        validateAsset(record, root, snapshotsById).length === 0;
    }
    if (!baseValid || !statusValid) invalidRecords.push(record.timeGateId);
  }

  results.push({
    name: 'temporal_map_records_truthful_and_valid',
    passed: invalidRecords.length === 0,
    message: invalidRecords.length
      ? `Invalid records: ${invalidRecords.join(', ')}`
      : 'Map status, coverage, time ranges, assets, and provenance are internally consistent',
    category: 'temporal_maps',
    blocking: true,
  });

  const verified = catalog.maps.filter((map) => map.status === 'source_verified');
  const incomplete = catalog.maps.filter((map) => map.status !== 'source_verified');
  const mockFlagValid = catalog.isMockData === (incomplete.length > 0);
  results.push({
    name: 'temporal_map_catalog_mock_flag_matches_content',
    passed: mockFlagValid,
    message: mockFlagValid
      ? `sourceVerified=${verified.length}, incomplete=${incomplete.length}, isMockData=${catalog.isMockData}`
      : 'Catalog mock flag does not match record status',
    category: 'temporal_maps',
    blocking: true,
  });

  results.push({
    name: 'all_temporal_maps_source_verified',
    passed: incomplete.length === 0,
    message: incomplete.length
      ? `${incomplete.length}/${catalog.maps.length} full-Earth time maps still require approved scientific assets`
      : `All ${catalog.maps.length} full-Earth time maps are source-verified`,
    category: 'temporal_maps',
    blocking: requireVerified,
  });

  return results;
}

export function auditTemporalMaps(input: TemporalMapAuditInput): AuditResult[] {
  return [...validateGrid(input.grid), ...validateCatalog(input)];
}
