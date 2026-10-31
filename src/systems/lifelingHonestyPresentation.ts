/**
 * Lifeling companion honesty while IUCN stays blocked_external.
 * Cosmetic / affinity traits only — never conservation-assessment badges.
 */

export type LifelingHonestyReport = {
  schema: 'aol.lifeling_honesty.v1';
  generatedAt: string;
  iucnGate: 'blocked_external';
  conservationBadgesShown: false;
  assessedStatusesClaimed: false;
  cosmeticTraitsOnly: true;
  affinityModulesAllowed: true;
  mapsUnlockedClaim: false;
  sourceVerifiedScienceClaim: false;
  humanRc2V1: false;
  playerCopy: string;
  rule: string;
};

const RULE =
  'Lifeling handling continues under IUCN blocked_external: cosmetic/affinity unlocks only — no Red List assessed badges, no source_verified science claims, maps stay 0/17.';

const PLAYER_COPY =
  'Your Lifeling grows from observations and expeditions. Conservation assessments stay blocked until owner IUCN credentials + rights review — no fake assessed badges.';

export function buildLifelingHonestyReport(
  generatedAt = new Date().toISOString(),
): LifelingHonestyReport {
  return {
    schema: 'aol.lifeling_honesty.v1',
    generatedAt,
    iucnGate: 'blocked_external',
    conservationBadgesShown: false,
    assessedStatusesClaimed: false,
    cosmeticTraitsOnly: true,
    affinityModulesAllowed: true,
    mapsUnlockedClaim: false,
    sourceVerifiedScienceClaim: false,
    humanRc2V1: false,
    playerCopy: PLAYER_COPY,
    rule: RULE,
  };
}

export function assertLifelingHonesty(report: LifelingHonestyReport): void {
  if (report.iucnGate !== 'blocked_external') {
    throw new Error('Lifeling honesty requires IUCN blocked_external');
  }
  if (report.conservationBadgesShown || report.assessedStatusesClaimed) {
    throw new Error('Lifeling must not show conservation / assessed badges');
  }
  if (report.mapsUnlockedClaim || report.sourceVerifiedScienceClaim) {
    throw new Error('Lifeling must not claim unlocked maps or source_verified science');
  }
  if (report.humanRc2V1) {
    throw new Error('HUMAN/RC2/V1 must remain false');
  }
  if (!report.cosmeticTraitsOnly || !report.affinityModulesAllowed) {
    throw new Error('Lifeling surrounding loop must keep cosmetic + affinity paths');
  }
}

/** Companion panel strip — mounts beside Lifeling preview / trait inventory. */
export function renderLifelingHonestyHtml(
  report: LifelingHonestyReport = buildLifelingHonestyReport(),
): string {
  assertLifelingHonesty(report);
  return [
    '<aside class="lifeling-honesty" data-iucn="blocked_external" data-conservation-badges="false" data-maps="0/17" role="note" aria-label="Lifeling honesty: cosmetic traits only while IUCN stays blocked">',
    `<p><strong>Lifeling honesty:</strong> ${escapeHtml(report.playerCopy)}</p>`,
    `<p>conservationBadgesShown=false · assessedStatusesClaimed=false · mapsUnlockedClaim=false · sourceVerifiedScienceClaim=false · HUMAN/RC2/V1=false</p>`,
    `<p>${escapeHtml(report.rule)}</p>`,
    '</aside>',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
