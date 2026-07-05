#!/usr/bin/env tsx
/**
 * Project status summary — npm run status
 */
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildImplementationReports } from './implementation/write-reports';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATUS = join(ROOT, 'public/data/status');

function readJson<T>(name: string): T | null {
  const p = join(STATUS, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as T;
}

const { implementation } = buildImplementationReports();
const release = readJson<{ ready: boolean; implementationSummary: typeof implementation.summary }>(
  'release_readiness_report.json'
);
const sourceImport = readJson<{
  importedCount: number;
  blockedCount: number;
  sources: Array<{
    source: string;
    name: string;
    status: string;
    command_available?: boolean;
    configured: boolean;
    imported: boolean;
    record_count: number;
    verified_record_count?: number;
    next_action?: string;
    blocked_reason?: string;
  }>;
}>('source_import_status.json');

const s = implementation.summary;

console.log('\n=== Archive of Life — Project Status ===\n');
console.log('Implementation status:');
console.log(`  FULLY_IMPLEMENTED:          ${s.fullyImplemented}`);
console.log(`  PARTIAL_IMPLEMENTATION:     ${s.partialImplementation}`);
console.log(`  MOCK_SAMPLE_ONLY:           ${s.mockSampleOnly}`);
console.log(`  BLOCKED_BY_EXTERNAL_DATA:   ${s.blockedExternalData}`);
console.log(`  SCAFFOLD_ONLY:              ${s.scaffoldOnly}`);

const nonFull = implementation.systems.filter(
  (sys) => sys.status !== 'FULLY_IMPLEMENTED'
);
if (nonFull.length) {
  console.log('\nRemaining non-full systems:');
  for (const sys of nonFull) {
    console.log(`  • ${sys.name} [${sys.status}]`);
    if (sys.blockedReason) console.log(`    Blocked: ${sys.blockedReason}`);
    else console.log(`    ${sys.notes.slice(0, 120)}${sys.notes.length > 120 ? '…' : ''}`);
  }
}

console.log(`\nRelease readiness: ${release?.ready ? 'READY' : 'NOT READY (run npm run audit:release)'}`);
if (release?.implementationSummary) {
  const rs = release.implementationSummary;
  const match =
    rs.fullyImplemented === s.fullyImplemented &&
    rs.partialImplementation === s.partialImplementation &&
    rs.blockedExternalData === s.blockedExternalData;
  console.log(`  Report sync with implementation_status: ${match ? 'OK' : 'MISMATCH — re-run audit:release'}`);
}

if (sourceImport) {
  console.log('\nSource imports:');
  console.log(`  Imported: ${sourceImport.importedCount} · Blocked: ${sourceImport.blockedCount}`);
  for (const src of sourceImport.sources) {
    const flags = [
      src.command_available !== false ? 'cmd' : null,
      src.configured ? 'configured' : null,
      src.imported ? 'imported' : null,
    ]
      .filter(Boolean)
      .join(', ');
    const verified = src.verified_record_count ?? (src.imported ? src.record_count : 0);
    console.log(
      `  • ${src.name}: ${src.status.toUpperCase()} [${flags || 'blocked'}] records=${src.record_count} verified=${verified}`
    );
    if (!src.imported && src.next_action) console.log(`    Next: ${src.next_action}`);
  }
} else {
  console.log('\nSource imports: run npm run source:audit');
}

console.log('\nNext actions:');
if (nonFull.some((x) => x.id === 'earth_layer_console' && x.status === 'PARTIAL_IMPLEMENTATION')) {
  console.log('  • npm run source:import:nasa — cache real NASA metadata for Earth Layer Console');
}
for (const sys of nonFull.filter((x) => x.status === 'BLOCKED_BY_EXTERNAL_DATA')) {
  const cmd =
    sys.id === 'catalogue_of_life_ingestion'
      ? 'source:import:col'
      : sys.id === 'neotoma_ingestion'
        ? 'source:import:neotoma'
        : sys.id === 'nasa_earthdata_ingestion'
          ? 'source:import:nasa'
          : null;
  if (cmd) console.log(`  • npm run ${cmd} — ${sys.name}`);
}
console.log('  • npm run audit:implementation && npm run audit:release — refresh status JSON\n');
