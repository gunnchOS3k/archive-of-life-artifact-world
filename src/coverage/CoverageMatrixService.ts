import type { SpeciesIndexEntry, ArchiveSpecies } from '@/schema';
import type { CoverageMatrixRow, DataQualityStatus } from './CoverageTypes';

export function buildMatrixRow(
  entry: SpeciesIndexEntry,
  hero?: ArchiveSpecies
): CoverageMatrixRow {
  const tier = entry.representationTier ?? 0;
  const isMock = entry.sources?.includes('mock_sample') ||
    hero?.provenance?.some((p) => p.isMockData) ||
    false;

  const dataQuality: DataQualityStatus = isMock ? 'mock' : tier >= 6 ? 'sample' : 'partial';

  const gapFlags: string[] = [];
  if (!entry.scientificName) gapFlags.push('missing_scientific_name');
  if (tier < 1) gapFlags.push('below_tier_1');
  if (tier >= 3 && !entry.timeUnitIds?.length) gapFlags.push('missing_time_mapping');
  if (tier >= 2 && !entry.region) gapFlags.push('missing_place_mapping');
  if (tier >= 4 && hero && !hero.artifactTemplates?.length) gapFlags.push('missing_artifact_templates');
  const hasProvenance = !!hero?.provenance?.length || (entry.sources?.length ?? 0) > 0;
  if (!hasProvenance && tier >= 1) gapFlags.push('missing_provenance');

  return {
    taxonId: entry.id,
    scientificName: entry.scientificName,
    acceptedName: entry.scientificName,
    rank: 'species',
    lifeStatus: entry.lifeStatus ?? (entry.isExtinct ? 'extinct' : 'extant'),
    representationTier: tier,
    sourceCoverage: hasProvenance,
    timeCoverage: tier >= 3 || !!entry.timeUnitIds?.length,
    placeCoverage: tier >= 2 || !!entry.region,
    biomeCoverage: !!entry.region,
    artifactCoverage: tier >= 4 && !!hero?.artifactTemplates?.length,
    archivedexCoverage: tier >= 1,
    lifelingCoverage: false,
    gameplayCoverage: tier >= 5 || entry.isPlayable,
    dataQuality,
    gapFlags,
    isMockData: isMock,
  };
}

export class CoverageMatrixService {
  buildMatrix(
    index: SpeciesIndexEntry[],
    heroById: Map<string, ArchiveSpecies>
  ): CoverageMatrixRow[] {
    return index.map((e) => buildMatrixRow(e, heroById.get(e.id)));
  }

  countByTier(matrix: CoverageMatrixRow[]): Record<number, number> {
    const out: Record<number, number> = {};
    for (const row of matrix) {
      out[row.representationTier] = (out[row.representationTier] ?? 0) + 1;
    }
    return out;
  }
}

export const coverageMatrixService = new CoverageMatrixService();
