import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runArchiveCoreLoop, writeEvidence } from './core_loop_runner.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const REQUIRED = [
  'game','build_id','commit','platform','session_id',
  'step','timestamp','result','state_checksum','evidence_type',
];
const { events, ok, saveChecksum } = runArchiveCoreLoop();
writeEvidence(events, ok, saveChecksum);
if (!ok) { console.error('FAIL', events.filter(e => e.result !== 'pass')); process.exit(1); }
for (const e of events) {
  for (const k of REQUIRED) {
    if (!e[k]) { console.error('missing', k, e); process.exit(1); }
  }
}
const schema = JSON.parse(readFileSync(join(ROOT, 'gate1/contracts/game_core_loop.schema.json'), 'utf8'));
for (const k of REQUIRED) if (!schema.required.includes(k)) { console.error('schema missing', k); process.exit(1); }
console.log(JSON.stringify({ ok: true, events: events.length, saveChecksum }, null, 2));
