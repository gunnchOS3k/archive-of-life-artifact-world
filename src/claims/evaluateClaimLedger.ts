/**
 * Build honest claim ledger for Archive Cont V.
 * Revokes premature Beta/RC when scientific coverage was fixture-only / one-record probe.
 */

import {
  assertNoForbiddenClaims,
  isForbiddenClaimToken,
  snapshotVersionLoadedToken,
  type ClaimEvidence,
  type ClaimLedger,
} from './claimTokens';
import type { LaunchTierAuditReport } from './launchTierAudit';

export interface ClaimLedgerInput {
  snapshotId: string;
  snapshotVersion: string;
  launch: LaunchTierAuditReport;
  /** Fixture or authored snapshot loaded into Tier R index */
  fixtureSnapshotLoaded: boolean;
  /** Production multi-source live probe earned PIPELINE_COMPLETE */
  pipelineComplete: boolean;
  pipelineReason: string;
  /** True only when an official bulk dump was hashed+registered locally */
  officialBulkSnapshotLoaded: boolean;
  officialBulkVersion?: string;
  /** Actual live probe unique taxa / by-source */
  liveRecordsBySource: Record<string, number>;
  fixtureUniqueTaxa: number;
  /** Prior Beta/RC tokens on disk (to revoke if unearned) */
  priorBetaToken?: string;
  priorRcToken?: string;
  /** World traversal QA passed (not Agar.io) */
  worldTraversalPass: boolean;
  worldTraversalDetail: string;
  /** Cont VI: game runtime integrated to durable science DB across launch regions */
  runtimeDbIntegration?: boolean;
}

function earned(
  token: string,
  ok: boolean,
  reason: string,
  evidencePaths: string[],
): ClaimEvidence {
  return { token, earned: ok, reason, evidencePaths };
}

export function evaluateClaimLedger(input: ClaimLedgerInput): ClaimLedger {
  const notes: string[] = [
    'Beta/RC must not imply GLOBAL_DATA_COMPLETE or ALL_SPECIES_INGESTED.',
    'Fixture-scale Tier R (e.g. unique_taxa≈987) is not global scientific coverage.',
    'Bounded live probes are evidence of pipeline capability only.',
  ];

  const liveTotal = Object.values(input.liveRecordsBySource).reduce((a, b) => a + b, 0);
  const liveSources = Object.values(input.liveRecordsBySource).filter((n) => n > 0).length;

  const snapshotToken = snapshotVersionLoadedToken(
    input.officialBulkSnapshotLoaded
      ? input.officialBulkVersion ?? input.snapshotVersion
      : `FIXTURE_${input.snapshotVersion}`,
  );

  const launchE = earned(
    'LAUNCH_TIER_E_COMPLETE',
    input.launch.tokens.LAUNCH_TIER_E_COMPLETE,
    input.launch.tokens.LAUNCH_TIER_E_COMPLETE
      ? `Tier E=${input.launch.tierE.actual} (floor ${input.launch.tierE.required})`
      : input.launch.gaps.filter((g) => g.includes('Tier E')).join('; ') || 'Tier E incomplete',
    ['public/data/claims/launch_tier_audit.json', 'public/data/bundles/encounter-taxa.json'],
  );

  const launchF = earned(
    'LAUNCH_TIER_F_COMPLETE',
    input.launch.tokens.LAUNCH_TIER_F_COMPLETE,
    input.launch.tokens.LAUNCH_TIER_F_COMPLETE
      ? `Tier F=${input.launch.tierF.actual} gameplay=${input.launch.tierF.withGameplay}`
      : input.launch.gaps.filter((g) => /Flagship|Tier F/.test(g)).join('; ') || 'Tier F incomplete',
    ['public/data/claims/launch_tier_audit.json', 'public/data/bundles/hero-species.json'],
  );

  const pipeline = earned(
    'PIPELINE_COMPLETE',
    input.pipelineComplete,
    input.pipelineReason,
    [
      'public/data/status/production_probe_report.json',
      'public/data/coverage/actual_counts_live_bounded.json',
    ],
  );

  const snapshotLoaded = earned(
    snapshotToken,
    input.fixtureSnapshotLoaded || input.officialBulkSnapshotLoaded,
    input.officialBulkSnapshotLoaded
      ? `Official bulk snapshot version ${input.officialBulkVersion ?? input.snapshotVersion} hashed/registered`
      : input.fixtureSnapshotLoaded
        ? `Fixture/authored snapshot ${input.snapshotVersion} loaded (unique_taxa=${input.fixtureUniqueTaxa}) — not official global dump`
        : 'No snapshot loaded',
    [
      'public/data/coverage/actual_counts.json',
      'public/data/claims/bulk_snapshot_manifest.json',
    ],
  );

  // Beta: launch E/F + systems path only — MUST NOT require/imply global ingest.
  // Cont V: revoke prior COMPLETE if it was granted on fixture Tier R alone without launch tokens.
  const betaSystemsOk =
    launchE.earned &&
    launchF.earned &&
    input.worldTraversalPass &&
    input.launch.regions.met;

  const betaComplete = betaSystemsOk;
  const betaToken = betaComplete
    ? 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL'
    : launchE.earned || launchF.earned
      ? 'ARCHIVE_BETA_CONTENT_IN_PROGRESS'
      : 'ARCHIVE_BETA_CONTENT_NOT_READY';

  const betaEvidence = earned(
    betaToken,
    betaComplete,
    betaComplete
      ? 'Launch Tier E/F complete + region floors + world traversal QA (does not claim global scientific ingest)'
      : `Beta incomplete: ${[...input.launch.gaps, input.worldTraversalDetail].filter(Boolean).join('; ')}`,
    [
      'public/data/claims/claim_ledger.json',
      'public/data/claims/launch_tier_audit.json',
      'public/data/qa/world_traversal/report.json',
    ],
  );

  // Cont VI: Digital RC requires Beta + PIPELINE + runtime science-DB integration.
  const runtimeOk = input.runtimeDbIntegration === true;
  const rcComplete = betaComplete && pipeline.earned && runtimeOk;
  const rcToken = rcComplete
    ? 'ARCHIVE_DIGITAL_RC_READY'
    : betaComplete || pipeline.earned || runtimeOk
      ? 'ARCHIVE_DIGITAL_RC_IN_PROGRESS'
      : 'ARCHIVE_DIGITAL_RC_NOT_READY';

  const rcEvidence = earned(
    rcToken,
    rcComplete,
    rcComplete
      ? 'Beta digital + PIPELINE_COMPLETE + runtime science-DB integration'
      : `RC blocked until Beta+PIPELINE_COMPLETE+runtime DB (liveTotal=${liveTotal} liveSources=${liveSources} runtime=${runtimeOk})`,
    [
      'public/data/status/digital_rc_report.json',
      'public/data/status/production_probe_report.json',
      'public/data/qa/tier_ef_runtime/report.json',
    ],
  );

  const earnedList = [launchE, launchF, pipeline, snapshotLoaded, betaEvidence, rcEvidence].filter(
    (e) => e.earned,
  );

  const revoked: ClaimEvidence[] = [];
  const priorBeta = input.priorBetaToken;
  if (
    priorBeta === 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL' &&
    !betaComplete
  ) {
    revoked.push(
      earned(
        priorBeta,
        false,
        'Revoked Cont V: prior Beta COMPLETE was not backed by frozen launch Tier E/F + world QA without conflating fixture Tier R with global ingest',
        ['public/data/claims/claim_ledger.json'],
      ),
    );
  }
  if (priorBeta === 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL' && betaComplete) {
    notes.push(
      'Prior Beta COMPLETE retained only after Cont V re-audit of launch Tier E/F + world traversal (still not global ingest).',
    );
  }
  const priorRc = input.priorRcToken;
  if (priorRc === 'ARCHIVE_DIGITAL_RC_READY' && !rcComplete) {
    revoked.push(
      earned(
        priorRc,
        false,
        'Revoked Cont V: Digital RC requires PIPELINE_COMPLETE multi-source live production path beyond one-record probe',
        ['public/data/claims/claim_ledger.json'],
      ),
    );
  }

  const forbiddenRejected = [
    {
      token: 'GLOBAL_DATA_COMPLETE',
      reason: `Rejected — liveTotal=${liveTotal} fixtureUnique=${input.fixtureUniqueTaxa}; no authoritative global coverage evidence`,
    },
    {
      token: 'ALL_SPECIES_INGESTED',
      reason: 'Rejected — product never asserts all-species ingest without authoritative census',
    },
  ];

  for (const f of forbiddenRejected) {
    if (!isForbiddenClaimToken(f.token)) {
      // keep type guard happy
    }
  }
  assertNoForbiddenClaims(earnedList.map((e) => e.token));

  return {
    generatedAt: new Date().toISOString(),
    snapshotId: input.snapshotId,
    earned: earnedList,
    revoked,
    forbiddenRejected,
    notes,
  };
}
