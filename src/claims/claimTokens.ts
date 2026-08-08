/**
 * Archive claim tokens — earned only with evidence.
 * Forbidden without authoritative coverage: GLOBAL_DATA_COMPLETE, ALL_SPECIES_INGESTED.
 */

export const FORBIDDEN_CLAIM_TOKENS = [
  'GLOBAL_DATA_COMPLETE',
  'ALL_SPECIES_INGESTED',
] as const;

export type ForbiddenClaimToken = (typeof FORBIDDEN_CLAIM_TOKENS)[number];

export type EarnedClaimToken =
  | 'PIPELINE_COMPLETE'
  | `SNAPSHOT_VERSION_${string}_LOADED`
  | 'LAUNCH_TIER_E_COMPLETE'
  | 'LAUNCH_TIER_F_COMPLETE'
  | 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL'
  | 'ARCHIVE_DIGITAL_RC_READY'
  | 'ARCHIVE_BETA_CONTENT_IN_PROGRESS'
  | 'ARCHIVE_BETA_CONTENT_NOT_READY'
  | 'ARCHIVE_DIGITAL_RC_IN_PROGRESS'
  | 'ARCHIVE_DIGITAL_RC_NOT_READY'
  | 'ARCHIVE_ALPHA_EXIT_DIGITAL_PASS';

export interface ClaimEvidence {
  token: string;
  earned: boolean;
  reason: string;
  evidencePaths: string[];
}

export interface ClaimLedger {
  generatedAt: string;
  snapshotId: string;
  earned: ClaimEvidence[];
  revoked: ClaimEvidence[];
  forbiddenRejected: Array<{ token: string; reason: string }>;
  notes: string[];
}

export function snapshotVersionLoadedToken(version: string): `SNAPSHOT_VERSION_${string}_LOADED` {
  const safe = version.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  return `SNAPSHOT_VERSION_${safe}_LOADED`;
}

export function isForbiddenClaimToken(token: string): boolean {
  const t = token.trim().toUpperCase();
  return FORBIDDEN_CLAIM_TOKENS.some((f) => t === f || t.includes(f));
}

export function assertNoForbiddenClaims(tokens: string[]): void {
  for (const t of tokens) {
    if (isForbiddenClaimToken(t)) {
      throw new Error(`CLAIM_FIREWALL: forbidden token asserted: ${t}`);
    }
  }
}
