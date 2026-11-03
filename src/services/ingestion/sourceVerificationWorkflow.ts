/**
 * Source verification / provenance tooling for permitted open-data imports.
 *
 * Field matches and live fetches never auto-promote sample_fallback → source_verified.
 * IUCN token absence does not block COL/GBIF/PBDB/Neotoma/NASA/ICS science paths.
 * Promotion requires an explicit human approval record (rights + redistribution).
 */

import type { VerificationStatus } from '@/schema/provenance';
import {
  assertNeverPromoteMock,
  assertNeverPromoteSampleFallback,
  type PublicAdapterSource,
} from './publicSourceAdapters';

export type ImportPermission =
  | 'permitted_public_bounded'
  | 'permitted_snapshot_path'
  | 'gated_token_plus_rights'
  | 'blocked_until_authorized'
  | 'candidate_investigation_only';

export type ImportWorkflowStep = {
  id: string;
  command?: string;
  description: string;
  requiredEnv?: string[];
};

export type PermittedImportWorkflow = {
  source: PublicAdapterSource | 'worms' | 'obis' | 'opentree' | 'wikidata' | 'inaturalist' | 'eol' | 'smithsonian';
  permission: ImportPermission;
  scienceContinuesWithoutIucn: boolean;
  licenseHonesty: string;
  steps: ImportWorkflowStep[];
  promotionRule: string;
};

export type PromotionDecisionInput = {
  dataMode: string;
  verificationStatus: VerificationStatus | string;
  verifiedRecordCount: number;
  isMock: boolean;
  /** Explicit human rights + redistribution approval — never invented. */
  humanApprovalRecordId?: string | null;
  rightsReviewComplete?: boolean;
};

export type PromotionDecision = {
  allowedStatus: VerificationStatus;
  promotedToSourceVerified: false;
  reason: string;
};

export type FieldProvenanceCheck = {
  field: string;
  rawValue: string | null;
  normalizedValue: string | null;
  match: boolean;
  notes: string;
};

export type RecordProvenanceVerification = {
  sourceRecordId: string;
  scientificName: string;
  dataMode: 'sample_fallback';
  verificationStatus: 'needs_source_verification';
  sourceVerifiedRelease: false;
  fieldChecks: FieldProvenanceCheck[];
  matchedFields: number;
  comparedFields: number;
  rawSnapshotSha256?: string;
};

const PROMOTION_RULE =
  'Never promote sample_fallback → source_verified without humanApprovalRecordId + rightsReviewComplete; fetch/row counts are not verification.';

/** Permitted open-data import workflows (no invented credentials or rights). */
export const PERMITTED_OPEN_DATA_IMPORT_WORKFLOWS: PermittedImportWorkflow[] = [
  {
    source: 'col',
    permission: 'permitted_public_bounded',
    scienceContinuesWithoutIucn: true,
    licenseHonesty: 'COL terms of use — snapshot path preferred for bulk; live search stays sample_fallback',
    steps: [
      {
        id: 'col-bounded',
        command: 'npm run source:acquire:public-bounded',
        description: 'Bounded ChecklistBank nameusage search for flagship names',
      },
      {
        id: 'col-snapshot',
        command: 'npm run source:import:col',
        description: 'Import approved local COL archive when COL_SNAPSHOT_PATH is set',
        requiredEnv: ['COL_SNAPSHOT_PATH'],
      },
      { id: 'col-audit', command: 'npm run source:audit', description: 'Register import status; verified_record_count stays 0 until review' },
    ],
    promotionRule: PROMOTION_RULE,
  },
  {
    source: 'gbif',
    permission: 'permitted_public_bounded',
    scienceContinuesWithoutIucn: true,
    licenseHonesty: 'Per-dataset licenses vary — match API is public; bulk needs GBIF_DOWNLOAD_PATH',
    steps: [
      {
        id: 'gbif-bounded',
        command: 'npm run source:acquire:public-bounded',
        description: 'Bounded GBIF species match for flagship names',
      },
      {
        id: 'gbif-download',
        command: 'npm run source:import:gbif',
        description: 'Import official GBIF download when path/DOI authorized',
        requiredEnv: ['GBIF_DOWNLOAD_PATH'],
      },
      { id: 'gbif-audit', command: 'npm run source:audit', description: 'Register import; never auto source_verified' },
    ],
    promotionRule: PROMOTION_RULE,
  },
  {
    source: 'pbdb',
    permission: 'permitted_public_bounded',
    scienceContinuesWithoutIucn: true,
    licenseHonesty: 'CC BY 4.0 Paleobiology Database — bounded taxa list or PBDB_SNAPSHOT_PATH',
    steps: [
      {
        id: 'pbdb-bounded',
        command: 'npm run source:acquire:public-bounded',
        description: 'Bounded PBDB taxa list for paleo flagships',
      },
      {
        id: 'pbdb-snapshot',
        command: 'npm run source:import:pbdb',
        description: 'Import local PBDB snapshot when path set',
        requiredEnv: ['PBDB_SNAPSHOT_PATH'],
      },
    ],
    promotionRule: PROMOTION_RULE,
  },
  {
    source: 'neotoma',
    permission: 'permitted_public_bounded',
    scienceContinuesWithoutIucn: true,
    licenseHonesty: 'Neotoma terms — site/sample only; not paleoecology completeness',
    steps: [
      {
        id: 'neotoma-import',
        command: 'npm run source:import:neotoma',
        description: 'Neotoma snapshot or API sample',
        requiredEnv: ['NEOTOMA_SNAPSHOT_PATH'],
      },
    ],
    promotionRule: PROMOTION_RULE,
  },
  {
    source: 'nasa',
    permission: 'permitted_public_bounded',
    scienceContinuesWithoutIucn: true,
    licenseHonesty:
      'NASA open metadata — historical July 5 manifest SHA preserved; bounded acquires write versioned snapshots only',
    steps: [
      {
        id: 'nasa-import',
        command: 'npm run source:import:nasa',
        description: 'Fetch/cache CMR/EONET/POWER metadata without overwriting historical bytes',
      },
    ],
    promotionRule: PROMOTION_RULE,
  },
  {
    source: 'ics',
    permission: 'permitted_snapshot_path',
    scienceContinuesWithoutIucn: true,
    licenseHonesty: 'ICS chart reuse review required — label inventory does not unlock 0/17 maps',
    steps: [
      {
        id: 'ics-labels',
        description: 'Curated ICS label inventory for adapter contracts only',
      },
      {
        id: 'ics-maps',
        command: 'npm run audit:maps',
        description: 'Keep scientificallyUnlocked=0/17 until authorized paleogeographic assets exist',
      },
    ],
    promotionRule: PROMOTION_RULE,
  },
  {
    source: 'iucn',
    permission: 'gated_token_plus_rights',
    scienceContinuesWithoutIucn: false,
    licenseHonesty: 'IUCN-TOS — not assumed CC-BY; token alone ≠ assessed=true or source_verified',
    steps: [
      {
        id: 'iucn-owner',
        description: 'Owner obtains API access + human rights/redistribution review (docs/OWNER_IUCN_SETUP.md)',
        requiredEnv: ['IUCN_API_TOKEN'],
      },
      {
        id: 'iucn-import',
        command: 'npm run source:import:iucn',
        description: 'Import only after token + rights; still needs_source_verification until review stamp',
      },
    ],
    promotionRule: PROMOTION_RULE,
  },
];

/**
 * Decide release verification status. Always returns promotedToSourceVerified=false
 * unless a real human approval record is present — and even then this helper refuses
 * auto-promotion (owner must flip via a separate reviewed path).
 */
export function decidePromotion(input: PromotionDecisionInput): PromotionDecision {
  assertNeverPromoteMock(
    input.verificationStatus as VerificationStatus,
    input.isMock,
  );
  assertNeverPromoteSampleFallback(
    input.dataMode,
    input.verificationStatus,
    input.verifiedRecordCount,
  );

  if (input.isMock) {
    return {
      allowedStatus: 'mock_sample',
      promotedToSourceVerified: false,
      reason: 'Mock/sample fixtures stay mock_sample — never source_verified',
    };
  }

  if (
    input.dataMode === 'sample_fallback' ||
    input.verificationStatus === 'needs_source_verification' ||
    input.verificationStatus === 'blocked_external'
  ) {
    return {
      allowedStatus:
        input.verificationStatus === 'blocked_external'
          ? 'blocked_external'
          : 'needs_source_verification',
      promotedToSourceVerified: false,
      reason: PROMOTION_RULE,
    };
  }

  // Even with a human approval id, this tooling never silently flips the bit —
  // it only confirms the gate is ready for a separate reviewed promotion path.
  if (input.humanApprovalRecordId && input.rightsReviewComplete) {
    return {
      allowedStatus: 'needs_source_verification',
      promotedToSourceVerified: false,
      reason:
        'Human approval record noted; separate rights-reviewed promotion path still required (tooling refuses silent flip)',
    };
  }

  return {
    allowedStatus: 'needs_source_verification',
    promotedToSourceVerified: false,
    reason: PROMOTION_RULE,
  };
}

/** Compare raw fixture field strings to normalized game-facing values. */
export function verifyNormalizedFields(input: {
  sourceRecordId: string;
  scientificName: string;
  pairs: Array<{ field: string; raw: string | null | undefined; normalized: string | null | undefined; notes?: string }>;
  rawSnapshotSha256?: string;
}): RecordProvenanceVerification {
  const fieldChecks: FieldProvenanceCheck[] = input.pairs.map((p) => {
    const rawValue = p.raw == null || String(p.raw).trim() === '' ? null : String(p.raw);
    const normalizedValue =
      p.normalized == null || String(p.normalized).trim() === '' ? null : String(p.normalized);
    const match =
      rawValue != null &&
      normalizedValue != null &&
      rawValue.trim().toLowerCase() === normalizedValue.trim().toLowerCase();
    return {
      field: p.field,
      rawValue,
      normalizedValue,
      match,
      notes: p.notes ?? (match ? 'normalized matches raw' : 'normalized≠raw or sparse gap'),
    };
  });
  const compared = fieldChecks.filter((c) => c.rawValue != null && c.normalizedValue != null);
  const matched = compared.filter((c) => c.match);

  return {
    sourceRecordId: input.sourceRecordId,
    scientificName: input.scientificName,
    dataMode: 'sample_fallback',
    verificationStatus: 'needs_source_verification',
    sourceVerifiedRelease: false,
    fieldChecks,
    matchedFields: matched.length,
    comparedFields: compared.length,
    rawSnapshotSha256: input.rawSnapshotSha256,
  };
}

/** IUCN blocked must not gate other permitted science workflows. */
export function sciencePathsIndependentOfIucn(): {
  iucnBlocksAllScience: false;
  continuingSources: string[];
  note: string;
} {
  const continuing = PERMITTED_OPEN_DATA_IMPORT_WORKFLOWS.filter(
    (w) => w.scienceContinuesWithoutIucn,
  ).map((w) => w.source);
  return {
    iucnBlocksAllScience: false,
    continuingSources: continuing,
    note:
      'Missing IUCN_API_TOKEN blocks only IUCN assessed statuses; COL/GBIF/PBDB/Neotoma/NASA/ICS science continues as sample_fallback',
  };
}

export function listPermittedWorkflows(): PermittedImportWorkflow[] {
  return PERMITTED_OPEN_DATA_IMPORT_WORKFLOWS;
}

export function getImportWorkflow(
  source: PermittedImportWorkflow['source'],
): PermittedImportWorkflow | undefined {
  return PERMITTED_OPEN_DATA_IMPORT_WORKFLOWS.find((w) => w.source === source);
}
