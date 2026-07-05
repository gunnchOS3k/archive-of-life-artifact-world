export type ImplementationStatus =
  | 'FULLY_IMPLEMENTED'
  | 'PARTIAL_IMPLEMENTATION'
  | 'SCAFFOLD_ONLY'
  | 'MOCK_SAMPLE_ONLY'
  | 'BLOCKED_BY_EXTERNAL_DATA'
  | 'PLANNED_NOT_STARTED'
  | 'DEPRECATED';

export interface SystemRecord {
  id: string;
  name: string;
  status: ImplementationStatus;
  playerFacing: boolean;
  devOnly: boolean;
  releaseBlocking: boolean;
  mockDataCountsAsRealCoverage: boolean;
  notes: string;
  blockedReason?: string;
}

export interface ImplementationStatusReport {
  snapshotId: string;
  generatedAt: string;
  gameVersion: string;
  summary: {
    fullyImplemented: number;
    partialImplementation: number;
    scaffoldOnly: number;
    mockSampleOnly: number;
    blockedExternalData: number;
    plannedNotStarted: number;
    deprecated: number;
    playerFacingCount: number;
    devOnlyCount: number;
  };
  systems: SystemRecord[];
}

export interface IncompleteInventoryItem {
  id: string;
  filePath: string;
  lineNumber: number | null;
  markerType: string;
  matchedText: string;
  affectedSystem: string;
  severity: string;
  currentStatus: string;
  requiredAction: string;
  blocksRelease: boolean;
  releasePath: boolean;
}

export interface IncompleteInventoryReport {
  generatedAt: string;
  totalScannedFiles: number;
  itemCount: number;
  releasePathItemCount: number;
  blockingItemCount: number;
  items: IncompleteInventoryItem[];
}

export interface ReleaseReadinessReport {
  generatedAt: string;
  ready: boolean;
  blockingReasons: string[];
  checks: Array<{ name: string; passed: boolean; message: string; blocking?: boolean }>;
  dataQuality: {
    totalIncludingMock: number;
    totalSourceVerified: number;
    mockSampleCount: number;
    blockedExternalDataCount: number;
    releaseEligibleCount: number;
  };
  implementationSummary: ImplementationStatusReport['summary'];
  incompleteSummary: {
    releasePathBlocking: number;
    releasePathTotal: number;
  };
}
