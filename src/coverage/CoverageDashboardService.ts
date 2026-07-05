import type { CoverageMatrixRow, CoverageDashboardStats, GapReport, BiasReport } from './CoverageTypes';
import { coverageGapService } from './CoverageGapService';

export interface AuditResult {
  name: string;
  passed: boolean;
  message: string;
  blocking?: boolean;
  category?: string;
}

export class CoverageDashboardService {
  buildStats(matrix: CoverageMatrixRow[], gaps: GapReport, bias: BiasReport): CoverageDashboardStats {
    const mockSampleCount = matrix.filter((r) => r.isMockData).length;
    return {
      representedTaxa: matrix.length,
      searchableTaxa: matrix.filter((r) => r.representationTier >= 1).length,
      timeMappedTaxa: matrix.filter((r) => r.timeCoverage).length,
      placeMappedTaxa: matrix.filter((r) => r.placeCoverage).length,
      biomeMappedTaxa: matrix.filter((r) => r.biomeCoverage).length,
      artifactReadyTaxa: matrix.filter((r) => r.artifactCoverage).length,
      questableTaxa: matrix.filter((r) => r.representationTier >= 5).length,
      heroTaxa: matrix.filter((r) => r.representationTier >= 6).length,
      mockSampleCount,
      provenanceComplete: matrix.filter((r) => r.sourceCoverage).length,
      gapSummary: gaps.summary,
      biasWarnings: bias.warnings,
    };
  }
}

export function summarizeGaps(gaps: ReturnType<typeof coverageGapService.detectGaps>): GapReport['summary'] {
  return {
    critical: gaps.filter((g) => g.severity === 'critical').length,
    high: gaps.filter((g) => g.severity === 'high').length,
    medium: gaps.filter((g) => g.severity === 'medium').length,
    low: gaps.filter((g) => g.severity === 'low').length,
    blocking: gaps.filter((g) => g.blockingForRelease).length,
  };
}

export const coverageDashboardService = new CoverageDashboardService();
