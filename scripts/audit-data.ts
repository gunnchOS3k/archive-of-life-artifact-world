/**
 * Data integrity audit — verifies bundles, provenance, and mock/verified separation.
 * Run: npm run audit:data
 */
import { loadAuditContext } from './audits/shared';
import { getDataQualityCounts, formatDataQualityLine } from './audits/data-quality';

interface AuditResult {
  name: string;
  passed: boolean;
  message: string;
}

function audit(): AuditResult[] {
  const results: AuditResult[] = [];
  const ctx = loadAuditContext();
  const { manifest, hero, index, traits } = ctx;

  const speciesIds = new Set(hero.species.map((s) => s.id));
  const indexIds = new Set(index.entries.map((e) => e.id));
  const counts = getDataQualityCounts(ctx);

  results.push({
    name: 'hero_in_search_index',
    passed: hero.species.every((s) => indexIds.has(s.id)),
    message: 'All hero species appear in search index',
  });

  const missingProvenance = hero.species.filter((s) => !s.provenance?.length);
  results.push({
    name: 'species_have_provenance',
    passed: missingProvenance.length === 0,
    message: missingProvenance.length
      ? `Missing provenance: ${missingProvenance.map((s) => s.id).join(', ')}`
      : 'All species have source provenance',
  });

  const missingArtifacts = hero.species.filter((s) => !s.artifactTemplates?.length);
  results.push({
    name: 'hero_have_artifact_templates',
    passed: missingArtifacts.length === 0,
    message: missingArtifacts.length
      ? `Missing artifacts: ${missingArtifacts.map((s) => s.id).join(', ')}`
      : 'All hero species have artifact templates',
  });

  const invalidUnlocks = traits.filter(
    (t) => t.unlockedBy !== 'any_artifact' && !speciesIds.has(t.unlockedBy)
  );
  results.push({
    name: 'lifeling_unlocks_valid',
    passed: invalidUnlocks.length === 0,
    message: invalidUnlocks.length
      ? `Invalid unlocks: ${invalidUnlocks.map((t) => t.id).join(', ')}`
      : 'All Lifeling trait unlocks reference valid species',
  });

  results.push({
    name: 'index_count_matches_manifest',
    passed: index.totalCount === manifest.coverage.representedSpecies,
    message: `Index ${index.totalCount} vs manifest ${manifest.coverage.representedSpecies}`,
  });

  const threatenedInIndex = index.entries.filter((e) => e.isThreatened).length;
  results.push({
    name: 'threatened_counted',
    passed: threatenedInIndex === manifest.coverage.threatened,
    message: `Threatened: index ${threatenedInIndex}, manifest ${manifest.coverage.threatened}`,
  });

  const extinctInIndex = index.entries.filter((e) => e.isExtinct).length;
  results.push({
    name: 'extinct_counted',
    passed: extinctInIndex === manifest.coverage.extinctFossil,
    message: `Extinct: index ${extinctInIndex}, manifest ${manifest.coverage.extinctFossil}`,
  });

  // assessed=true must mean real IUCN evidence — mock gameplay labels stay assessed=false.
  const iucnAssessed = hero.species.filter(
    (s) =>
      s.conservation?.assessed === true &&
      s.conservation?.dataMode !== 'mock_sample' &&
      !String(s.conservation?.sourceVersion || '').includes('mock')
  ).length;
  const falseAssessed = hero.species.filter(
    (s) =>
      s.conservation?.assessed === true &&
      (s.conservation?.dataMode === 'mock_sample' ||
        String(s.conservation?.sourceVersion || '').includes('mock'))
  );
  results.push({
    name: 'iucn_assessed_represented',
    passed:
      falseAssessed.length === 0 && iucnAssessed === manifest.coverage.iucnAssessed,
    message: falseAssessed.length
      ? `Mock conservation marked assessed=true: ${falseAssessed.map((s) => s.id).join(', ')}`
      : `${iucnAssessed} source-verified IUCN assessments in hero (manifest ${manifest.coverage.iucnAssessed})`,
  });

  results.push({
    name: 'data_quality_counts',
    passed: counts.mockSampleCount > 0 && counts.releaseEligibleCount === 0,
    message: formatDataQualityLine(counts),
  });

  results.push({
    name: 'mock_not_counted_as_verified',
    passed: counts.totalSourceVerified === counts.releaseEligibleCount,
    message: 'Mock/sample records excluded from source-verified totals',
  });

  return results;
}

const results = audit();
let failed = 0;
console.log('\n=== Archive of Life Data Audit ===\n');
for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} ${r.name}: ${r.message}`);
  if (!r.passed) failed++;
}
console.log(`\n${results.length - failed}/${results.length} checks passed\n`);
process.exit(failed > 0 ? 1 : 0);
