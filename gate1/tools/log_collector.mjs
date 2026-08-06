#!/usr/bin/env node
import { mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'gate1/evidence/out/runtime_logs.jsonl');
mkdirSync(dirname(OUT), { recursive: true });
appendFileSync(OUT, JSON.stringify({
  game: 'archive-of-life-artifact-world',
  evidence_type: 'log_collector',
  timestamp: new Date().toISOString(),
  message: process.argv.slice(2).join(' ') || 'log collector invoked',
}) + '\n');
console.log(OUT);
