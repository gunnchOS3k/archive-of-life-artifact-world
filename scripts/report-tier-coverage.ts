/**
 * Generate public/data/coverage/tier_coverage_by_source.json
 * Run: npm run report:tier-coverage
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { buildTierCoverageReport, type TierCoverageBySourceReport } from '../src/coverage/TierCoverageReport';

const ROOT = join(process.cwd(), 'public/data');
const COVERAGE = join(ROOT, 'coverage');

type IndexFile = {
  snapshotId: string;
  entries: Array<{
    id: string;
    commonName: string;
    scientificName: string;
    group: string;
    family: string;
    tier: 'hero' | 'regional' | 'family' | 'database';
    representationTier: number;
    isExtinct: boolean;
    isThreatened: boolean;
    isPlayable: boolean;
    sources?: string[];
    programTier?: string;
  }>;
};

const index = JSON.parse(readFileSync(join(ROOT, 'bundles/search-index.json'), 'utf8')) as IndexFile;

const regions = JSON.parse(readFileSync(join(ROOT, 'bundles/regions.json'), 'utf8')) as Array<{
  id: string;
}>;

const report: TierCoverageBySourceReport = buildTierCoverageReport({
  snapshotId: index.snapshotId,
  // Runtime JSON — cast representationTier through the builder's structural input
  entries: index.entries as Parameters<typeof buildTierCoverageReport>[0]['entries'],
  regionIds: regions.map((r) => r.id),
  generatedAt: new Date().toISOString(),
});

mkdirSync(COVERAGE, { recursive: true });
const out = join(COVERAGE, 'tier_coverage_by_source.json');
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');

console.log(`Wrote ${out}`);
console.log(
  `Floors: regions ${report.floors.regions.actual}/12 (${report.floors.regions.met ? 'MET' : 'GAP'})`,
);
console.log(
  `        encounters ${report.floors.encounterTaxa.actual}/120 (${report.floors.encounterTaxa.met ? 'MET' : 'GAP'})`,
);
console.log(
  `        flagship ${report.floors.flagship.actual}/24 (${report.floors.flagship.met ? 'MET' : 'GAP'})`,
);
console.log(
  `        polar ${report.floors.polarRegion.present ? 'present' : 'MISSING'} (${report.floors.polarRegion.met ? 'MET' : 'GAP'})`,
);
console.log(`Honesty: fixturesNeverClaimedLive=${report.honesty.fixturesNeverClaimedLive}`);

const allMet =
  report.floors.regions.met &&
  report.floors.encounterTaxa.met &&
  report.floors.flagship.met &&
  report.floors.polarRegion.met;

process.exit(allMet ? 0 : 1);
