/**
 * Restore frozen launch Tier E/F + region floors after generate:bundles.
 * generate:bundles still emits a sample hero/region set; launch product floors
 * remain the Cont V/VI audited sets (12 regions, E≥120 playable, F=24).
 * Also syncs search-index + manifest so audit:data stays consistent.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const FREEZE = join(ROOT, 'public/data/launch/frozen');
const BUNDLES = join(ROOT, 'public/data/bundles');
const MANIFEST = join(ROOT, 'public/data/manifest.json');

const FILES = [
  'regions.json',
  'hero-species.json',
  'encounter-taxa.json',
  'clues.json',
  'companion-modules.json',
  'expeditions.json',
  // Cont VI CI: generate:bundles emits a sample search-index (~40 entries).
  // Floor audits require the frozen launch index (E≥120 + F=24).
  'search-index.json',
];

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function syncIndexAndManifest(): void {
  const heroes = loadJson<{
    species: Array<{
      id: string;
      commonName?: string;
      scientificName: string;
      group?: string;
      taxonomy?: { family?: string };
      conservation?: { iucnCategory?: string; assessed?: boolean };
      isExtinct?: boolean;
      conservationStatus?: string;
      region?: string;
      timeUnitIds?: string[];
      provenance?: Array<{ source?: string }>;
    }>;
  }>(join(BUNDLES, 'hero-species.json'));

  const indexPath = join(BUNDLES, 'search-index.json');
  const index = loadJson<{
    snapshotId?: string;
    totalCount?: number;
    entries: Array<Record<string, unknown>>;
  }>(indexPath);

  const byId = new Map(index.entries.map((e) => [String(e.id), e]));
  for (const s of heroes.species) {
    if (byId.has(s.id)) continue;
    const extinct = Boolean(s.isExtinct || s.conservationStatus === 'Extinct');
    const iucn = s.conservation?.iucnCategory;
    const threatened = ['CR', 'EN', 'VU', 'NT'].includes(String(iucn ?? ''));
    byId.set(s.id, {
      id: s.id,
      commonName: s.commonName ?? s.scientificName,
      scientificName: s.scientificName,
      group: s.group ?? 'unknown',
      family: s.taxonomy?.family ?? 'unknown',
      tier: 'hero',
      representationTier: 5,
      lifeStatus: extinct ? 'extinct' : 'extant',
      timeUnitIds: s.timeUnitIds ?? [],
      sources: ['game_authored'],
      region: s.region,
      iucnCategory: iucn,
      isExtinct: extinct,
      isThreatened: threatened,
      isPlayable: true,
      programTier: 'F_Flagship',
    });
  }

  // Ensure encounter catalog taxa are indexed (TierCoverageReport counts E_Encounter).
  const encounterPath = join(BUNDLES, 'encounter-taxa.json');
  if (existsSync(encounterPath)) {
    const enc = loadJson<{
      species: Array<{
        id: string;
        commonName?: string;
        scientificName: string;
        group?: string;
        taxonomy?: { family?: string };
        programTier?: string;
        region?: string;
        timeUnitIds?: string[];
        isExtinct?: boolean;
        isPlayable?: boolean;
        provenance?: Array<{ source?: string }>;
      }>;
    }>(encounterPath);
    for (const s of enc.species) {
      if (byId.has(s.id)) continue;
      const tier = s.programTier === 'F_Flagship' ? 'hero' : 'regional';
      byId.set(s.id, {
        id: s.id,
        commonName: s.commonName ?? s.scientificName,
        scientificName: s.scientificName,
        group: s.group ?? 'unknown',
        family: s.taxonomy?.family ?? 'unknown',
        tier,
        representationTier: s.programTier === 'F_Flagship' ? 5 : 2,
        lifeStatus: s.isExtinct ? 'extinct' : 'extant',
        timeUnitIds: s.timeUnitIds ?? [],
        sources: ['game_authored'],
        region: s.region,
        isExtinct: Boolean(s.isExtinct),
        isThreatened: false,
        isPlayable: s.isPlayable !== false,
        programTier: s.programTier ?? 'E_Encounter',
      });
    }
  }

  const entries = [...byId.values()];
  const nextIndex = {
    ...index,
    totalCount: entries.length,
    entries,
  };
  writeFileSync(indexPath, JSON.stringify(nextIndex, null, 2) + '\n');

  if (existsSync(MANIFEST)) {
    const manifest = loadJson<{
      bundles?: Record<string, { recordCount?: number; path?: string; kind?: string }>;
      coverage?: Record<string, number>;
      [k: string]: unknown;
    }>(MANIFEST);
    const threatened = entries.filter((e) => e.isThreatened).length;
    const extinct = entries.filter((e) => e.isExtinct).length;
    const iucnAssessed = heroes.species.filter((s) => s.conservation?.assessed).length;
    if (manifest.bundles?.heroSpecies) {
      manifest.bundles.heroSpecies.recordCount = heroes.species.length;
    }
    if (manifest.bundles?.searchIndex) {
      manifest.bundles.searchIndex.recordCount = entries.length;
    }
    manifest.coverage = {
      ...(manifest.coverage ?? {}),
      representedSpecies: entries.length,
      heroSpecies: heroes.species.length,
      playableQuestSpecies: heroes.species.length,
      threatened,
      extinctFossil: extinct,
      iucnAssessed: Math.max(manifest.coverage?.iucnAssessed ?? 0, iucnAssessed),
    };
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(
    `synced search-index=${entries.length} heroes=${heroes.species.length} threatened=${entries.filter((e) => e.isThreatened).length}`,
  );
}

function main(): void {
  if (!existsSync(FREEZE)) {
    console.error(`Missing launch freeze dir: ${FREEZE}`);
    process.exit(1);
  }
  mkdirSync(BUNDLES, { recursive: true });
  for (const f of FILES) {
    const src = join(FREEZE, f);
    if (!existsSync(src)) {
      console.error(`Missing freeze file: ${src}`);
      process.exit(1);
    }
    copyFileSync(src, join(BUNDLES, f));
    console.log(`restored ${f}`);
  }
  for (const name of readdirSync(FREEZE)) {
    if (name.startsWith('region-') && name.endsWith('.json')) {
      copyFileSync(join(FREEZE, name), join(BUNDLES, name));
      console.log(`restored ${name}`);
    }
  }
  syncIndexAndManifest();
  console.log('launch floors restored');
}

main();
