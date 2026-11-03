/**
 * Surrounding player experience while IUCN stays blocked and 0/17 maps stay locked.
 * Finishes the explorable loop around external blockers — never invents tokens or maps.
 */

import { buildMuseumHubPresentation } from '@/systems/museumDexPresentation';
import { renderIucnBlockedPanelHtml, resolveIucnPlayerPresentation } from '@/systems/iucnBlockedPresentation';
import {
  summarizeTemporalMapCatalogHonesty,
  renderTemporalMapCatalogBannerHtml,
  type TemporalMapCatalogHonesty,
} from '@/systems/timeAtlasBlockedPresentation';
import { renderFlagshipOriginalArtProgressHtml } from '@/systems/flagshipOriginalArtProgress';
import { renderLifelingHonestyHtml } from '@/systems/lifelingHonestyPresentation';
import { renderTaxonomyReconcileHonestyHtml, type TaxonomyReconcileReport } from '@/services/ingestion/taxonomyReconcile';
import type { TemporalEarthMapCatalog } from '@/schema/temporalMap';

export type LockedScienceSurroundReport = {
  schema: 'aol.locked_science_surround.v1';
  generatedAt: string;
  iucnGate: 'blocked_external';
  temporalMapsUnlocked: 0;
  temporalMapsExpected: 17;
  scienceContinuesWithoutIucn: true;
  mapsStayLockedWithoutAssets: true;
  expeditionLoopReady: true;
  humanRc2V1: false;
  playerBeats: string[];
  rule: string;
};

const RULE =
  'IUCN blocked_external and 0/17 maps locked do not freeze museum → expedition → ArchiveDex → Lifeling loops; finish surrounding UX without inventing credentials or paleogeography.';

const PLAYER_BEATS = [
  'Museum hub honesty: authored floors, IUCN blocked, maps 0/17',
  'Region expedition with species-specific observation (24/24 procedural briefs ≠ finished art)',
  'ArchiveDex entry with art-progress + taxonomy-reconcile strips',
  'Lifeling companion handling without conservation-assessment badges',
  'Time Atlas banner: blocked/illustration honesty — no fake unlock',
  'Save/reload preserves expedition state without claiming source_verified science',
] as const;

export function buildLockedScienceSurroundReport(
  generatedAt = new Date().toISOString(),
): LockedScienceSurroundReport {
  const hub = buildMuseumHubPresentation();
  if (!hub.temporalMapsHonesty.includes('0/17')) {
    throw new Error('Surround experience requires honest 0/17 maps label');
  }
  return {
    schema: 'aol.locked_science_surround.v1',
    generatedAt,
    iucnGate: 'blocked_external',
    temporalMapsUnlocked: 0,
    temporalMapsExpected: 17,
    scienceContinuesWithoutIucn: true,
    mapsStayLockedWithoutAssets: true,
    expeditionLoopReady: true,
    humanRc2V1: false,
    playerBeats: [...PLAYER_BEATS],
    rule: RULE,
  };
}

export function assertLockedScienceSurround(report: LockedScienceSurroundReport): void {
  if (report.iucnGate !== 'blocked_external') {
    throw new Error('Surround must keep IUCN blocked_external');
  }
  if (report.temporalMapsUnlocked !== 0 || report.temporalMapsExpected !== 17) {
    throw new Error('Surround must keep 0/17 maps locked');
  }
  if (!report.scienceContinuesWithoutIucn || !report.mapsStayLockedWithoutAssets) {
    throw new Error('Surround honesty flags violated');
  }
  if (report.humanRc2V1) {
    throw new Error('HUMAN/RC2/V1 must remain false');
  }
}

/** Composite HTML for museum/expedition HUD while external science stays gated. */
export function renderLockedScienceSurroundHtml(input?: {
  taxonomyReport?: TaxonomyReconcileReport | null;
  catalog?: TemporalEarthMapCatalog | null;
}): string {
  const report = buildLockedScienceSurroundReport();
  assertLockedScienceSurround(report);
  const iucn = resolveIucnPlayerPresentation({ adapterBlocked: true, dataMode: 'blocked_external' });
  const mapHonesty: TemporalMapCatalogHonesty = input?.catalog
    ? summarizeTemporalMapCatalogHonesty(input.catalog)
    : {
        total: 17,
        expectedTotal: 17,
        scientificallyUnlocked: 0,
        labeledSourceVerified: 0,
        blocked: 17,
        illustration: 0,
        honestyCopy: '0/17 full-Earth maps source-verified — blocked',
        playerBanner:
          'FULL-EARTH MAPS 0/17 SOURCE-VERIFIED · blocked=17 · illustration=0 — locked without authorized reconstruction assets; no speculative coastlines.',
        isMockCatalog: true,
      };

  const taxonomyHtml = input?.taxonomyReport
    ? renderTaxonomyReconcileHonestyHtml(input.taxonomyReport)
    : '<aside class="taxonomy-reconcile-honesty" role="note"><p>Taxonomy reconcile available via permitted COL/GBIF/PBDB fixtures (sample_fallback).</p></aside>';

  const beats = report.playerBeats.map((b) => `<li>${escapeHtml(b)}</li>`).join('');

  return [
    '<section class="locked-science-surround" data-iucn="blocked_external" data-maps="0/17" role="region" aria-label="Surrounding experience while IUCN and paleomaps stay locked">',
    '<h2>Continue the expedition</h2>',
    `<p>${escapeHtml(report.rule)}</p>`,
    `<ul class="surround-beats">${beats}</ul>`,
    renderIucnBlockedPanelHtml(iucn),
    renderTemporalMapCatalogBannerHtml(mapHonesty),
    renderFlagshipOriginalArtProgressHtml(),
    renderLifelingHonestyHtml(),
    taxonomyHtml,
    '</section>',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
