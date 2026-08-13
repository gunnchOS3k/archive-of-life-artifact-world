#!/usr/bin/env node
/**
 * Validate Archive full-product-depth register + experience review honesty.
 * Exit non-zero on overclaims or missing required facets.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const REGISTER = join(ROOT, 'artifacts/archive_full/ARCHIVE_FULL_PRODUCT_REGISTER.json');
const CRITIC = join(ROOT, 'artifacts/experience_review/archive-of-life/GAME_CRITIC_REVIEW.json');
const HEURISTIC = join(ROOT, 'artifacts/experience_review/archive-of-life/AI_HEURISTIC_REVIEW.json');
const HONESTY = join(ROOT, 'artifacts/archive_full/DATA_COVERAGE_HONESTY.json');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function load(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

const reg = load(REGISTER);
const critic = load(CRITIC);
const heuristic = load(HEURISTIC);
const honesty = load(HONESTY);

if (reg.FULL_GAME_CONTENT_COMPLETE === true) fail('FULL_GAME_CONTENT_COMPLETE must be false');
if (reg.HUMAN_POLISH !== 'HUMAN_PENDING') fail('HUMAN_POLISH must be HUMAN_PENDING');
if (reg.VISUAL_MODEL_REVIEW !== 'UNAVAILABLE') fail('VISUAL_MODEL_REVIEW must be UNAVAILABLE');
if (reg.defects?.S0_open !== 0 || reg.defects?.S1_open !== 0) fail('S0/S1 must be 0');

const requiredFeatures = [
  'exploration_loop',
  'regions_eras',
  'species_encounters',
  'artifacts_provenance',
  'taxonomy',
  'archivedex',
  'maps',
  'companion_progression',
  'companion_customization',
  'offline_data_integrity',
  'a11y',
  'save',
  'performance',
];
for (const f of requiredFeatures) {
  if (!reg.features?.[f]) fail(`missing feature facet: ${f}`);
}

if (critic.classification !== 'ALPHA') fail('critic classification must be ALPHA');
if (critic.VISUAL_MODEL_REVIEW !== 'UNAVAILABLE') fail('critic VISUAL_MODEL_REVIEW must be UNAVAILABLE');
if (heuristic.VISUAL_MODEL_REVIEW !== 'UNAVAILABLE') fail('heuristic VISUAL_MODEL_REVIEW must be UNAVAILABLE');
if (heuristic.HUMAN_POLISH !== 'HUMAN_PENDING') fail('heuristic HUMAN_POLISH must be HUMAN_PENDING');

if (honesty.GLOBAL_DATA_COMPLETE === true) fail('GLOBAL_DATA_COMPLETE overclaim');
if (honesty.ALL_SPECIES_INGESTED === true) fail('ALL_SPECIES_INGESTED overclaim');

console.log('PASS ARCHIVE_FULL_PRODUCT_DEPTH_DIGITAL');
console.log(
  JSON.stringify(
    {
      tip: reg.tip_short ?? reg.tip_sha,
      critic: critic.classification,
      S0: reg.defects.S0_open,
      S1: reg.defects.S1_open,
      features: requiredFeatures.length,
    },
    null,
    2,
  ),
);
