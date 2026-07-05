import type { ArchiveSpecies, SpeciesIndexEntry } from '../../src/schema';
import type { SourceSnapshotRecord } from '../../src/coverage/CoverageTypes';
import type { DataQualityCounts } from './types';

export function isMockEntry(entry: SpeciesIndexEntry, hero?: ArchiveSpecies): boolean {
  if (entry.id.startsWith('sample_')) return true;
  const prov = hero?.provenance ?? [];
  const scientific = prov.filter((p) => p.source !== 'game_authored');
  if (scientific.length === 0) return false;
  return scientific.every(
    (p) =>
      p.isMockData === true ||
      p.verificationStatus === 'mock_sample' ||
      p.verificationStatus === 'blocked_external'
  );
}

export function isGameAuthoredVerified(hero?: ArchiveSpecies): boolean {
  return hero?.provenance?.some(
    (p) =>
      p.source === 'game_authored' &&
      (p.verificationStatus === 'game_authored_verified' || p.isMockData === false)
  ) ?? false;
}

export function isSourceVerified(entry: SpeciesIndexEntry, hero?: ArchiveSpecies): boolean {
  if (isMockEntry(entry, hero)) return false;
  const hasVerifiedProv = hero?.provenance?.some(
    (p) => p.verificationStatus === 'source_verified' || (p.isMockData === false && p.source !== 'game_authored')
  );
  const hasRealSource = entry.sources?.some(
    (s) => s !== 'mock_sample' && s !== 'game_authored'
  );
  return !!(hasVerifiedProv || (hasRealSource && !isMockEntry(entry, hero)));
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
