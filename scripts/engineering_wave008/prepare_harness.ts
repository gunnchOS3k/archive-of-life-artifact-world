/**
 * Deprecated: static harness removed for integrity repair (DEFECT A).
 * Copies fixtures into public/ for Vite product E2E.
 */
import { mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'data/scientific_fixtures/wave008-scientific-fixture-v1.json');
const destDir = join(root, 'public/data/scientific_fixtures');
const dest = join(destDir, 'wave008-scientific-fixture-v1.json');
const harness = join(root, 'artifacts/engineering_wave008/_browser_harness.html');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
if (existsSync(harness)) rmSync(harness);
console.log('wave008 prepare: fixtures copied for Vite ArchiveDex; static harness removed');
