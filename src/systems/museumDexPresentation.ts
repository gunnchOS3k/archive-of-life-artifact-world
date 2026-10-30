/**
 * Museum hub + ArchiveDex presentation honesty.
 * Authored floors and identity candidates only — never Earth-complete / source_verified release.
 */

import {
  FLAGSHIP_OBSERVATION_PROFILES,
  flagshipArtStatusLabel,
  listFlagshipTaxonIds,
  type FlagshipObservationProfile,
} from '@/services/flagshipTaxonProfiles';
import { getSpeciesIcon } from '@/services/speciesRepresentation';
import {
  getRegionExplorationCard,
  REGION_EXPLORATION_CARDS,
} from '@/systems/regionExploration';
import { renderFlagshipArtHonestyHtml } from '@/systems/flagshipArtHonestyPresentation';
import {
  buildSilhouetteBrief,
  proceduralArtWaveNumber,
  renderFlagshipOriginalArtProgressHtml,
} from '@/systems/flagshipOriginalArtProgress';
import { renderPublicAlternativesHonestyHtml } from '@/services/ingestion/publicDataAlternatives';
import { renderLockedScienceSurroundHtml } from '@/systems/lockedScienceSurroundExperience';
import { resolveObservationMotionForTaxon } from '@/systems/observationLocomotion';
import { screenReaderHintHtml } from '@/systems/accessibility';
import { renderLifelingHonestyHtml } from '@/systems/lifelingHonestyPresentation';
import {
  renderSilhouetteSvgPackageHtml,
  renderSilhouetteSvgPreviewHtml,
} from '@/systems/silhouetteSvgPackage';

export type MuseumDexClaimClass =
  | 'game_authored_floor'
  | 'sample_fallback'
  | 'blocked_external'
  | 'source_verified';

export interface MuseumHubPresentation {
  regionId: 'museum';
  title: string;
  subtitle: string;
  exploreRegionCount: number;
  flagshipCount: number;
  earthCompleteClaim: false;
  productionReadyClaim: false;
  sourceVerifiedReleaseClaim: false;
  temporalMapsHonesty: '0/17 full-Earth maps source-verified — blocked / illustration only (not unlocked)';
  iucnHonesty: 'IUCN Red List unavailable (blocked_external) — needs owner API credentials and rights review before assessed statuses appear';
  objectives: string[];
  ariaLabel: string;
}

export interface ArchiveDexEntryPresentation {
  taxonId: string;
  scientificName: string;
  representationMark: string;
  artStatusLabel: string;
  claimClass: MuseumDexClaimClass;
  iucnAssessed: false;
  finishedModelClaimed: false;
  /** Authored Wave silhouette brief — procedural ≠ finished model. */
  locomotionCue: string | null;
  behaviorNote: string | null;
  posture: string | null;
  observationMotionMode: string | null;
  silhouetteBriefWave: number | null;
  ariaLabel: string;
}

export function buildMuseumHubPresentation(): MuseumHubPresentation {
  const museum = getRegionExplorationCard('museum');
  const exploreCount = REGION_EXPLORATION_CARDS.filter((c) => c.regionId !== 'museum').length;
  const flagshipCount = listFlagshipTaxonIds().length;
  const title = museum?.displayName ?? 'Archive of Life Museum';
  const subtitle =
    'Museum hub for expeditions, ArchiveDex, and Lifelings — authored floors, not Earth-complete science.';
  return {
    regionId: 'museum',
    title,
    subtitle,
    exploreRegionCount: exploreCount,
    flagshipCount,
    earthCompleteClaim: false,
    productionReadyClaim: false,
    sourceVerifiedReleaseClaim: false,
    temporalMapsHonesty: '0/17 full-Earth maps source-verified — blocked / illustration only (not unlocked)',
    iucnHonesty:
      'IUCN Red List unavailable (blocked_external) — needs owner API credentials and rights review before assessed statuses appear',
    objectives: museum?.objectives ?? [],
    ariaLabel: `${title}. ${subtitle} Explore regions: ${exploreCount}. Flagship taxa: ${flagshipCount}. Maps: 0 of 17 source-verified. IUCN blocked_external; assessed=false.`,
  };
}

export function buildArchiveDexEntryPresentation(
  taxonId: string,
): ArchiveDexEntryPresentation | null {
  const profile: FlagshipObservationProfile | undefined =
    FLAGSHIP_OBSERVATION_PROFILES[taxonId];
  if (!profile) return null;
  const mark = getSpeciesIcon({
    id: profile.taxonId,
    scientificName: profile.scientificName,
  });
  const artStatusLabel = flagshipArtStatusLabel(profile);
  const motion = resolveObservationMotionForTaxon(taxonId);
  const brief = buildSilhouetteBrief(taxonId);
  const loco = motion.locomotionCue ?? brief?.locomotionCue ?? null;
  const behavior = motion.behaviorNote ?? profile.behaviorNote ?? null;
  const posture = motion.posture ?? brief?.posture ?? null;
  const locoHint = loco ? ` Locomotion cue: ${loco}.` : '';
  const behaviorHint = behavior ? ` Behavior: ${behavior}.` : '';
  return {
    taxonId: profile.taxonId,
    scientificName: profile.scientificName,
    representationMark: mark,
    artStatusLabel,
    claimClass: 'game_authored_floor',
    iucnAssessed: false,
    finishedModelClaimed: false,
    locomotionCue: loco,
    behaviorNote: behavior,
    posture,
    observationMotionMode: motion.mode,
    silhouetteBriefWave: proceduralArtWaveNumber(taxonId),
    ariaLabel: `ArchiveDex entry ${profile.scientificName}. ${artStatusLabel}.${locoHint}${behaviorHint} IUCN blocked_external; assessed=false. Not source-verified release. Procedural silhouette brief ≠ finished model.`,
  };
}

/** HTML strip for ArchiveDex entry hero — authored locomotion/behavior, never finished-model. */
export function renderArchiveDexBriefStripHtml(
  presentation: ArchiveDexEntryPresentation,
): string {
  const parts: string[] = [];
  if (presentation.locomotionCue) {
    parts.push(
      `<li><span class="detail-label">Locomotion (authored brief):</span> ${escapeHtml(presentation.locomotionCue)}</li>`,
    );
  }
  if (presentation.behaviorNote) {
    parts.push(
      `<li><span class="detail-label">Behavior note:</span> ${escapeHtml(presentation.behaviorNote)}</li>`,
    );
  }
  if (presentation.posture) {
    parts.push(
      `<li><span class="detail-label">Posture brief:</span> ${escapeHtml(presentation.posture)}</li>`,
    );
  }
  if (presentation.observationMotionMode) {
    parts.push(
      `<li><span class="detail-label">Observation motion mode:</span> <code>${escapeHtml(presentation.observationMotionMode)}</code> (procedural ≠ finished)</li>`,
    );
  }
  if (!parts.length) return '';
  const wave =
    presentation.silhouetteBriefWave != null
      ? ` Wave-${presentation.silhouetteBriefWave}`
      : '';
  const sr = screenReaderHintHtml(
    `${presentation.scientificName}${wave} silhouette brief: locomotion and behavior are authored procedural cues, not finished models. IUCN assessed false.`,
  );
  const mode = presentation.observationMotionMode ?? 'amble';
  return `
    <aside class="dex-brief-strip" data-dex-brief-strip="1" data-finished-model="false" role="note" aria-label="Authored silhouette brief — not a finished model">
      <p class="dex-brief-strip-title">Silhouette brief${wave} (procedural candidate — not human-approved final art)</p>
      <ul>${parts.join('')}</ul>
      ${renderSilhouetteSvgPreviewHtml(mode)}
      <p class="dex-silhouette-svg-path">SVG stub path: <code>/assets/silhouettes/silhouette-${escapeHtml(mode)}.svg</code> (procedural ≠ finished)</p>
      ${sr}
    </aside>
  `.trim();
}

/** Authored explore-region labels for CTA hint (never paleomap unlocks). */
export function listMuseumExpeditionRegionHints(limit = 4): string[] {
  return REGION_EXPLORATION_CARDS.filter((c) => c.regionId !== 'museum')
    .slice(0, limit)
    .map((c) => c.displayName);
}

/**
 * Museum expedition CTA — playable loop without maps/IUCN unlock claims.
 * Wire via data-museum-expedition-cta; bindMuseumExpeditionCta attaches click.
 */
export function renderMuseumExpeditionCtaHtml(
  hub: MuseumHubPresentation = buildMuseumHubPresentation(),
): string {
  const hints = listMuseumExpeditionRegionHints();
  const hintLine = hints.length
    ? `<p class="museum-expedition-cta-hints">Authored floors (sample): ${hints.map((h) => escapeHtml(h)).join(' · ')}</p>`
    : '';
  return `
    <div class="museum-expedition-cta" data-museum-expedition-cta="1" role="region" aria-label="Start region expedition — maps and IUCN remain locked">
      <p class="museum-expedition-cta-title"><strong>Continue expedition</strong></p>
      <p class="museum-expedition-cta-body">Choose an authored region (${hub.exploreRegionCount} floors) → observe flagships with procedural silhouette briefs → return to ArchiveDex / Lifeling. Paleomaps stay <strong>0/17</strong>; IUCN stays <strong>blocked_external</strong> (assessed=false).</p>
      ${hintLine}
      <button type="button" class="museum-expedition-cta-btn" data-action="start-expedition" data-maps-unlocked="false" data-iucn-assessed="false" data-source-verified="false" data-finished-art="false">
        Enter region expedition
      </button>
      <p class="museum-expedition-cta-honesty">No IUCN badges · no paleomap unlock · procedural ≠ finished · HUMAN/RC2/V1=false</p>
    </div>
  `.trim();
}

/**
 * Bind CTA click to existing Begin/Continue expedition or map/earth HUD controls.
 * Never sets mapsUnlocked / iucnAssessed / sourceVerified.
 */
export function bindMuseumExpeditionCta(root: ParentNode | null | undefined): boolean {
  if (!root || typeof (root as ParentNode).querySelector !== 'function') return false;
  const btn = root.querySelector(
    '[data-museum-expedition-cta] [data-action="start-expedition"]',
  ) as HTMLButtonElement | null;
  if (!btn || btn.dataset.bound === '1') return false;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => {
    const doc = btn.ownerDocument;
    const title = doc.getElementById('title-screen');
    const titleActive = title?.classList.contains('active');
    const targets = titleActive
      ? (['btn-new-game', 'btn-continue'] as const)
      : (['btn-map', 'btn-earth', 'btn-continue', 'btn-new-game'] as const);
    for (const id of targets) {
      const el = doc.getElementById(id) as HTMLButtonElement | null;
      if (el && !el.disabled) {
        el.click();
        return;
      }
    }
  });
  return true;
}

export function listArchiveDexFlagshipPresentations(): ArchiveDexEntryPresentation[] {
  return listFlagshipTaxonIds()
    .map((id) => buildArchiveDexEntryPresentation(id))
    .filter((entry): entry is ArchiveDexEntryPresentation => entry !== null);
}

/** Fail closed if presentation ever claims production / Earth-complete / IUCN assessed. */
export function assertMuseumDexHonesty(
  hub: MuseumHubPresentation,
  entries: ArchiveDexEntryPresentation[],
): void {
  if (hub.earthCompleteClaim || hub.productionReadyClaim || hub.sourceVerifiedReleaseClaim) {
    throw new Error('Museum hub must not claim Earth-complete / production / source_verified release');
  }
  if (!hub.temporalMapsHonesty.includes('0/17')) {
    throw new Error('Museum hub must retain 0/17 temporal map honesty');
  }
  for (const entry of entries) {
    if (entry.iucnAssessed || entry.finishedModelClaimed) {
      throw new Error(`ArchiveDex ${entry.taxonId}: assessed/finished claims forbidden without approval`);
    }
    if (entry.claimClass === 'source_verified') {
      throw new Error(`ArchiveDex ${entry.taxonId}: source_verified presentation forbidden for flagship floor`);
    }
  }
}

/** HTML for museum honesty strip mounted into the live player HUD / title hub. */
export function renderMuseumHubHonestyHtml(hub: MuseumHubPresentation = buildMuseumHubPresentation()): string {
  return `
    <aside class="museum-honesty" data-museum-honesty="1" role="status" aria-live="polite" aria-label="${escapeAttr(hub.ariaLabel)}">
      <p class="museum-honesty-title">${escapeHtml(hub.title)}</p>
      <p class="museum-honesty-subtitle">${escapeHtml(hub.subtitle)}</p>
      <ul class="museum-honesty-floors">
        <li>Explore regions: ${hub.exploreRegionCount} (floor ≥12)</li>
        <li>Flagship taxa: ${hub.flagshipCount} (floor 24)</li>
        <li>${escapeHtml(hub.temporalMapsHonesty)}</li>
        <li>${escapeHtml(hub.iucnHonesty)}</li>
        <li>Authored floors only — not Earth-complete / not production-ready</li>
        <li>Museum → expedition → ArchiveDex → Lifeling → save/resume stays playable without IUCN/maps unlocks</li>
      </ul>
      <div class="museum-lifeling-bridge" data-museum-lifeling-bridge="1">
        ${renderLifelingHonestyHtml()}
      </div>
      <div class="museum-silhouette-svg-bridge" data-museum-silhouette-svg-bridge="1">
        ${renderSilhouetteSvgPackageHtml()}
      </div>
      ${renderMuseumExpeditionCtaHtml(hub)}
    </aside>
  `.trim();
}

/** Compact ArchiveDex honesty banner (sample/authored floors; emoji ≠ finished). */
export function renderArchiveDexHonestyBannerHtml(): string {
  const entries = listArchiveDexFlagshipPresentations();
  const sample = entries[0];
  const artNote = sample?.artStatusLabel ?? 'identity candidate — not a finished model';
  return `
    <div class="archivedex-honesty" data-archivedex-honesty="1" role="note" aria-label="ArchiveDex honesty: authored floors, IUCN blocked_external not assessed, identity marks are not finished models">
      <p>ArchiveDex shows authored / sample floors. IUCN Red List is <strong>blocked_external</strong> (no owner credential / rights review yet) — assessed=false; no fake assessed badges.</p>
      <p>Identity marks (including emoji) are not finished models — ${escapeHtml(artNote)}. Wave-4 procedural briefs cover 24/24 flagships; human-approved finals still pending.</p>
      <p>Maps 0/17 source-verified · production-ready=false · source_verified release=false · anySourceVerified=false</p>
      <p>IUCN token absence does not freeze COL/GBIF/PBDB/Neotoma/NASA science — those paths stay sample_fallback until human review.</p>
      ${renderFlagshipArtHonestyHtml()}
      ${renderFlagshipOriginalArtProgressHtml()}
      ${renderPublicAlternativesHonestyHtml()}
      ${renderLockedScienceSurroundHtml()}
    </div>
  `.trim();
}

/**
 * Mount museum hub presentation into a live DOM root (title screen or in-game museum HUD).
 * Returns false if the host node is missing.
 */
export function mountMuseumHubPresentation(
  root: ParentNode | null | undefined,
  hub: MuseumHubPresentation = buildMuseumHubPresentation(),
): boolean {
  if (!root || typeof (root as ParentNode).querySelector !== 'function') return false;
  const host =
    (root.querySelector('[data-museum-honesty-host]:not([hidden])') as HTMLElement | null) ??
    (root.querySelector('#museum-honesty-host') as HTMLElement | null) ??
    (root.querySelector('[data-museum-honesty-host]') as HTMLElement | null);
  if (!host) return false;
  host.innerHTML = renderMuseumHubHonestyHtml(hub);
  host.setAttribute('aria-label', hub.ariaLabel);
  const title = root.querySelector('#title-screen') as HTMLElement | null;
  if (title) title.setAttribute('aria-label', hub.ariaLabel);
  const regionName = root.querySelector('#region-name') as HTMLElement | null;
  if (regionName) {
    regionName.textContent = hub.title;
    regionName.setAttribute('aria-label', hub.ariaLabel);
  }
  bindMuseumExpeditionCta(host);
  assertMuseumDexHonesty(hub, listArchiveDexFlagshipPresentations());
  return true;
}

/**
 * Mount ArchiveDex honesty banner into the archive panel body.
 */
export function mountArchiveDexHonestyBanner(root: ParentNode | null | undefined): boolean {
  if (!root || typeof (root as ParentNode).querySelector !== 'function') return false;
  const panel = root.querySelector('#panel-archive') ?? root;
  let host = panel.querySelector('#archivedex-honesty-host') as HTMLElement | null;
  if (!host) {
    const coverage = panel.querySelector('#archive-coverage');
    if (!coverage || !coverage.parentElement) return false;
    host = coverage.ownerDocument!.createElement('div');
    host.id = 'archivedex-honesty-host';
    coverage.parentElement.insertBefore(host, coverage);
  }
  host.innerHTML = renderArchiveDexHonestyBannerHtml();
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
