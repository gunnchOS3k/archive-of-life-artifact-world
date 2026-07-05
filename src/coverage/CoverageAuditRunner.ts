import type { AuditResult } from './CoverageDashboardService';
import type { BiasReport, GapReport } from './CoverageTypes';
import { coverageMatrixService } from './CoverageMatrixService';
import { coverageGapService } from './CoverageGapService';
import { summarizeGaps } from './CoverageDashboardService';
import type { ArchiveSpecies, SpeciesIndexEntry } from '@/schema';

export class CoverageAuditRunner {
  buildGapReport(
    index: SpeciesIndexEntry[],
    heroById: Map<string, ArchiveSpecies>,
    snapshotId: string
  ): GapReport {
    const matrix = coverageMatrixService.buildMatrix(index, heroById);
    const gaps = coverageGapService.detectGaps(matrix);
    return {
      snapshotId,
      generatedAt: new Date().toISOString(),
      gaps,
      summary: summarizeGaps(gaps),
    };
  }

  buildBiasReport(index: SpeciesIndexEntry[], snapshotId: string): BiasReport {
    const byGroup: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const e of index) {
      byGroup[e.group] = (byGroup[e.group] ?? 0) + 1;
      const tier = String(e.representationTier ?? 0);
      byTier[tier] = (byTier[tier] ?? 0) + 1;
      for (const src of e.sources ?? ['unknown']) {
        bySource[src] = (bySource[src] ?? 0) + 1;
      }
    }
    const warnings: string[] = [];
    const mammals = byGroup['Mammal'] ?? 0;
    const insects = byGroup['Insect'] ?? 0;
    const plants = (byGroup['Plant'] ?? 0) + (byGroup['Fungus'] ?? 0);
    if (mammals > insects + plants) {
      warnings.push('Charismatic mammals may be overrepresented relative to insects/plants/fungi');
    }
    if ((byGroup['Microbe'] ?? 0) < 2) {
      warnings.push('Microbial/pre-animal representation is underrepresented');
    }
    return {
      snapshotId,
      generatedAt: new Date().toISOString(),
      byGroup,
      byBiome: {},
      byTier,
      bySource,
      warnings,
    };
  }

  mergeResults(...groups: AuditResult[][]): AuditResult[] {
    return groups.flat();
  }
}

export const coverageAuditRunner = new CoverageAuditRunner();
