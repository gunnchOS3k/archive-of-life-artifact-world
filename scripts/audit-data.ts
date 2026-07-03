/**
 * Coverage audit — verifies data integrity for scalable biodiversity representation.
 * Run: npm run audit:data
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DataManifest, ArchiveSpecies, LifelingTrait, SpeciesSearchIndex } from '../src/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'public', 'data');

interface AuditResult {
  name: string;
  passed: boolean;
  message: string;
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function audit(): AuditResult[] {
  const results: AuditResult[] = [];
  const manifest = readJson<DataManifest>(join(DATA, 'manifest.json'));
  const hero = readJson<{ species: ArchiveSpecies[] }>(join(DATA, manifest.bundles.heroSpecies.path));
  const index = readJson<SpeciesSearchIndex>(join(DATA, manifest.bundles.searchIndex.path));
  const traits = readJson<LifelingTrait[]>(join(DATA, manifest.bundles.traits.path));

  const speciesIds = new Set(hero.species.map((s) => s.id));
  const indexIds = new Set(index.entries.map((e) => e.id));

  // All hero species in search index
  results.push({
    name: 'hero_in_search_index',
    passed: hero.species.every((s) => indexIds.has(s.id)),
    message: 'All hero species appear in search index',
  });

  // All species have provenance
  const missingProvenance = hero.species.filter((s) => !s.provenance?.length);
  results.push({
    name: 'species_have_provenance',
    passed: missingProvenance.length === 0,
    message: missingProvenance.length
      ? `Missing provenance: ${missingProvenance.map((s) => s.id).join(', ')}`
      : 'All species have source provenance',
  });

  // Hero species have artifact templates
  const missingArtifacts = hero.species.filter((s) => !s.artifactTemplates?.length);
  results.push({
    name: 'hero_have_artifact_templates',
    passed: missingArtifacts.length === 0,
    message: missingArtifacts.length
      ? `Missing artifacts: ${missingArtifacts.map((s) => s.id).join(', ')}`
      : 'All hero species have artifact templates',
  });

  // Lifeling unlocks point to valid species
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

  // Index count matches manifest coverage
  results.push({
    name: 'index_count_matches_manifest',
    passed: index.totalCount === manifest.coverage.representedSpecies,
    message: `Index ${index.totalCount} vs manifest ${manifest.coverage.representedSpecies}`,
  });

  // Threatened filterable
  const threatenedInIndex = index.entries.filter((e) => e.isThreatened).length;
  results.push({
    name: 'threatened_counted',
    passed: threatenedInIndex === manifest.coverage.threatened,
    message: `Threatened: index ${threatenedInIndex}, manifest ${manifest.coverage.threatened}`,
  });

  // Extinct/fossil filterable
  const extinctInIndex = index.entries.filter((e) => e.isExtinct).length;
  results.push({
    name: 'extinct_counted',
    passed: extinctInIndex === manifest.coverage.extinctFossil,
    message: `Extinct: index ${extinctInIndex}, manifest ${manifest.coverage.extinctFossil}`,
  });

  // IUCN assessed representation (sample snapshot — all assessed in hero set)
  const iucnAssessed = hero.species.filter((s) => s.conservation?.assessed).length;
  results.push({
    name: 'iucn_assessed_represented',
    passed: iucnAssessed >= manifest.coverage.iucnAssessed,
    message: `${iucnAssessed} IUCN-assessed conservation records in hero bundle`,
  });

  // Catalogue of Life IDs on taxonomy (mock sample)
  const withCol = hero.species.filter((s) => s.taxonomy.catalogueOfLifeId || s.provenance.some((p) => p.catalogueOfLifeId));
  results.push({
    name: 'col_ids_present',
    passed: withCol.length > 0,
    message: `${withCol.length} species have Catalogue of Life identifiers (mock or real)`,
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
