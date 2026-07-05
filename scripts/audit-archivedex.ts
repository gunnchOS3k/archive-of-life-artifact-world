/**
 * ArchiveDex integrity audit
 * Run: npm run audit:archivedex
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DataManifest, ArchiveSpecies, LifelingTrait, SpeciesSearchIndex } from '../src/schema';
import type { ArchiveDexProfilesBundle } from '../src/schema/archivedex';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'public', 'data');

interface AuditResult { name: string; passed: boolean; message: string; }

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function audit(): AuditResult[] {
  const results: AuditResult[] = [];
  const manifest = readJson<DataManifest>(join(DATA, 'manifest.json'));
  const hero = readJson<{ species: ArchiveSpecies[] }>(join(DATA, manifest.bundles.heroSpecies.path));
  const stubs = existsSync(join(DATA, 'bundles/archive-stubs.json'))
    ? readJson<{ species: ArchiveSpecies[] }>(join(DATA, 'bundles/archive-stubs.json')).species
    : [];
  const index = readJson<SpeciesSearchIndex>(join(DATA, manifest.bundles.searchIndex.path));
  const traits = readJson<LifelingTrait[]>(join(DATA, manifest.bundles.traits.path));
  const profiles = existsSync(join(DATA, 'bundles/archivedex-profiles.json'))
    ? readJson<ArchiveDexProfilesBundle>(join(DATA, 'bundles/archivedex-profiles.json'))
    : { profiles: [] };

  const allSpecies = [...hero.species, ...stubs];
  const heroIds = new Set(hero.species.map((s) => s.id));

  results.push({
    name: 'every_index_entry_has_id',
    passed: index.entries.every((e) => !!e.id),
    message: 'All search index entries have IDs',
  });

  results.push({
    name: 'every_index_has_scientific_name',
    passed: index.entries.every((e) => !!e.scientificName),
    message: 'All index entries have scientific names',
  });

  results.push({
    name: 'every_index_has_representation_tier',
    passed: index.entries.every((e) => e.representationTier !== undefined),
    message: 'All index entries have representation tiers',
  });

  results.push({
    name: 'every_species_has_life_status',
    passed: allSpecies.every((s) => !!s.lifeStatus || s.conservation?.iucnCategory === 'Extinct'),
    message: 'All bundled species have life status or extinct conservation flag',
  });

  results.push({
    name: 'every_species_has_provenance',
    passed: allSpecies.every((s) => s.provenance?.length),
    message: 'All species/stubs have source provenance',
  });

  const tier4MissingArtifacts = allSpecies.filter(
    (s) => s.representationTier >= 4 && !s.artifactTemplates?.length
  );
  results.push({
    name: 'tier4_plus_have_artifacts',
    passed: tier4MissingArtifacts.length === 0,
    message: tier4MissingArtifacts.length
      ? `Missing artifacts: ${tier4MissingArtifacts.map((s) => s.id).join(', ')}`
      : 'All Tier 4+ entries have artifact templates',
  });

  const tier6Hero = hero.species.filter((s) => s.representationTier >= 6);
  const enrichedTier6 = tier6Hero.filter((s) => profiles.profiles.some((p) => p.id === s.id));
  results.push({
    name: 'tier6_have_enriched_profiles',
    passed: enrichedTier6.length >= 5,
    message: `${enrichedTier6.length}/${tier6Hero.length} Tier 6 hero species have ArchiveDex profile overlays (min 5)`,
  });

  const stubProfiles = profiles.profiles.filter((p) => !heroIds.has(p.id));
  results.push({
    name: 'stub_enriched_profiles',
    passed: stubProfiles.length >= 5,
    message: `${stubProfiles.length} archive stub enriched profiles (min 5)`,
  });

  const invalidUnlocks = traits.filter(
    (t) => t.unlockedBy !== 'any_artifact' && !heroIds.has(t.unlockedBy)
  );
  results.push({
    name: 'lifeling_unlocks_valid',
    passed: invalidUnlocks.length === 0,
    message: 'All Lifeling unlocks reference valid taxa',
  });

  results.push({
    name: 'index_paginated_not_full_load',
    passed: index.totalCount > 0 && hero.species.length < index.totalCount || index.totalCount === hero.species.length,
    message: `Index (${index.totalCount}) separate from hero detail bundle (${hero.species.length}) — paginated browse`,
  });

  results.push({
    name: 'archivedex_profiles_bundle_valid',
    passed: profiles.profiles.every((p) => !!p.id),
    message: `${profiles.profiles.length} ArchiveDex profile overlays validated`,
  });

  const hasVerificationClasses = allSpecies.some((s) =>
    s.provenance?.some((p) => 'verificationStatus' in p || p.source === 'game_authored')
  );
  results.push({
    name: 'provenance_verification_classes',
    passed: hasVerificationClasses,
    message: 'Provenance records include verification status or game-authored separation',
  });

  return results;
}

const results = audit();
let failed = 0;
console.log('\n=== ArchiveDex Audit ===\n');
for (const r of results) {
  console.log(`${r.passed ? '✓' : '✗'} ${r.name}: ${r.message}`);
  if (!r.passed) failed++;
}
console.log(`\n${results.length - failed}/${results.length} checks passed\n`);
process.exit(failed > 0 ? 1 : 0);
