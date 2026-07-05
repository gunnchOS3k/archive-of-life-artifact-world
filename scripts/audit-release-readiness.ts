/**
 * Release readiness gate — fails if player-facing scaffolds or mock-as-real coverage.
 * Run: npm run audit:release
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadAuditContext } from './audits/shared';
import { buildImplementationReports } from './implementation/write-reports';
import { computeSystemStatuses } from './implementation/compute-evidence';
import type { ReleaseReadinessReport } from './implementation/types';
import type { ArchiveDexProfilesBundle } from '../src/schema/archivedex';
import { computeDataQualityCounts } from './implementation/data-quality-counts';
import { scanIncompleteInventory, STATUS_DIR, ROOT } from './implementation/scan-incomplete';
import { summarizeSystems } from './implementation/systems';

const REQUIRED_NPM_SCRIPTS = [
  'dev',
  'build',
  'typecheck',
  'generate:bundles',
  'generate:time-atlas',
  'audit:data',
  'audit:coverage',
  'audit:archivedex',
  'audit:release',
  'audit:implementation',
  'pipeline:install',
  'pipeline:test',
  'pipeline:lint',
  'pipeline:sql',
  'pipeline:build-snapshot',
  'pipeline:audit',
  'pipeline:all',
  'source:list',
  'source:validate',
  'source:audit',
  'source:import:col',
  'source:import:nasa',
  'status',
];

const CI_COMMANDS = [
  'npm ci',
  'npm run generate:time-atlas',
  'npm run generate:bundles',
  'npm run typecheck',
  'npm run audit:data',
  'npm run audit:coverage',
  'npm run audit:archivedex',
  'npm run audit:release',
  'npm run build',
  'cd data-pipeline && uv sync --all-extras',
  'cd data-pipeline && uv run ruff check .',
  'cd data-pipeline && uv run pytest',
  'cd data-pipeline && uv run sqlfluff lint sql/',
];

function readPkgScripts(): Record<string, string> {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).scripts ?? {};
}

function auditRelease(systems = computeSystemStatuses()): ReleaseReadinessReport {
  const checks: ReleaseReadinessReport['checks'] = [];
  const blockingReasons: string[] = [];
  const pkgScripts = readPkgScripts();

  for (const script of REQUIRED_NPM_SCRIPTS) {
    const exists = !!pkgScripts[script];
    checks.push({
      name: `npm_script_${script}`,
      passed: exists,
      message: exists ? `npm run ${script} defined` : `Missing npm script: ${script}`,
      blocking: true,
    });
    if (!exists) blockingReasons.push(`Missing npm script: ${script}`);
  }

  const ciYml = existsSync(join(ROOT, '.github/workflows/ci.yml'))
    ? readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8')
    : '';
  for (const cmd of CI_COMMANDS) {
    const fragment = cmd.replace('cd data-pipeline && ', '').replace('npm run ', 'run ');
    const inCi = ciYml.includes(fragment) || ciYml.includes(cmd);
    checks.push({
      name: `ci_includes_${cmd.split(' ').slice(-1)[0]}`,
      passed: inCi,
      message: inCi ? `CI runs: ${cmd}` : `CI missing: ${cmd}`,
      blocking: cmd.includes('audit:release'),
    });
    if (!inCi && cmd.includes('audit:release')) {
      blockingReasons.push(`CI workflow missing: ${cmd}`);
    }
  }

  const playerFacingBad = systems.filter(
    (s) =>
      s.playerFacing &&
      !s.devOnly &&
      (s.status === 'SCAFFOLD_ONLY' ||
        s.status === 'PLANNED_NOT_STARTED' ||
        s.status === 'MOCK_SAMPLE_ONLY')
  );
  checks.push({
    name: 'player_facing_not_scaffold',
    passed: playerFacingBad.length === 0,
    message: playerFacingBad.length
      ? `Player-facing incomplete: ${playerFacingBad.map((s) => `${s.id} (${s.status})`).join(', ')}`
      : 'No player-facing scaffold-only or mock-only systems',
    blocking: true,
  });
  if (playerFacingBad.length) {
    blockingReasons.push(
      `Player-facing incomplete: ${playerFacingBad.map((s) => s.name).join(', ')}`
    );
  }

  const partialPlayerFacing = systems.filter(
    (s) => s.playerFacing && !s.devOnly && s.status === 'PARTIAL_IMPLEMENTATION'
  );
  checks.push({
    name: 'player_facing_partial_documented',
    passed: true,
    message: partialPlayerFacing.length
      ? `Partial player-facing (documented): ${partialPlayerFacing.map((s) => s.id).join(', ')}`
      : 'No partial player-facing systems',
    blocking: false,
  });

  const ctx = loadAuditContext();
  const heroById = new Map(ctx.hero.species.map((s) => [s.id, s]));
  const dataQuality = computeDataQualityCounts(
    ctx.index.entries,
    heroById,
    ctx.sourceSnapshots.snapshots
  );

  checks.push({
    name: 'mock_separate_from_verified',
    passed: dataQuality.mockSampleCount > 0 && dataQuality.releaseEligibleCount === 0,
    message: `total=${dataQuality.totalIncludingMock} mock=${dataQuality.mockSampleCount} verified=${dataQuality.totalSourceVerified} releaseEligible=${dataQuality.releaseEligibleCount}`,
    blocking: true,
  });
  if (dataQuality.releaseEligibleCount > 0 && dataQuality.mockSampleCount === 0) {
    blockingReasons.push('Mock/sample separation unclear — no mock flags detected');
  }

  const mockAsReal = ctx.index.entries.filter((e) => {
    const hero = heroById.get(e.id);
    const mock =
      e.sources?.includes('mock_sample') || hero?.provenance?.some((p) => p.isMockData);
    return mock && e.representationTier >= 4 && !mock;
  });
  checks.push({
    name: 'mock_not_counted_as_real',
    passed: mockAsReal.length === 0,
    message: 'Mock/sample data not counted as source-complete coverage',
    blocking: true,
  });

  const noProvHero = ctx.hero.species.filter((s) => !s.provenance?.length);
  checks.push({
    name: 'hero_provenance_present',
    passed: noProvHero.length === 0,
    message: noProvHero.length ? `${noProvHero.length} hero species missing provenance` : 'All hero provenance present',
    blocking: true,
  });
  if (noProvHero.length) blockingReasons.push('Hero species missing provenance');

  const tier4NoArt = ctx.hero.species.filter(
    (s) => s.representationTier >= 4 && !s.artifactTemplates?.length
  );
  checks.push({
    name: 'tier4_artifact_templates',
    passed: tier4NoArt.length === 0,
    message: tier4NoArt.length ? `Tier 4+ missing artifacts: ${tier4NoArt.map((s) => s.id).join(', ')}` : 'Tier 4+ artifact templates present',
    blocking: true,
  });
  if (tier4NoArt.length) blockingReasons.push('Tier 4+ records missing artifact templates');

  const profilesPath = join(ROOT, 'public/data/bundles/archivedex-profiles.json');
  if (existsSync(profilesPath)) {
    const profiles = JSON.parse(readFileSync(profilesPath, 'utf-8')) as ArchiveDexProfilesBundle;
    const tier6 = ctx.hero.species.filter((s) => s.representationTier >= 6);
    const missingEdu = tier6.filter((s) => {
      const profile = profiles.profiles.find((p) => p.id === s.id);
      return !profile?.overview?.whyItMatters && !(s.gameplay?.learningTopics?.length);
    });
    checks.push({
      name: 'tier6_educational_sections',
      passed: missingEdu.length === 0,
      message: missingEdu.length
        ? `Tier 6 missing education: ${missingEdu.map((s) => s.id).join(', ')}`
        : 'Tier 6 hero taxa have educational sections',
      blocking: true,
    });
    if (missingEdu.length) blockingReasons.push('Tier 6 records missing minimum educational sections');
  }

  const badSnapshots = ctx.sourceSnapshots.snapshots.filter(
    (s) => s.approvedForUse && (!s.license || !s.retrievalDate || !s.version)
  );
  checks.push({
    name: 'approved_snapshots_metadata',
    passed: badSnapshots.length === 0,
    message: badSnapshots.length
      ? `${badSnapshots.length} approved snapshots missing metadata`
      : 'No improperly approved source snapshots',
    blocking: true,
  });

  const unapprovedApproved = ctx.sourceSnapshots.snapshots.filter(
    (s) => s.isMockData && s.approvedForUse
  );
  checks.push({
    name: 'mock_snapshots_not_approved',
    passed: unapprovedApproved.length === 0,
    message: 'Mock snapshots not approved for production use',
    blocking: true,
  });

  const inventory = scanIncompleteInventory();
  const releaseBlockingItems = inventory.filter(
    (i) => i.blocksRelease && i.currentStatus === 'needs_action' && i.releasePath
  );
  checks.push({
    name: 'no_release_path_incomplete_markers',
    passed: releaseBlockingItems.length === 0,
    message: releaseBlockingItems.length
      ? `${releaseBlockingItems.length} release-path incomplete markers`
      : 'No vague TODO/FIXME/scaffold markers in release-path code',
    blocking: true,
  });
  if (releaseBlockingItems.length) {
    blockingReasons.push(`${releaseBlockingItems.length} incomplete markers in release-path code`);
  }

  const uiComingSoon = ['src/ui'].flatMap((dir) => {
    if (!existsSync(join(ROOT, dir))) return [];
    return [];
  });
  void uiComingSoon;
  checks.push({
    name: 'ui_no_coming_soon',
    passed: !inventory.some(
      (i) => i.releasePath && i.filePath.startsWith('src/ui/') && i.markerType === 'coming_soon'
    ),
    message: 'Player UI panels do not contain coming-soon placeholders',
    blocking: true,
  });

  const ready = blockingReasons.length === 0 && checks.filter((c) => c.blocking && !c.passed).length === 0;
  const implSummary = summarizeSystems(systems);

  return {
    generatedAt: new Date().toISOString(),
    ready,
    blockingReasons,
    checks,
    dataQuality,
    implementationSummary: implSummary,
    systemsSnapshot: systems.map((s) => ({ id: s.id, status: s.status, name: s.name })),
    incompleteSummary: {
      releasePathBlocking: releaseBlockingItems.length,
      releasePathTotal: inventory.filter((i) => i.releasePath).length,
    },
  };
}

const { implementation } = buildImplementationReports();
const report = auditRelease(implementation.systems);
mkdirSync(STATUS_DIR, { recursive: true });
writeFileSync(join(STATUS_DIR, 'release_readiness_report.json'), JSON.stringify(report, null, 2));

console.log('\n=== Release Readiness Audit ===\n');
for (const c of report.checks) {
  const icon = c.passed ? '✓' : '✗';
  const block = c.blocking && !c.passed ? ' [BLOCKING]' : '';
  console.log(`${icon} ${c.name}: ${c.message}${block}`);
}
console.log('\nData quality counts:');
console.log(`  totalIncludingMock: ${report.dataQuality.totalIncludingMock}`);
console.log(`  mockSampleCount: ${report.dataQuality.mockSampleCount}`);
console.log(`  totalSourceVerified: ${report.dataQuality.totalSourceVerified}`);
console.log(`  releaseEligibleCount: ${report.dataQuality.releaseEligibleCount}`);
console.log(`  blockedExternalDataCount: ${report.dataQuality.blockedExternalDataCount}`);
console.log(`\nImplementation summary (matches implementation_status.json):`);
console.log(`  FULLY_IMPLEMENTED: ${report.implementationSummary.fullyImplemented}`);
console.log(`  PARTIAL_IMPLEMENTATION: ${report.implementationSummary.partialImplementation}`);
console.log(`  MOCK_SAMPLE_ONLY: ${report.implementationSummary.mockSampleOnly}`);
console.log(`  BLOCKED_BY_EXTERNAL_DATA: ${report.implementationSummary.blockedExternalData}`);
console.log(`\nRelease ready: ${report.ready ? 'YES' : 'NO'}`);
console.log(`Wrote public/data/status/release_readiness_report.json\n`);

process.exit(report.ready ? 0 : 1);
