#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const start = process.hrtime.bigint();
let n = 0; for (let i = 0; i < 20000; i++) n += i % 7;
const out = {
  game: 'archive-of-life-artifact-world',
  evidence_type: 'performance_sample',
  timestamp: new Date().toISOString(),
  sample_ms: Number(process.hrtime.bigint() - start) / 1e6,
  hook: 'node_cpu_microbench',
  n,
};
const path = join(ROOT, 'gate1/evidence/out/performance_sample.json');
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
