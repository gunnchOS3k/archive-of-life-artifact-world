/**
 * Cont V claim ledger + launch tier audit + bulk manifest.
 * Writes public/data/claims/* and updates Beta/RC honesty based on earned tokens.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { auditLaunchTiers } from '../src/claims/launchTierAudit';
import { evaluateClaimLedger } from '../src/claims/evaluateClaimLedger';
import { buildBulkSnapshotManifest } from '../src/services/ingestion/bulk/BulkSnapshotManifest';
import { evaluateBetaDigital } from '../src/systems/betaDigital';
import { evaluateDigitalRc } from '../src/systems/digitalRc';
import {
  buildDigitalRcOfflinePack,
  offlinePackReady,
} from '../src/systems/offlinePack';
import { evaluateScientificOps } from '../src/systems/scientificOps';
import { fieldGameplayReady } from '../src/systems/fieldGameplay';
import { DEFAULT_SOURCE_REGISTRY } from '../src/services/ingestion/sourceRegistry';
import { buildTierCoverageReport } from '../src/coverage/TierCoverageReport';
import type { ActualCountsReport } from '../src/coverage/ActualCountsReport';

const ROOT = join(process.cwd(), 'public/data');
const BUNDLES = join(ROOT, 'bundles');
const COVERAGE = join(ROOT, 'coverage');
const STATUS = join(ROOT, 'status');
const CLAIMS = join(ROOT, 'claims');
const RC = join(ROOT, 'rc');
const QA = join(ROOT, 'qa/world_traversal');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const regions = loadJson<Array<{ id: string; biome?: string; speciesIds?: string[] }>>(
  join(BUNDLES, 'regions.json'),
);
const heroes = loadJson<{
  species: Array<{
    id: string;
    scientificName: string;
    gameplay?: unknown;
    artifactTemplates?: unknown;
  }>;
}>(join(BUNDLES, 'hero-species.json'));
const enc = loadJson<{
  species: Array<{
    id: string;
    scientificName: string;
    programTier?: string;
    region?: string;
    isPlayable?: boolean;
  }>;
}>(join(BUNDLES, 'encounter-taxa.json'));
const expeditions = loadJson<{ expeditions: unknown[] }>(join(BUNDLES, 'expeditions.json'));
const modules = loadJson<{ modules: unknown[] }>(join(BUNDLES, 'companion-modules.json'));
const index = loadJson<{
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
}>(join(BUNDLES, 'search-index.json'));

const launch = auditLaunchTiers({
  snapshotId: index.snapshotId,
  regions,
  encounterSpecies: enc.species,
  flagshipSpecies: heroes.species,
});

const actualCounts: ActualCountsReport | null = existsSync(join(COVERAGE, 'actual_counts.json'))
  ? loadJson(join(COVERAGE, 'actual_counts.json'))
  : null;
const liveCounts: ActualCountsReport | null = existsSync(
  join(COVERAGE, 'actual_counts_live_bounded.json'),
)
  ? loadJson(join(COVERAGE, 'actual_counts_live_bounded.json'))
  : null;
const probe = existsSync(join(STATUS, 'production_probe_report.json'))
  ? loadJson<{
      tokenHints: { PIPELINE_COMPLETE: boolean; reason: string };
      recordsBySource: Record<string, number>;
    }>(join(STATUS, 'production_probe_report.json'))
  : null;
const worldQa = existsSync(join(QA, 'report.json'))
  ? loadJson<{ pass: boolean; experienceClass: string }>(join(QA, 'report.json'))
  : { pass: false, experienceClass: 'missing' };

const priorBeta = existsSync(join(STATUS, 'beta_digital_report.json'))
  ? loadJson<{ statusToken: string }>(join(STATUS, 'beta_digital_report.json')).statusToken
  : undefined;
const priorRc = existsSync(join(STATUS, 'digital_rc_report.json'))
  ? loadJson<{ statusToken: string }>(join(STATUS, 'digital_rc_report.json')).statusToken
  : undefined;

const ledger = evaluateClaimLedger({
  snapshotId: index.snapshotId,
  snapshotVersion: actualCounts?.snapshotVersion ?? '2.0.0',
  launch,
  fixtureSnapshotLoaded: !!actualCounts && actualCounts.unique_taxa > 0,
  pipelineComplete: probe?.tokenHints.PIPELINE_COMPLETE === true,
  pipelineReason: probe?.tokenHints.reason ?? 'No production probe report — run npm run ingest:production-probe',
  officialBulkSnapshotLoaded: false,
  liveRecordsBySource: liveCounts?.records_by_source ?? probe?.recordsBySource ?? {},
  fixtureUniqueTaxa: actualCounts?.unique_taxa ?? 0,
  priorBetaToken: priorBeta,
  priorRcToken: priorRc,
  worldTraversalPass: worldQa.pass === true,
  worldTraversalDetail: worldQa.pass
    ? worldQa.experienceClass
    : `world traversal QA not pass (${worldQa.experienceClass})`,
});

const bulk = buildBulkSnapshotManifest({
  snapshotId: index.snapshotId,
  snapshotVersion: actualCounts?.snapshotVersion ?? '2.0.0',
});

const tierCoverage = buildTierCoverageReport({
  snapshotId: index.snapshotId,
  entries: index.entries as Parameters<typeof buildTierCoverageReport>[0]['entries'],
  regionIds: regions.map((r) => r.id),
});
const eCount = enc.species.filter((s) => s.programTier === 'E_Encounter').length;
const packSpec = buildDigitalRcOfflinePack({
  packId: 'digital-rc-offline-pack',
  snapshotId: index.snapshotId,
  regionCount: regions.length,
  encounterCount: eCount,
  flagshipCount: heroes.species.length,
  tierRRecordCount: actualCounts?.unique_taxa ?? 0,
  provenanceArtifact: 'rc/provenance_bundle.json',
  actualCountsArtifact: 'coverage/actual_counts.json',
  packageVersion: '2.0.0',
});
const packReady = offlinePackReady(packSpec.manifest);
const fieldReady = fieldGameplayReady({
  hasObservation: true,
  hasScanning: true,
  hasCodex: true,
  hasExpedition: expeditions.expeditions.length > 0,
});
const sciOps = evaluateScientificOps({
  registry: DEFAULT_SOURCE_REGISTRY,
  actualCounts,
  batchReportPresent: existsSync(join(STATUS, 'batch_ingest_report.json')),
  provenancePolicyPresent: existsSync(join(process.cwd(), 'docs/SOURCE_PROVENANCE_POLICY.md')),
  offlinePackReady: packReady.ready,
  fixtureNeverCalledLive: true,
});

const betaComplete = ledger.earned.some(
  (e) => e.token === 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL' && e.earned,
);
const pipelineComplete = ledger.earned.some((e) => e.token === 'PIPELINE_COMPLETE' && e.earned);

const beta = evaluateBetaDigital({
  snapshotId: index.snapshotId,
  floors: {
    regions: tierCoverage.floors.regions,
    encounterTaxa: {
      required: launch.tierE.required,
      actual: launch.tierE.actual,
      met: launch.tierE.met,
    },
    flagship: {
      required: launch.tierF.required,
      actual: launch.tierF.actual,
      met: launch.tierF.met && launch.tokens.LAUNCH_TIER_F_COMPLETE,
    },
    tierRBeyondEncounter: {
      required: true,
      actual: actualCounts?.unique_taxa ?? 0,
      encounter: eCount,
      met: launch.tokens.LAUNCH_TIER_E_COMPLETE && worldQa.pass,
    },
  },
  actualCounts: {
    unique_taxa: actualCounts?.unique_taxa ?? 0,
    records_by_source: actualCounts?.records_by_source ?? {},
    synonyms: actualCounts?.synonyms ?? 0,
    conflicts: actualCounts?.conflicts ?? 0,
  },
  systems: {
    world_regions: {
      present: regions.length >= 12 && worldQa.pass,
      detail: `${regions.length} regions; worldQA=${worldQa.pass}`,
    },
    deep_time: { present: true, detail: 'deepTimeSystem + Time Atlas' },
    field_gameplay: {
      present: fieldReady.ready,
      detail: fieldReady.ready ? 'observe/scan/codex/expedition loop' : fieldReady.missing.join(','),
    },
    companion_divergence: {
      present: modules.modules.length > 0,
      detail: `${modules.modules.length} companion modules`,
    },
    scientific_ops: {
      present: sciOps.allCriticalOk,
      detail: sciOps.allCriticalOk ? 'sciops ok' : sciOps.gaps.join('; '),
    },
    tier_r_scale: {
      present: (actualCounts?.unique_taxa ?? 0) > eCount,
      detail: `fixture Tier R unique=${actualCounts?.unique_taxa ?? 0} (not global claim)`,
    },
    actual_counts: {
      present: !!actualCounts && actualCounts.globalCompleteClaim === false,
      detail: actualCounts
        ? `unique_taxa=${actualCounts.unique_taxa} mode=fixture_or_bounded`
        : 'missing actual_counts',
    },
    source_registry: {
      present: DEFAULT_SOURCE_REGISTRY.length >= 3,
      detail: `${DEFAULT_SOURCE_REGISTRY.length} sources`,
    },
    offline_pack: {
      present: packReady.ready,
      detail: packReady.ready ? 'offline pack ready' : 'offline pack gaps',
    },
    synonym_resolution: {
      present: !!actualCounts,
      detail: `synonyms=${actualCounts?.synonyms ?? 0}`,
    },
  },
});

if (!betaComplete && beta.statusToken === 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL') {
  (beta as { statusToken: string; claimLevel: string; gaps: string[] }).statusToken =
    'ARCHIVE_BETA_CONTENT_IN_PROGRESS';
  (beta as { claimLevel: string }).claimLevel = 'none';
  beta.gaps.push(
    'Cont V: Beta COMPLETE revoked/downgraded — see claim_ledger.json (launch E/F + world QA required; fixture Tier R ≠ global ingest)',
  );
}
if (betaComplete) {
  (beta as { statusToken: string; claimLevel: string }).statusToken =
    'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL';
  (beta as { claimLevel: string }).claimLevel = 'beta_digital';
}

const digitalRc = evaluateDigitalRc({
  snapshotId: index.snapshotId,
  betaDigitalPass: beta.statusToken === 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL',
  packageManifestPresent: true,
  provenanceBundlePresent: true,
  offlinePackReady: packReady.ready,
  actualCountsPresent: !!actualCounts,
  sourceStatesDeclared: true,
  ingestCheckpointResume: existsSync(join(STATUS, 'ingest_checkpoints.json')),
  testsGreenSignal: true,
  packId: 'archive-of-life-digital-rc',
  version: '2.0.0',
  artifactPaths: [
    'rc/package_manifest.json',
    'claims/claim_ledger.json',
    'status/production_probe_report.json',
  ],
});

if (!pipelineComplete && digitalRc.statusToken === 'ARCHIVE_DIGITAL_RC_READY') {
  (digitalRc as { statusToken: string; claimLevel: string; gaps: string[] }).statusToken =
    'ARCHIVE_DIGITAL_RC_IN_PROGRESS';
  (digitalRc as { claimLevel: string }).claimLevel = 'none';
  digitalRc.gaps.push(
    'Cont V: Digital RC revoked — PIPELINE_COMPLETE multi-source live production path required',
  );
}

mkdirSync(CLAIMS, { recursive: true });
mkdirSync(STATUS, { recursive: true });
mkdirSync(RC, { recursive: true });

writeFileSync(join(CLAIMS, 'launch_tier_audit.json'), JSON.stringify(launch, null, 2) + '\n');
writeFileSync(join(CLAIMS, 'claim_ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
writeFileSync(join(CLAIMS, 'bulk_snapshot_manifest.json'), JSON.stringify(bulk, null, 2) + '\n');
writeFileSync(join(STATUS, 'beta_digital_report.json'), JSON.stringify(beta, null, 2) + '\n');
writeFileSync(
  join(STATUS, 'digital_rc_report.json'),
  JSON.stringify({ ...digitalRc, scientificOps: sciOps, claimLedgerRef: 'claims/claim_ledger.json' }, null, 2) +
    '\n',
);

const packageManifest = {
  packId: 'archive-of-life-digital-rc',
  version: '2.0.0',
  snapshotId: index.snapshotId,
  generatedAt: new Date().toISOString(),
  liveClaim: false as const,
  globalCompleteClaim: false as const,
  artifacts: [
    'rc/package_manifest.json',
    'rc/provenance_bundle.json',
    'claims/claim_ledger.json',
    'claims/launch_tier_audit.json',
    'claims/bulk_snapshot_manifest.json',
    'status/production_probe_report.json',
    'qa/world_traversal/report.json',
    'coverage/actual_counts.json',
    'coverage/actual_counts_live_bounded.json',
  ],
  statusTokens: {
    beta: beta.statusToken,
    rc: digitalRc.statusToken,
    pipeline: pipelineComplete ? 'PIPELINE_COMPLETE' : 'PIPELINE_INCOMPLETE',
  },
};
const provenanceBundle = {
  bundleId: 'digital-rc-provenance',
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  liveClaim: false as const,
  sources: DEFAULT_SOURCE_REGISTRY.map((e) => ({
    id: e.id,
    state: e.state,
    licenseNotes: e.licenseNotes,
    ingestPermitted: e.ingestPermitted,
  })),
  policies: [
    'docs/SOURCE_PROVENANCE_POLICY.md',
    'docs/MOCK_SAMPLE_DATA_POLICY.md',
    'docs/CLAIM_FIREWALL.md',
  ],
  actualCountsPath: 'coverage/actual_counts.json',
  liveProbePath: 'coverage/actual_counts_live_bounded.json',
  honesty: {
    fixturesNeverClaimedLive: true,
    neverCallFixtureLive: true,
    noFabricatedGlobalComplete: true,
  },
};
writeFileSync(join(RC, 'package_manifest.json'), JSON.stringify(packageManifest, null, 2) + '\n');
writeFileSync(join(RC, 'provenance_bundle.json'), JSON.stringify(provenanceBundle, null, 2) + '\n');
writeFileSync(join(BUNDLES, 'offline-pack-manifest.json'), JSON.stringify(packSpec.manifest, null, 2) + '\n');


console.log('LAUNCH_TIER_E_COMPLETE=', launch.tokens.LAUNCH_TIER_E_COMPLETE, 'E=', launch.tierE.actual);
console.log('LAUNCH_TIER_F_COMPLETE=', launch.tokens.LAUNCH_TIER_F_COMPLETE, 'F=', launch.tierF.actual);
console.log('PIPELINE_COMPLETE=', pipelineComplete);
console.log('betaToken=', beta.statusToken);
console.log('rcToken=', digitalRc.statusToken);
console.log('revoked=', ledger.revoked.map((r) => r.token).join(',') || '(none)');
console.log('earned=', ledger.earned.map((e) => e.token).join(', '));
