import type { CoverageMatrixRow, CoverageGap, GapCategory } from './CoverageTypes';

export class CoverageGapService {
  detectGaps(matrix: CoverageMatrixRow[]): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    for (const row of matrix) {
      if (!row.scientificName) {
        gaps.push(this.gap(row.taxonId, 'high', 'taxonomy', ['scientificName'], 'Add accepted name from source'));
      }
      if (row.representationTier >= 4 && !row.artifactCoverage) {
        gaps.push(this.gap(row.taxonId, 'critical', 'artifact', ['artifactTemplates'], 'Add ethical artifact templates', true));
      }
      if (row.representationTier >= 3 && !row.timeCoverage) {
        gaps.push(this.gap(row.taxonId, 'high', 'time', ['timeUnitIds'], 'Link taxon to Time Atlas range'));
      }
      if (row.representationTier >= 2 && !row.placeCoverage) {
        gaps.push(this.gap(row.taxonId, 'medium', 'place', ['region', 'occurrence'], 'Map to place/ecoregion'));
      }
      if (!row.sourceCoverage && row.representationTier >= 4) {
        gaps.push(this.gap(row.taxonId, 'critical', 'provenance', ['provenance'], 'Add source provenance record', true));
      } else if (!row.sourceCoverage && row.representationTier >= 1) {
        gaps.push(this.gap(row.taxonId, 'medium', 'provenance', ['provenance'], 'Add source provenance or index sources field'));
      }
      if (row.isMockData && row.representationTier >= 4) {
        gaps.push({
          gapId: `gap_${row.taxonId}_mock_as_real`,
          severity: 'info',
          category: 'source',
          affectedTaxonId: row.taxonId,
          missingFields: ['approvedForUse'],
          recommendedFix: 'Mock data flagged — cannot count as source-complete coverage',
          blockingForRelease: false,
        });
      }
    }

    return gaps;
  }

  private gap(
    taxonId: string,
    severity: CoverageGap['severity'],
    category: GapCategory,
    missingFields: string[],
    recommendedFix: string,
    blocking = false
  ): CoverageGap {
    return {
      gapId: `gap_${category}_${taxonId}_${missingFields[0]}`,
      severity,
      category,
      affectedTaxonId: taxonId,
      missingFields,
      recommendedFix,
      blockingForRelease: blocking,
    };
  }
}

export const coverageGapService = new CoverageGapService();
