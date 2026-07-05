import type { DataQualityCounts } from '../implementation/types';
import { computeDataQualityCounts } from '../implementation/data-quality-counts';
import type { AuditContext } from './shared';

export function getDataQualityCounts(ctx: AuditContext): DataQualityCounts {
  const heroById = new Map(ctx.hero.species.map((s) => [s.id, s]));
  return computeDataQualityCounts(ctx.index.entries, heroById, ctx.sourceSnapshots.snapshots);
}

export function formatDataQualityLine(counts: DataQualityCounts): string {
  return [
    `totalIncludingMock=${counts.totalIncludingMock}`,
    `mockSampleCount=${counts.mockSampleCount}`,
    `totalSourceVerified=${counts.totalSourceVerified}`,
    `releaseEligibleCount=${counts.releaseEligibleCount}`,
    `blockedExternalDataCount=${counts.blockedExternalDataCount}`,
  ].join(', ');
}
