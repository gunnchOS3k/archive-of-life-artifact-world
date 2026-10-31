/**
 * Quarantine mock scientific provenance on hero / region / stub bundles.
 * Never labels mock as source-verified or as live CoL/GBIF/IUCN/PBDB rows.
 *
 * Run: npx tsx scripts/quarantine-mock-hero-provenance.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SCOPE =
  'Gameplay-authored hero record. External taxonomy/conservation/distribution fields that lack an approved COL/GBIF/IUCN/PBDB snapshot remain quarantined mock samples — never source-verified. Catalog is intentionally incomplete (not Earth-complete).';

type Prov = {
  source: string;
  sourceVersion: string;
  sourceRecordId?: string;
  catalogueOfLifeId?: string;
  paleobiodbTaxonNo?: number;
  gbifTaxonKey?: number;
  iucnTaxonId?: number;
  license: string;
  citation: string;
  citationRequired: boolean;
  retrievedAt: string;
  lastUpdated: string;
  isMockData?: boolean;
  verificationStatus?: string;
};

type Species = {
  id: string;
  taxonomy?: { catalogueOfLifeId?: string; gbifTaxonKey?: number; [k: string]: unknown };
  conservation?: Record<string, unknown>;
  distribution?: Record<string, unknown>;
  fossil?: Record<string, unknown>;
  scientificScopeStatement?: string;
  provenance: Prov[];
  [k: string]: unknown;
};

function quarantineProvenance(speciesId: string, provenance: Prov[]): Prov[] {
  const out: Prov[] = [];
  let sawMock = false;
  for (const p of provenance) {
    const isMock =
      p.isMockData === true ||
      p.verificationStatus === 'mock_sample' ||
      p.license === 'MOCK-SAMPLE' ||
      p.source === 'mock_sample' ||
      String(p.sourceVersion || '').includes('mock') ||
      String(p.sourceRecordId || '').startsWith('MOCK-') ||
      String(p.catalogueOfLifeId || '').startsWith('MOCK-');

    if (p.source === 'game_authored') {
      out.push({ ...p, isMockData: false, verificationStatus: 'game_authored_verified' });
      continue;
    }

    if (isMock || ['catalogue_of_life', 'gbif', 'iucn', 'paleobiodb', 'neotoma'].includes(p.source)) {
      // Only quarantine when the row is mock/sample — keep true future imports intact.
      if (!isMock && p.verificationStatus === 'source_verified' && p.isMockData === false) {
        out.push(p);
        continue;
      }
      sawMock = true;
      out.push({
        source: 'mock_sample',
        sourceVersion: 'quarantined-mock-sample-2026-07',
        sourceRecordId: `QUARANTINED-MOCK-${speciesId}`,
        license: 'MOCK-SAMPLE',
        citation:
          'QUARANTINED MOCK SAMPLE — not Catalogue of Life / GBIF / IUCN / PBDB; not source-verified. Retained for pipeline demos only until an approved snapshot import replaces it.',
        citationRequired: true,
        retrievedAt: p.retrievedAt,
        lastUpdated: p.lastUpdated,
        isMockData: true,
        verificationStatus: 'mock_sample',
      });
      continue;
    }

    out.push(p);
  }

  if (!sawMock && !out.some((p) => p.verificationStatus === 'mock_sample')) {
    // Ensure quarantined placeholder remains visible for sample heroes.
    const now = new Date().toISOString();
    out.push({
      source: 'mock_sample',
      sourceVersion: 'quarantined-mock-sample-2026-07',
      sourceRecordId: `QUARANTINED-MOCK-${speciesId}`,
      license: 'MOCK-SAMPLE',
      citation:
        'QUARANTINED MOCK SAMPLE — not Catalogue of Life / GBIF / IUCN / PBDB; not source-verified.',
      citationRequired: true,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: true,
      verificationStatus: 'mock_sample',
    });
  }

  // Dedupe consecutive identical mock_sample rows
  const deduped: Prov[] = [];
  for (const p of out) {
    const prev = deduped[deduped.length - 1];
    if (
      prev &&
      prev.source === 'mock_sample' &&
      p.source === 'mock_sample' &&
      prev.sourceRecordId === p.sourceRecordId
    ) {
      continue;
    }
    deduped.push(p);
  }
  return deduped;
}

function quarantineSpecies(sp: Species): Species {
  const taxonomy = sp.taxonomy ? { ...sp.taxonomy } : undefined;
  if (taxonomy) {
    if (String(taxonomy.catalogueOfLifeId || '').startsWith('MOCK-')) {
      delete taxonomy.catalogueOfLifeId;
    }
  }

  const conservation = sp.conservation ? { ...sp.conservation } : undefined;
  if (conservation) {
    const sv = String(conservation.sourceVersion || '');
    const isMockConservation =
      sv.includes('mock') ||
      conservation.dataMode === 'mock_sample' ||
      // assessed=true is only legal with explicit source_verified evidence from an approved IUCN import
      (conservation.assessed === true && conservation.dataMode !== 'source_verified');
    if (isMockConservation) {
      conservation.sourceVersion = 'quarantined-mock-iucn-2026-07';
      conservation.dataMode = 'mock_sample';
      conservation.assessed = false;
      delete conservation.iucnTaxonId;
      conservation.uncertaintyNote =
        'IUCN category is a gameplay planning label from legacy authored data — not an IUCN Red List source-verified assessment.';
    }
  }

  const distribution = sp.distribution ? { ...sp.distribution } : undefined;
  if (distribution) {
    const sv = String(distribution.sourceVersion || '');
    if (sv.includes('mock') || distribution.dataMode === 'mock_sample') {
      distribution.sourceVersion = 'quarantined-mock-gbif-2026-07';
      distribution.dataMode = 'mock_sample';
      delete distribution.gbifTaxonKey;
      distribution.uncertaintyNote =
        'Continent/habitat hints are game-authored planning twins — not GBIF occurrence-verified ranges.';
      if (Array.isArray(distribution.occurrenceSummaries)) {
        distribution.occurrenceSummaries = (
          distribution.occurrenceSummaries as Array<{ region: string; occurrenceCount: number }>
        ).map((o) => ({ ...o, occurrenceCount: 0 }));
      }
    }
  }

  const fossil = sp.fossil ? { ...sp.fossil } : undefined;
  if (fossil) {
    const sv = String(fossil.sourceVersion || '');
    if (sv.includes('mock')) {
      fossil.sourceVersion = 'quarantined-mock-pbdb-2026-07';
      delete fossil.paleobiodbTaxonNo;
    }
  }

  return {
    ...sp,
    taxonomy,
    conservation,
    distribution,
    fossil,
    scientificScopeStatement: sp.scientificScopeStatement || SCOPE,
    provenance: quarantineProvenance(sp.id, sp.provenance || []),
  };
}

function patchSpeciesBundle(path: string): number {
  if (!existsSync(path)) return 0;
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { species?: Species[] } | Species[];
  let count = 0;
  if (Array.isArray(raw)) {
    const next = raw.map((s) => {
      count += 1;
      return quarantineSpecies(s);
    });
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
    return count;
  }
  if (Array.isArray(raw.species)) {
    raw.species = raw.species.map((s) => {
      count += 1;
      return quarantineSpecies(s);
    });
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
  }
  return count;
}

function patchRegionBundle(path: string): number {
  if (!existsSync(path)) return 0;
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { species?: Species[] };
  if (!Array.isArray(raw.species)) return 0;
  raw.species = raw.species.map(quarantineSpecies);
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
  return raw.species.length;
}

function patchManifest(path: string): void {
  if (!existsSync(path)) return;
  const m = JSON.parse(readFileSync(path, 'utf8')) as { description?: string };
  m.description =
    'Sample biodiversity + Time Atlas snapshot — game-authored + quarantined mock provenance (not source-verified; not Earth-complete)';
  writeFileSync(path, `${JSON.stringify(m, null, 2)}\n`);
}

function main(): void {
  const targets = [
    join(ROOT, 'public/data/bundles/hero-species.json'),
    join(ROOT, 'public/data/bundles/archive-stubs.json'),
    join(ROOT, 'public/data/launch/frozen/hero-species.json'),
  ];
  let total = 0;
  for (const t of targets) total += patchSpeciesBundle(t);

  const bundleDir = join(ROOT, 'public/data/bundles');
  for (const name of readdirSync(bundleDir)) {
    if (name.startsWith('region-') && name.endsWith('.json')) {
      total += patchRegionBundle(join(bundleDir, name));
    }
  }

  patchManifest(join(ROOT, 'public/data/manifest.json'));

  // Keep production readiness honest: mock science still present → audit must fail.
  console.log(`Quarantined mock provenance across ${total} species records (still mock_sample, never source_verified).`);
}

main();
