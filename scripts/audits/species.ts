import type { AuditContext, AuditResult } from './shared';
import type { ArchiveSpecies, SpeciesIndexEntry } from '../../src/schema';

export function auditSpecies(ctx: AuditContext): AuditResult[] {
  const results: AuditResult[] = [];
  const indexIds = new Set(ctx.index.entries.map((e) => e.id));
  const heroById = new Map(ctx.hero.species.map((s) => [s.id, s]));

  const missingCol = ctx.colScope.taxonIds.filter((id) => !indexIds.has(id));
  results.push({
    name: 'col_extant_t0_minimum',
    passed: missingCol.length === 0,
    message: missingCol.length
      ? `Missing COL scope taxa: ${missingCol.join(', ')}`
      : `All ${ctx.colScope.taxonIds.length} COL-scoped extant taxa at T0+`,
    category: 'species',
  });

  const missingMeta = ctx.index.entries.filter(
    (e: SpeciesIndexEntry) => !e.scientificName || e.representationTier === undefined || !e.lifeStatus
  );
  results.push({
    name: 'taxon_identity_complete',
    passed: missingMeta.length === 0,
    message: missingMeta.length
      ? `${missingMeta.length} taxa missing id/name/rank/life status`
      : 'All indexed taxa have identity fields',
    category: 'species',
    blocking: true,
  });

  const unflaggedHighTierMock = ctx.index.entries.filter((e: SpeciesIndexEntry) => {
    if (e.representationTier < 4) return false;
    const hero = heroById.get(e.id);
    const flagged =
      e.sources?.includes('mock_sample') ||
      hero?.provenance?.some((p: ArchiveSpecies['provenance'][number]) => p.isMockData);
    return !flagged;
  });
  results.push({
    name: 'mock_not_counted_as_complete',
    passed: unflaggedHighTierMock.length === 0,
    message: unflaggedHighTierMock.length
      ? `${unflaggedHighTierMock.length} Tier 4+ records lack mock/sample flags`
      : 'Mock/sample records flagged via sources or provenance — not counted as source-complete',
    category: 'species',
    blocking: true,
  });

  const threatened = ctx.index.entries.filter((e: SpeciesIndexEntry) => e.isThreatened);
  results.push({
    name: 'threatened_filterable',
    passed: threatened.length > 0 && threatened.every((e: SpeciesIndexEntry) => !!e.iucnCategory),
    message: `${threatened.length} threatened taxa filterable in search index`,
    category: 'species',
  });

  return results;
}
