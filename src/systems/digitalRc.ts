/**
 * Digital Release Candidate readiness — Cont VI.
 * ARCHIVE_DIGITAL_RC_READY only when Beta + PIPELINE + runtime DB integration + RC suite pass.
 * Does NOT claim physical RC or global scientific completeness.
 */

export type DigitalRcCheckId =
  | 'beta_digital_pass'
  | 'pipeline_complete'
  | 'runtime_db_integration'
  | 'db_migration'
  | 'snapshot_update'
  | 'snapshot_corrupt_detect'
  | 'offline'
  | 'source_update'
  | 'save_migrate'
  | 'package_manifest'
  | 'update_rollback'
  | 'provenance_display'
  | 'a11y'
  | 'localization_ready'
  | 'unique_icon_title'
  | 'actual_counts_artifact'
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
  pipelineComplete: boolean;
  runtimeDbIntegration: boolean;
  dbMigrationOk: boolean;
  snapshotUpdateOk: boolean;
  snapshotCorruptDetectOk: boolean;
  offlineOk: boolean;
  sourceUpdateOk: boolean;
  saveMigrateOk: boolean;
  packageManifestPresent: boolean;
  updateRollbackOk: boolean;
  provenanceDisplayOk: boolean;
  a11yOk: boolean;
  localizationReady: boolean;
  uniqueIconTitleOk: boolean;
  actualCountsPresent: boolean;
  ingestCheckpointResume: boolean;
  testsGreenSignal: boolean;
  packId: string;
  version: string;
  artifactPaths: string[];
}

const CHECK_ORDER: DigitalRcCheckId[] = [
  'beta_digital_pass',
  'pipeline_complete',
  'runtime_db_integration',
  'db_migration',
  'snapshot_update',
  'snapshot_corrupt_detect',
  'offline',
  'source_update',
  'save_migrate',
  'package_manifest',
  'update_rollback',
  'provenance_display',
  'a11y',
  'localization_ready',
  'unique_icon_title',
  'actual_counts_artifact',
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
    pipeline_complete: {
      ok: input.pipelineComplete,
      detail: input.pipelineComplete
        ? 'PIPELINE_COMPLETE production ops'
        : 'PIPELINE_COMPLETE missing',
    },
    runtime_db_integration: {
      ok: input.runtimeDbIntegration,
      detail: input.runtimeDbIntegration
        ? 'Game runtime queries durable science DB across launch regions'
        : 'Runtime DB integration incomplete — RC blocked',
    },
    db_migration: {
      ok: input.dbMigrationOk,
      detail: input.dbMigrationOk ? 'schema migration applied' : 'DB migration failed',
    },
    snapshot_update: {
      ok: input.snapshotUpdateOk,
      detail: input.snapshotUpdateOk ? 'snapshot update path ok' : 'snapshot update failed',
    },
    snapshot_corrupt_detect: {
      ok: input.snapshotCorruptDetectOk,
      detail: input.snapshotCorruptDetectOk
        ? 'corrupt snapshot detected via hash mismatch'
        : 'corrupt detection missing',
    },
    offline: {
      ok: input.offlineOk,
      detail: input.offlineOk ? 'offline snapshot/pack ready' : 'offline not ready',
    },
    source_update: {
      ok: input.sourceUpdateOk,
      detail: input.sourceUpdateOk ? 'source update path exercised' : 'source update missing',
    },
    save_migrate: {
      ok: input.saveMigrateOk,
      detail: input.saveMigrateOk ? 'save migrate path ok' : 'save migrate failed',
    },
    package_manifest: {
      ok: input.packageManifestPresent,
      detail: input.packageManifestPresent ? 'RC package manifest present' : 'missing package manifest',
    },
    update_rollback: {
      ok: input.updateRollbackOk,
      detail: input.updateRollbackOk ? 'update/rollback path ok' : 'rollback failed',
    },
    provenance_display: {
      ok: input.provenanceDisplayOk,
      detail: input.provenanceDisplayOk ? 'provenance display path ok' : 'provenance display missing',
    },
    a11y: {
      ok: input.a11yOk,
      detail: input.a11yOk ? 'a11y settings apply path ok' : 'a11y incomplete',
    },
    localization_ready: {
      ok: input.localizationReady,
      detail: input.localizationReady
        ? 'localization-ready string catalog present'
        : 'localization catalog missing',
    },
    unique_icon_title: {
      ok: input.uniqueIconTitleOk,
      detail: input.uniqueIconTitleOk
        ? 'unique product icon + title declared'
        : 'unique icon/title missing',
    },
    actual_counts_artifact: {
      ok: input.actualCountsPresent,
      detail: input.actualCountsPresent ? 'actual counts artifact present' : 'missing actual counts',
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

  // Cont VI: READY only if runtime integration + full suite pass (includes pipeline + beta).
  let statusToken: DigitalRcReport['statusToken'] = 'ARCHIVE_DIGITAL_RC_NOT_READY';
  let claimLevel: DigitalRcReport['claimLevel'] = 'none';
  if (allOk) {
    statusToken = 'ARCHIVE_DIGITAL_RC_READY';
    claimLevel = 'digital_rc';
  } else if (checks.filter((c) => c.ok).length >= 8) {
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
      'GLOBAL_DATA_COMPLETE',
      'ALL_SPECIES_INGESTED',
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
