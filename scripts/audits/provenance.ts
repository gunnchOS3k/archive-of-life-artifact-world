import type { AuditContext, AuditResult } from './shared';

export function auditProvenance(ctx: AuditContext): AuditResult[] {
  const results: AuditResult[] = [];

  const heroNoProv = ctx.hero.species.filter((s) => !s.provenance?.length);
  results.push({
    name: 'hero_species_have_provenance',
    passed: heroNoProv.length === 0,
    message: heroNoProv.length
      ? `Missing provenance: ${heroNoProv.map((s) => s.id).join(', ')}`
      : 'All hero species have source provenance',
    category: 'provenance',
    blocking: true,
  });

  const unapprovedUsed = ctx.sourceSnapshots.snapshots.filter((s) => s.isMockData && s.approvedForUse);
  results.push({
    name: 'mock_snapshots_not_approved_for_use',
    passed: unapprovedUsed.length === 0,
    message: unapprovedUsed.length
      ? `${unapprovedUsed.length} mock snapshots incorrectly approved`
      : 'Mock source snapshots not approved for production use',
    category: 'provenance',
    blocking: true,
  });

  const rangesNoProv = ctx.taxonRanges.ranges.filter(
    (r: { provenance?: unknown[] }) => !r.provenance?.length
  );
  results.push({
    name: 'taxon_ranges_have_provenance',
    passed: rangesNoProv.length === 0,
    message: rangesNoProv.length
      ? `${rangesNoProv.length} taxon ranges missing provenance`
      : 'All taxon time ranges have source provenance',
    category: 'provenance',
  });

  const missingCitation = ctx.sourceSnapshots.snapshots.filter((s) => !s.license || !s.retrievalDate);
  results.push({
    name: 'source_snapshots_metadata_complete',
    passed: missingCitation.length === 0,
    message: missingCitation.length
      ? `${missingCitation.length} source snapshots missing license/retrieval date`
      : 'Source snapshot registry metadata complete',
    category: 'provenance',
  });

  const approvedWithWeakChecksum = ctx.sourceSnapshots.snapshots.filter((snapshot) => {
    if (!snapshot.approvedForUse) return false;
    const checksum = snapshot.checksum?.replace(/^sha256:/, '') ?? '';
    return !/^[a-f0-9]{64}$/.test(checksum);
  });
  results.push({
    name: 'approved_snapshots_have_sha256',
    passed: approvedWithWeakChecksum.length === 0,
    message: approvedWithWeakChecksum.length
      ? `Approved snapshots with missing/invalid SHA-256: ${approvedWithWeakChecksum.map((snapshot) => snapshot.id).join(', ')}`
      : 'Every approved source snapshot has a valid SHA-256',
    category: 'provenance',
    blocking: true,
  });

  return results;
}
