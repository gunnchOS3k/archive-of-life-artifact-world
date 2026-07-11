import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { EarthGridCell, EarthGridRegistry } from '../src/schema/temporalMap';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'public', 'data', 'coverage', 'earth_grid_registry.json');
const CELL_SIZE_DEGREES = 10;
const LONGITUDE_CELL_COUNT = 360 / CELL_SIZE_DEGREES;
const LATITUDE_CELL_COUNT = 180 / CELL_SIZE_DEGREES;

function buildCells(): EarthGridCell[] {
  const cells: EarthGridCell[] = [];
  for (let latitudeIndex = 0; latitudeIndex < LATITUDE_CELL_COUNT; latitudeIndex += 1) {
    const south = -90 + latitudeIndex * CELL_SIZE_DEGREES;
    const north = south + CELL_SIZE_DEGREES;
    for (let longitudeIndex = 0; longitudeIndex < LONGITUDE_CELL_COUNT; longitudeIndex += 1) {
      const west = -180 + longitudeIndex * CELL_SIZE_DEGREES;
      const east = west + CELL_SIZE_DEGREES;
      cells.push({
        id: `eq10:${latitudeIndex.toString().padStart(2, '0')}:${longitudeIndex.toString().padStart(2, '0')}`,
        bbox: [west, south, east, north],
        center: [(west + east) / 2, (south + north) / 2],
        coverageStatus: 'not_yet_ingested',
      });
    }
  }
  return cells;
}

const cells = buildCells();
const registry: EarthGridRegistry = {
  version: '1.0.0',
  snapshotId: 'equal-angle-10deg-v1',
  generatedAt: new Date().toISOString(),
  description:
    'Deterministic full-Earth audit index. Cells are spatial requirements only and do not claim scientific-data coverage.',
  gridSystem: 'equal_angle',
  cellSizeDegrees: {
    longitude: CELL_SIZE_DEGREES,
    latitude: CELL_SIZE_DEGREES,
  },
  globalBounds: [-180, -90, 180, 90],
  expectedCellCount: LONGITUDE_CELL_COUNT * LATITUDE_CELL_COUNT,
  cells,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Generated ${cells.length} full-Earth audit cells at ${OUTPUT}`);
