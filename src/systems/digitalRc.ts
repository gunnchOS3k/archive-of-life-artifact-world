/**
 * Digital Release Candidate readiness evaluator.
 * Token: ARCHIVE_DIGITAL_RC_READY when package + provenance + offline packs + Beta digital pass.
 * Does NOT claim physical RC or global scientific completeness.
 */

export type DigitalRcCheckId =
  | 'beta_digital_pass'
  | 'package_manifest'
  | 'provenance_bundle'
  | 'offline_pack'
  | 'actual_counts_artifact'
  | 'source_states_declared'
  | 'ingest_checkpoint_resume'
  | 'tests_green_signal';

export interface DigitalRcCheck {
  id: DigitalRcCheckId;
  ok: boolean;
  detail: string;
}

export interface DigitalRcReport {
  snapshotId: string;
  generatedAt: string;
  statusToken: 'ARCHIVE_DIGITAL_RC_READY' | 'ARCHIVE_DIGITAL_RC_IN_PROGRESS' | 'ARCHIVE_DIGITAL_RC_NOT_READY';
  claimLevel: 'digital_rc' | 'none';
  doesNotClaim: string[];
  checks: DigitalRcCheck[];
  allOk: boolean;
  package: {
    packId: string;
    version: string;
    artifactPaths: string[];
  };
  gaps: string[];
}

export interface DigitalRcInput {
  snapshotId: string;
  betaDigitalPass: boolean;
  packageManifestPresent: boolean;
  provenanceBundlePresent: boolean;
  offlinePackReady: boolean;
  actualCountsPresent: boolean;
  sourceStatesDeclared: boolean;
  ingestCheckpointResume: boolean;
  testsGreenSignal: boolean;
  packId: string;
  version: string;
  artifactPaths: string[];
}

const CHECK_ORDER: DigitalRcCheckId[] = [
  'beta_digital_pass',
  'package_manifest',
  'provenance_bundle',
  'offline_pack',
  'actual_counts_artifact',
  'source_states_declared',
  'ingest_checkpoint_resume',
  'tests_green_signal',
];

export function evaluateDigitalRc(input: DigitalRcInput): DigitalRcReport {
  const map: Record<DigitalRcCheckId, { ok: boolean; detail: string }> = {
    beta_digital_pass: {
      ok: input.betaDigitalPass,
      detail: input.betaDigitalPass
        ? 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL'
        : 'Beta digital not complete',
    },
    package_manifest: {
      ok: input.packageManifestPresent,
      detail: input.packageManifestPresent ? 'RC package manifest present' : 'missing package manifest',
    },
    provenance_bundle: {
      ok: input.provenanceBundlePresent,
      detail: input.provenanceBundlePresent ? 'provenance bundle present' : 'missing provenance bundle',
    },
    offline_pack: {
      ok: input.offlinePackReady,
      detail: input.offlinePackReady ? 'offline pack ready' : 'offline pack not ready',
    },
    actual_counts_artifact: {
      ok: input.actualCountsPresent,
      detail: input.actualCountsPresent ? 'actual counts artifact present' : 'missing actual counts',
    },
    source_states_declared: {
      ok: input.sourceStatesDeclared,
      detail: input.sourceStatesDeclared
        ? 'source states LIVE_PUBLIC|AUTHORIZED_BULK|SNAPSHOT|FIXTURE_TEST_ONLY|UNAVAILABLE declared'
        : 'source states missing',
    },
    ingest_checkpoint_resume: {
      ok: input.ingestCheckpointResume,
      detail: input.ingestCheckpointResume
        ? 'checkpoint/resume path present'
        : 'checkpoint/resume missing',
    },
    tests_green_signal: {
      ok: input.testsGreenSignal,
      detail: input.testsGreenSignal ? 'tests green signal recorded' : 'tests signal missing',
    },
  };

  const checks = CHECK_ORDER.map((id) => ({ id, ...map[id] }));
  const allOk = checks.every((c) => c.ok);
  const gaps = checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`);

  let statusToken: DigitalRcReport['statusToken'] = 'ARCHIVE_DIGITAL_RC_NOT_READY';
  let claimLevel: DigitalRcReport['claimLevel'] = 'none';
  if (allOk) {
    statusToken = 'ARCHIVE_DIGITAL_RC_READY';
    claimLevel = 'digital_rc';
  } else if (checks.filter((c) => c.ok).length >= 4) {
    statusToken = 'ARCHIVE_DIGITAL_RC_IN_PROGRESS';
  }

  return {
    snapshotId: input.snapshotId,
    generatedAt: new Date().toISOString(),
    statusToken,
    claimLevel,
    doesNotClaim: [
      'physical RC / device certification',
      'global live archive completeness',
      'store submission approval',
      'IUCN full authorized coverage',
    ],
    checks,
    allOk,
    package: {
      packId: input.packId,
      version: input.version,
      artifactPaths: input.artifactPaths,
    },
    gaps,
  };
}
