/**
 * Cont VII — validate MOCK release firewall + rewrite status artifact.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { runMockReleaseFirewall } from '../src/claims/mockReleaseFirewall';

const report = runMockReleaseFirewall();
const outDir = join(process.cwd(), 'public/data/status');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'mock_release_firewall.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, ...report.honesty, violations: report.violations }, null, 2));
if (!report.ok) process.exit(1);
