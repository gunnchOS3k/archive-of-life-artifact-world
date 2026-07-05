export type DataQualityStatus = 'verified' | 'sample' | 'mock' | 'partial' | 'uncertain' | 'source_unavailable';

export type CoverageGapSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type GapCategory =
  | 'taxonomy'
  | 'provenance'
  | 'time'
  | 'place'
  | 'biome'
  | 'artifact'
  | 'archivedex'
  | 'lifeling'
  | 'gameplay'
  | 'source'
  | 'bias';

export interface CoverageMatrixRow {
  taxonId: string;
  scientificName: string;
  acceptedName: string;
  rank: string;
  lifeStatus: string;
  representationTier: number;
  sourceCoverage: boolean;
  timeCoverage: boolean;
  placeCoverage: boolean;
  biomeCoverage: boolean;
  artifactCoverage: boolean;
  archivedexCoverage: boolean;
  lifelingCoverage: boolean;
  gameplayCoverage: boolean;
  dataQuality: DataQualityStatus;
  uncertaintyNotes?: string;
  gapFlags: string[];
  isMockData: boolean;
}

export interface CoverageGap {
  gapId: string;
  severity: CoverageGapSeverity;
  category: GapCategory;
  affectedTaxonId?: string;
  affectedBiomeId?: string;
  affectedTimeUnitId?: string;
  affectedPlaceId?: string;
  missingFields: string[];
  recommendedFix: string;
  blockingForRelease: boolean;
}

export interface SourceSnapshotRecord {
  id: string;
  sourceName: string;
  sourceCategory: string;
  version: string;
  doi?: string;
  license: string;
  citationRequired: boolean;
  retrievalDate: string;
  checksum?: string;
  localPath?: string;
  approvedForUse: boolean;
  isMockData: boolean;
  notes?: string;
}

export interface BiomeRecord {
  id: string;
  name: string;
  realm: string;
  parentCategory: string;
  description: string;
  source: string;
  sourceVersion: string;
  learningTopics: string[];
  requiredCoverageMinimums: { minRepresentedTaxa: number };
  representedTaxonCount?: number;
  coverageStatus?: 'represented' | 'partial' | 'missing' | 'source_unavailable' | 'not_yet_ingested';
}

export interface BiasReport {
  snapshotId: string;
  generatedAt: string;
  byGroup: Record<string, number>;
  byBiome: Record<string, number>;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  warnings: string[];
}

export interface GapReport {
  snapshotId: string;
  generatedAt: string;
  gaps: CoverageGap[];
  summary: { critical: number; high: number; medium: number; low: number; blocking: number };
}

export interface CoverageDashboardStats {
  representedTaxa: number;
  searchableTaxa: number;
  timeMappedTaxa: number;
  placeMappedTaxa: number;
  biomeMappedTaxa: number;
  artifactReadyTaxa: number;
  questableTaxa: number;
  heroTaxa: number;
  mockSampleCount: number;
  provenanceComplete: number;
  gapSummary: GapReport['summary'];
  biasWarnings: string[];
}
