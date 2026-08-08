/**
 * Restore frozen launch Tier E/F + region floors after generate:bundles.
 * generate:bundles still emits sample heroes/regions (6 / 23); launch product
 * floors remain the Cont V/VI audited sets (12 regions, E≥120, F=24).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const FREEZE = join(ROOT, 'public/data/launch/frozen');
const BUNDLES = join(ROOT, 'public/data/bundles');

const FILES = [
  'regions.json',
  'hero-species.json',
  'encounter-taxa.json',
  'clues.json',
  'companion-modules.json',
  'expeditions.json',
  'search-index.json',
];

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
  console.log('launch floors restored');
}

main();
