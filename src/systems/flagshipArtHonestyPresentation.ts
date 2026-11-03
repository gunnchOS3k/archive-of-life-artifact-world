/**
 * Flagship identity / original-art honesty: emoji and procedural marks ≠ finished art.
 */

import {
  FLAGSHIP_OBSERVATION_PROFILES,
  assertFlagshipArtHonesty,
  flagshipArtStatusLabel,
  listFlagshipTaxonIds,
  type FlagshipObservationProfile,
} from '@/services/flagshipTaxonProfiles';

export type FlagshipArtHonestyRow = {
  taxonId: string;
  scientificName: string;
  representationMark: string;
  artStatusLabel: string;
  finalArtStatus: FlagshipObservationProfile['finalArtStatus'];
  finishedModelClaimed: false;
  emojiIsFinishedArt: false;
  originalArtApproved: false;
};

export type FlagshipArtHonestyReport = {
  schema: 'aol.flagship_art_honesty.v1';
  generatedAt: string;
  flagshipCount: number;
  finishedModelsClaimed: false;
  emojiEqualsFinished: false;
  anyHumanApprovedFinal: false;
  rows: FlagshipArtHonestyRow[];
  rule: string;
};

const RULE =
  'Emoji / procedural identity marks are candidates only — never finished models or human-approved original art until earned.';

export function buildFlagshipArtHonestyReport(
  generatedAt = new Date().toISOString(),
): FlagshipArtHonestyReport {
  const rows: FlagshipArtHonestyRow[] = listFlagshipTaxonIds().map((id) => {
    const profile = FLAGSHIP_OBSERVATION_PROFILES[id];
    assertFlagshipArtHonesty(profile);
    return {
      taxonId: profile.taxonId,
      scientificName: profile.scientificName,
      representationMark: profile.representationMark,
      artStatusLabel: flagshipArtStatusLabel(profile),
      finalArtStatus: profile.finalArtStatus,
      finishedModelClaimed: false,
      emojiIsFinishedArt: false,
      originalArtApproved: false,
    };
  });

  return {
    schema: 'aol.flagship_art_honesty.v1',
    generatedAt,
    flagshipCount: rows.length,
    finishedModelsClaimed: false,
    emojiEqualsFinished: false,
    anyHumanApprovedFinal: false,
    rows,
    rule: RULE,
  };
}

export function assertFlagshipArtHonestyReport(report: FlagshipArtHonestyReport): void {
  if (report.finishedModelsClaimed || report.emojiEqualsFinished || report.anyHumanApprovedFinal) {
    throw new Error('Honesty violation: emoji/procedural marks must not claim finished/approved art');
  }
  if (report.flagshipCount !== 24 || report.rows.length !== 24) {
    throw new Error(`Flagship art honesty expects 24 profiles, got ${report.flagshipCount}`);
  }
  for (const row of report.rows) {
    if (row.finishedModelClaimed || row.emojiIsFinishedArt || row.originalArtApproved) {
      throw new Error(`Honesty violation: ${row.taxonId} claimed finished art`);
    }
    if (row.finalArtStatus === 'final_asset_human_approved') {
      throw new Error(`Honesty violation: ${row.taxonId} auto human-approved`);
    }
  }
}

export function renderFlagshipArtHonestyHtml(
  report: FlagshipArtHonestyReport = buildFlagshipArtHonestyReport(),
): string {
  assertFlagshipArtHonestyReport(report);
  const sample = report.rows[0];
  return [
    '<aside class="flagship-art-honesty" data-emoji-finished="false" data-finished-models="false" role="note">',
    '<p><strong>Original art honesty:</strong> emoji and procedural identity marks are not finished organism models.</p>',
    `<p>${escapeHtml(sample?.artStatusLabel ?? 'Art status: not finished')} · flagships ${report.flagshipCount}/24 · finishedModelsClaimed=false</p>`,
    `<p><em>${escapeHtml(report.rule)}</em></p>`,
    '</aside>',
  ].join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
