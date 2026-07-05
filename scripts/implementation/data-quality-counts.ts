import type { ArchiveSpecies, SpeciesIndexEntry } from '../../src/schema';
import type { SourceSnapshotRecord } from '../../src/coverage/CoverageTypes';
import type { DataQualityCounts } from './types';

export function isMockEntry(entry: SpeciesIndexEntry, hero?: ArchiveSpecies): boolean {
  return (
    entry.sources?.includes('mock_sample') ||
    hero?.provenance?.some((p) => p.isMockData) === true ||
    entry.id.startsWith('sample_')
  );
}

export function isSourceVerified(entry: SpeciesIndexEntry, hero?: ArchiveSpecies): boolean {
  if (isMockEntry(entry, hero)) return false;
  const hasRealSource = entry.sources?.some(
    (s) => s !== 'mock_sample' && s !== 'game_authored'
  );
  const provVerified = hero?.provenance?.some((p) => !p.isMockData);
  return !!(hasRealSource || provVerified);
}

export function computeDataQualityCounts(
  index: SpeciesIndexEntry[],
  heroById: Map<string, ArchiveSpecies>,
  sourceSnapshots: SourceSnapshotRecord[]
): DataQualityCounts {
  const totalIncludingMock = index.length;
  let mockSampleCount = 0;
  let releaseEligibleCount = 0;

  for (const entry of index) {
    const hero = heroById.get(entry.id);
    if (isMockEntry(entry, hero)) {
      mockSampleCount++;
    } else if (isSourceVerified(entry, hero)) {
      releaseEligibleCount++;
    }
  }

  const blockedCount = sourceSnapshots.filter((s) => !s.approvedForUse || s.isMockData).length;

  return {
    totalIncludingMock,
    totalSourceVerified: releaseEligibleCount,
    mockSampleCount,
    blockedExternalDataCount: blockedCount,
    releaseEligibleCount,
  };
}
