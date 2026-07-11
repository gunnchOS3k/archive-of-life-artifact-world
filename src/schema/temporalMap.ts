export type TemporalMapStatus = 'source_verified' | 'partial' | 'blocked_external';

export type TemporalMapRequiredEvidence =
  | 'chronostratigraphy'
  | 'paleogeographic_reconstruction'
  | 'modern_geography'
  | 'earth_observation';

export interface TemporalMapAsset {
  /** Path relative to public/data/. */
  path: string;
  mediaType: 'application/geo+json' | 'application/vnd.pmtiles';
  sizeBytes: number;
  /** Lowercase, unprefixed SHA-256 digest. */
  sha256: string;
}

export interface TemporalMapTimeRange {
  oldestMa: number;
  youngestMa: number;
}

/**
 * A release requirement for one supported Time Atlas gate.
 *
 * A record may exist before its scientific map asset does. `source_verified`
 * is reserved for a checked, locally packaged, globally covering asset whose
 * source snapshots are approved and non-mock.
 */
export interface TemporalEarthMapRecord {
  id: string;
  timeGateId: string;
  timeUnitIds: string[];
  timeRange: TemporalMapTimeRange;
  status: TemporalMapStatus;
  fullEarthCoverage: boolean;
  expectedGridCellCount: number;
  coveredGridCellCount: number;
  /** Grid cells proven covered by the packaged asset's offline coverage analysis. */
  coveredGridCellIds: string[];
  projection: 'EPSG:4326';
  globalBounds: [-180, -90, 180, 90];
  asset: TemporalMapAsset | null;
  /** IDs from public/data/coverage/source_snapshots.json actually used. */
  sourceSnapshotIds: string[];
  requiredEvidence: TemporalMapRequiredEvidence[];
  uncertaintyNotes: string;
  blockedReason?: string;
}

export interface TemporalEarthMapCatalog {
  version: string;
  snapshotId: string;
  generatedAt: string;
  description: string;
  isMockData: boolean;
  gridRegistryPath: string;
  expectedTimeGateCount: number;
  maps: TemporalEarthMapRecord[];
}

export type EarthGridCoverageStatus =
  | 'source_verified'
  | 'partial'
  | 'not_yet_ingested'
  | 'source_unavailable';

export interface EarthGridCell {
  id: string;
  /** [west, south, east, north] in WGS84 degrees. */
  bbox: [number, number, number, number];
  /** [longitude, latitude] in WGS84 degrees. */
  center: [number, number];
  coverageStatus: EarthGridCoverageStatus;
}

export interface EarthGridRegistry {
  version: string;
  snapshotId: string;
  generatedAt: string;
  description: string;
  gridSystem: 'equal_angle';
  cellSizeDegrees: { longitude: number; latitude: number };
  globalBounds: [-180, -90, 180, 90];
  expectedCellCount: number;
  cells: EarthGridCell[];
}
