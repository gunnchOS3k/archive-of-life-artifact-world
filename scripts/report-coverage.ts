/**
 * Generate gap_report.json and bias_report.json
 * Run: npm run report:coverage
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { coverageAuditRunner } from '../src/coverage/CoverageAuditRunner';
import { loadAuditContext, COVERAGE, printResults } from './audits/shared';
import { auditSpecies } from './audits/species';
import { auditTime } from './audits/time';
import { auditBiomes } from './audits/biomes';
import { auditEarth } from './audits/earth';
import { auditProvenance } from './audits/provenance';
import { auditBias } from './audits/bias';

const ctx = loadAuditContext();
const heroById = new Map(ctx.hero.species.map((s) => [s.id, s]));

const gapReport = coverageAuditRunner.buildGapReport(
  ctx.index.entries,
  heroById,
  ctx.manifest.snapshotId
);
const biasReport = coverageAuditRunner.buildBiasReport(ctx.index.entries, ctx.manifest.snapshotId);

mkdirSync(COVERAGE, { recursive: true });
writeFileSync(join(COVERAGE, 'gap_report.json'), JSON.stringify(gapReport, null, 2));
writeFileSync(join(COVERAGE, 'bias_report.json'), JSON.stringify(biasReport, null, 2));

console.log(`Wrote gap_report.json (${gapReport.gaps.length} gaps)`);
console.log(`Wrote bias_report.json (${biasReport.warnings.length} warnings)`);

const allResults = [
  ...auditSpecies(ctx),
  ...auditTime(ctx),
  ...auditBiomes(ctx),
  ...auditEarth(ctx),
  ...auditProvenance(ctx),
  ...auditBias(ctx),
];
const failed = printResults(allResults, 'Coverage Report Summary');
void failed;
console.log('\nReports written to public/data/coverage/\n');
process.exit(0);
