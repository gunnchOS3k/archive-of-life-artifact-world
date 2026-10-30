/**
 * Player-facing IUCN blocked / unavailable UX.
 * Explains the rights + credential gate, surfaces blocked_external honestly,
 * and never presents mock gameplay category labels as assessed IUCN badges.
 *
 * HARD: no IUCN_API_TOKEN invention; assessed=true and source_verified are forbidden
 * on the blocked path.
 */

import type { AdapterFetchResult } from '@/services/ingestion/publicSourceAdapters';
import { IUCN_OWNER_SETUP_STEPS } from '@/services/ingestion/publicSourceAdapters';
import type { ConservationProfile } from '@/schema/conservation';

export type IucnGateState = 'blocked_external' | 'needs_source_verification' | 'source_verified';

export type IucnPlayerInput = {
  assessed?: boolean | null;
  iucnCategory?: string | null;
  dataMode?: string | null;
  verificationStatus?: string | null;
  /** When adapter reports blocked (missing token / fetch fail). */
  adapterBlocked?: boolean;
  uncertaintyNote?: string | null;
};

export type IucnBlockedPresentation = {
  gateState: 'blocked_external';
  assessed: false;
  sourceVerified: false;
  dataMode: 'blocked_external' | 'mock_sample' | 'game_authored';
  playerTitle: string;
  playerSummary: string;
  rightsCredentialNote: string;
  /** Gameplay planning label only — never an assessed Red List badge. */
  gameplayCategoryLabel: string | null;
  showAssessedBadge: false;
  ariaLabel: string;
};

const PLAYER_TITLE = 'IUCN Red List unavailable';
const PLAYER_SUMMARY =
  'Conservation assessments from the IUCN Red List are blocked_external until an authorized owner API credential and a human rights / redistribution review are in place. This build does not invent assessments.';
const RIGHTS_NOTE =
  'IUCN terms are not assumed CC-BY. Owner setup: request API access, store IUCN_API_TOKEN only in data-pipeline/.env (never commit), confirm display rights, then import + audit. See docs/OWNER_IUCN_SETUP.md.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Resolve player-facing IUCN gate. Anything that is not an authorized
 * source_verified + assessed=true snapshot stays blocked_external.
 */
export function resolveIucnPlayerPresentation(input: IucnPlayerInput = {}): IucnBlockedPresentation {
  const mode = String(input.dataMode ?? '').toLowerCase();
  // Fail closed: this helper never emits assessed / source_verified player UX.
  // Authorized Red List snapshots require a separate rights-reviewed path.
  void input.assessed;
  void input.verificationStatus;
  void input.adapterBlocked;

  const dataMode: IucnBlockedPresentation['dataMode'] =
    mode === 'mock_sample'
      ? 'mock_sample'
      : mode === 'game_authored'
        ? 'game_authored'
        : 'blocked_external';

  const gameplay =
    input.iucnCategory && String(input.iucnCategory).trim()
      ? String(input.iucnCategory).trim()
      : null;

  return {
    gateState: 'blocked_external',
    assessed: false,
    sourceVerified: false,
    dataMode,
    playerTitle: PLAYER_TITLE,
    playerSummary: PLAYER_SUMMARY,
    rightsCredentialNote: RIGHTS_NOTE,
    gameplayCategoryLabel: gameplay,
    showAssessedBadge: false,
    ariaLabel:
      `${PLAYER_TITLE}. Status blocked_external. assessed=false. source_verified=false.` +
      (gameplay ? ` Gameplay planning label: ${gameplay} (not an IUCN assessment).` : ''),
  };
}

/**
 * Apply a blocked IUCN adapter result onto a conservation profile.
 * Guarantees assessed stays false and dataMode never becomes source_verified.
 */
export function applyBlockedIucnAdapterToConservation(
  prior: Partial<ConservationProfile> | undefined,
  adapter: Pick<AdapterFetchResult, 'blocked' | 'meta' | 'ok'>,
): ConservationProfile & { verificationStatus: 'blocked_external'; sourceVerified: false } {
  if (!adapter.blocked && adapter.meta.verificationStatus === 'source_verified') {
    // Still refuse auto-promotion: token fetch ≠ rights-reviewed assessment.
    throw new Error(
      'Honesty violation: IUCN adapter must not flip conservation to source_verified without human rights review',
    );
  }

  const category = (prior?.iucnCategory ?? 'Not Evaluated') as ConservationProfile['iucnCategory'];
  // Quarantine any prior source_verified claim — blocked path stays mock/gameplay only.
  const out: ConservationProfile & {
    verificationStatus: 'blocked_external';
    sourceVerified: false;
  } = {
    iucnCategory: category,
    assessed: false,
    sourceVersion: prior?.sourceVersion ?? 'iucn-blocked-external',
    lastUpdated: prior?.lastUpdated ?? new Date().toISOString().slice(0, 10),
    dataMode: 'mock_sample',
    uncertaintyNote:
      prior?.uncertaintyNote ??
      'IUCN blocked_external — gameplay category labels are not Red List assessments.',
    verificationStatus: 'blocked_external',
    sourceVerified: false,
  };

  // Hard invariants for the blocked path
  if (out.assessed !== false) {
    throw new Error('Honesty violation: blocked IUCN path set conservation.assessed');
  }
  if (out.dataMode === 'source_verified' || out.sourceVerified) {
    throw new Error('Honesty violation: blocked IUCN path promoted source_verified');
  }
  return out;
}

/** Compact chip for ArchiveDex cards / entry hero — never an assessed badge. */
export function renderIucnPlayerStatusHtml(presentation?: IucnBlockedPresentation): string {
  const p = presentation ?? resolveIucnPlayerPresentation();
  const label = 'IUCN blocked_external';
  const gameplay = p.gameplayCategoryLabel
    ? `<span class="iucn-gameplay-label" data-iucn-gameplay-label="1">Gameplay label: ${escapeHtml(
        p.gameplayCategoryLabel,
      )} (not assessed)</span>`
    : '';
  return `
    <span class="species-status status-iucn-blocked iucn-blocked-chip"
          data-iucn-gate="blocked_external"
          data-iucn-assessed="false"
          data-iucn-source-verified="false"
          data-iucn-show-assessed-badge="false"
          aria-label="${escapeHtml(p.ariaLabel)}">${escapeHtml(label)}</span>
    ${gameplay}
  `.trim();
}

/** Honesty badge next to art status. */
export function renderIucnHonestyBadgeHtml(presentation?: IucnBlockedPresentation): string {
  const p = presentation ?? resolveIucnPlayerPresentation();
  assertIucnBlockedHonesty(p);
  return `<span class="dex-badge dex-iucn-honesty" data-iucn-gate="blocked_external" data-iucn-assessed="false">IUCN blocked_external · assessed=false</span>`;
}

/** Full conservation-tab / sources panel explaining the gate. */
export function renderIucnBlockedPanelHtml(presentation?: IucnBlockedPresentation): string {
  const p = presentation ?? resolveIucnPlayerPresentation();
  const gameplay = p.gameplayCategoryLabel
    ? `<p class="iucn-blocked-gameplay" data-iucn-gameplay-label="1"><strong>Gameplay planning label:</strong> ${escapeHtml(
        p.gameplayCategoryLabel,
      )} — not an IUCN Red List assessment.</p>`
    : '';
  const steps = IUCN_OWNER_SETUP_STEPS.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  return `
    <aside class="iucn-blocked-panel"
           data-iucn-gate="blocked_external"
           data-iucn-assessed="false"
           data-iucn-source-verified="false"
           data-iucn-show-assessed-badge="false"
           role="status"
           aria-label="${escapeHtml(p.ariaLabel)}">
      <p class="iucn-blocked-title"><strong>${escapeHtml(p.playerTitle)}</strong>
        <span class="blocked-badge">blocked_external</span></p>
      <p class="iucn-blocked-summary">${escapeHtml(p.playerSummary)}</p>
      <p class="iucn-blocked-rights">${escapeHtml(p.rightsCredentialNote)}</p>
      ${gameplay}
      <details class="iucn-blocked-owner-steps">
        <summary>Owner credential / rights steps (not player unlock)</summary>
        <ol>${steps}</ol>
      </details>
      <p class="iucn-blocked-invariants"><em>assessed=false · source_verified=false · no fake assessed badges</em></p>
    </aside>
  `.trim();
}

/** Evidence-panel strip so federated Sources tab also shows the gate. */
export function renderIucnBlockedEvidenceStripHtml(
  presentation?: IucnBlockedPresentation,
): string {
  const p = presentation ?? resolveIucnPlayerPresentation();
  return `
    <aside class="iucn-blocked-evidence"
           data-iucn-gate="blocked_external"
           data-iucn-assessed="false"
           data-provider="iucn"
           role="note">
      <strong>IUCN</strong>
      <span class="blocked-badge">blocked_external</span>
      <p>${escapeHtml(p.playerSummary)}</p>
    </aside>
  `.trim();
}

/** Assert presentation never claims assessed / source_verified. */
export function assertIucnBlockedHonesty(presentation: IucnBlockedPresentation): void {
  if (presentation.assessed !== false || presentation.showAssessedBadge !== false) {
    throw new Error('IUCN blocked presentation must keep assessed=false / showAssessedBadge=false');
  }
  if (presentation.sourceVerified !== false || presentation.gateState !== 'blocked_external') {
    throw new Error('IUCN blocked presentation must stay blocked_external / sourceVerified=false');
  }
  if (presentation.dataMode === 'source_verified') {
    throw new Error('IUCN blocked presentation must not use dataMode=source_verified');
  }
}
