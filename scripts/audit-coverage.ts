/**
 * Global Coverage Matrix orchestrator — runs all representation audits + release gates.
 * Run: npm run audit:coverage
 */
import { loadAuditContext, printResults } from './audits/shared';
import { getDataQualityCounts, formatDataQualityLine } from './audits/data-quality';
import { auditSpecies } from './audits/species';
import { auditTime } from './audits/time';
import { auditBiomes } from './audits/biomes';
import { auditEarth } from './audits/earth';
import { auditProvenance } from './audits/provenance';
import { auditBias } from './audits/bias';
import type { AuditResult } from './audits/shared';
import type { SpeciesIndexEntry } from '../src/schema';

function legacyChecks(ctx: ReturnType<typeof loadAuditContext>): AuditResult[] {
  const results: AuditResult[] = [];
  const heroIds = new Set(ctx.hero.species.map((s) => s.id));
  const conservationIds = new Set(ctx.conservation.records.map((r) => r.speciesId));

  const missingIucn = ctx.iucnScope.taxonIds.filter(
    (id) => !conservationIds.has(id) && !ctx.index.entries.some((e) => e.id === id && e.iucnCategory)
  );
  results.push({
    name: 'iucn_assessed_represented',
    passed: missingIucn.length === 0,
    message: missingIucn.length
      ? `Missing IUCN scope: ${missingIucn.join(', ')}`
      : `All ${ctx.iucnScope.taxonIds.length} IUCN-scoped taxa represented`,
  });

  const missingArtifacts = ctx.hero.species.filter((s) => s.representationTier >= 4 && !s.artifactTemplates?.length);
  results.push({
    name: 'tier4_plus_have_artifact_templates',
    passed: missingArtifacts.length === 0,
    message: missingArtifacts.length
      ? `Tier 4+ missing artifacts: ${missingArtifacts.map((s) => s.id).join(', ')}`
      : 'All Tier 4+ records have artifact templates',
    blocking: true,
  });

  const invalidUnlocks = ctx.traits.filter(
    (t) => t.unlockedBy !== 'any_artifact' && !heroIds.has(t.unlockedBy)
  );
  results.push({
    name: 'lifeling_unlocks_valid',
    passed: invalidUnlocks.length === 0,
    message: invalidUnlocks.length
      ? `Invalid unlocks: ${invalidUnlocks.map((t) => t.id).join(', ')}`
      : 'All Lifeling trait unlocks reference valid taxa',
  });

  results.push({
    name: 'index_count_matches_manifest',
    passed: ctx.index.totalCount === ctx.manifest.coverage.representedSpecies,
    message: `Index ${ctx.index.totalCount} vs manifest ${ctx.manifest.coverage.representedSpecies}`,
  });

  results.push({
    name: 'index_separate_from_hero_bundle',
    passed: ctx.index.totalCount >= ctx.hero.species.length,
    message: `Search index (${ctx.index.totalCount}) paginated; hero bundle (${ctx.hero.species.length}) for detail only — never load full global catalogue`,
    blocking: true,
  });

  const belowTier0 = ctx.index.entries.filter(
    (e: SpeciesIndexEntry) => e.representationTier === undefined || e.representationTier < 0
  );
  results.push({
    name: 'minimum_tier_zero_representation',
    passed: belowTier0.length === 0,
    message: belowTier0.length
      ? `${belowTier0.length} entries below tier 0`
      : 'Every indexed taxon meets minimum tier 0 representation',
  });

  const hasTimeInManifest = !!ctx.manifest.bundles.timeAtlas || !!ctx.manifest.coverage.timeUnits;
  results.push({
    name: 'time_atlas_in_manifest',
    passed: hasTimeInManifest,
    message: hasTimeInManifest
      ? `Time Atlas registered (${ctx.manifest.coverage.timeUnits ?? ctx.timeManifest.coverage.totalTimeUnits} units)`
      : 'Time Atlas not registered in data manifest',
  });

  const indexNoTier = ctx.index.entries.filter(
    (e: SpeciesIndexEntry) => e.representationTier === undefined && !heroIds.has(e.id)
  );
  results.push({
    name: 'index_has_representation_tiers',
    passed: indexNoTier.length === 0,
    message: indexNoTier.length
      ? `${indexNoTier.length} index entries missing representationTier`
      : 'All index entries have representation tiers',
  });

  return results;
}

const ctx = loadAuditContext();
const quality = getDataQualityCounts(ctx);
const results = [
  ...auditSpecies(ctx),
  ...auditTime(ctx),
  ...auditBiomes(ctx),
  ...auditEarth(ctx),
  ...auditProvenance(ctx),
  ...auditBias(ctx),
  ...legacyChecks(ctx),
];

const failed = printResults(results, 'Archive of Life Global Coverage Audit');
console.log(`Data quality: ${formatDataQualityLine(quality)}\n`);
const blocking = results.filter((r) => r.blocking && !r.passed);
if (blocking.length) {
  console.error(`\n${blocking.length} BLOCKING release gate(s) failed:\n`);
  for (const b of blocking) console.error(`  - ${b.name}: ${b.message}`);
}

process.exit(failed > 0 ? 1 : 0);
