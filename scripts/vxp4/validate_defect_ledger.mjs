#!/usr/bin/env node
/**
 * Validate VXP4 visual defect ledger shape.
 * Fails on duplicate object keys (historical bug) and missing required fields.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LEDGER = join(ROOT, 'artifacts/vxp4/reports/VXP4_VISUAL_DEFECT_LEDGER.json');

function findDuplicateKeys(raw) {
  const duplicates = [];
  const objectBodies = [...raw.matchAll(/\{([^{}]*?)\}/gs)];
  for (const match of objectBodies) {
    const body = match[1];
    const keys = [...body.matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]);
    const seen = new Set();
    for (const key of keys) {
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
  }
  return [...new Set(duplicates)];
}

const raw = readFileSync(LEDGER, 'utf8');
const dupes = findDuplicateKeys(raw);
if (dupes.length) {
  console.error(`VXP4 ledger has duplicate keys: ${dupes.join(', ')}`);
  process.exit(1);
}

const data = JSON.parse(raw);
if (!Array.isArray(data.defects) || data.defects.length < 1) {
  console.error('VXP4 ledger missing defects array');
  process.exit(1);
}

const required = ['id', 'category', 'phase', 'summary', 'status'];
for (const defect of data.defects) {
  for (const field of required) {
    if (!(field in defect) || defect[field] == null || defect[field] === '') {
      console.error(`Defect ${defect.id ?? '(unknown)'} missing required field: ${field}`);
      process.exit(1);
    }
  }
  if ('viewpoint' in defect) {
    console.error(`Defect ${defect.id} still uses legacy viewpoint key; use category + phase`);
    process.exit(1);
  }
}

const open = data.defects.filter((d) => d.status === 'open').length;
const resolved = data.defects.filter((d) => d.status === 'resolved').length;
if (data.open_count !== open || data.resolved_count !== resolved) {
  console.error(
    `Count mismatch: open_count=${data.open_count} actual=${open}; resolved_count=${data.resolved_count} actual=${resolved}`,
  );
  process.exit(1);
}

console.log(`VXP4 ledger schema OK (${data.defects.length} defects; open=${open}; resolved=${resolved})`);
