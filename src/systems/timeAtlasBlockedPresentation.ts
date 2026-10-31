/**
 * Player-facing Time Atlas full-Earth map honesty.
 * Distinguishes blocked vs illustration vs verified — and never unlocks
 * paleogeography without an authorized, checksummed reconstruction asset.
 *
 * HARD: keep 0/17 source_verified until real assets exist; never invent coastlines.
 */

import type {
  TemporalEarthMapCatalog,
  TemporalEarthMapRecord,
} from '@/schema/temporalMap';

/** Player-visible gate for one full-Earth temporal map. */
export type TemporalMapPlayerState = 'blocked' | 'illustration' | 'verified';

export type TemporalMapPresentation = {
  playerState: TemporalMapPlayerState;
  /** Scientifically unlocked for paleogeography rendering. */
  scientificallyUnlocked: false | true;
  sourceVerified: false | true;
  catalogStatusLabel: string;
  playerTitle: string;
  playerSummary: string;
  unlockRequirementNote: string;
  coverageLabel: string;
  ariaLabel: string;
  /** Catalog/status may claim verified; presentation still refuses unlock without asset. */
  refusedFakeVerifiedLabel: boolean;
};

export type TemporalMapCatalogHonesty = {
  total: number;
  expectedTotal: 17;
  scientificallyUnlocked: number;
  /** Raw catalog status==source_verified counts — never used to unlock alone. */
  labeledSourceVerified: number;
  blocked: number;
  illustration: number;
  honestyCopy: string;
  playerBanner: string;
  isMockCatalog: boolean;
};

const EXPECTED_MAPS = 17 as const;

const UNLOCK_NOTE =
  'Full-Earth paleogeographic maps stay locked without authorized reconstruction assets (licensed source, packaged GeoJSON/PMTiles, SHA-256 checksum, and full-Earth coverage). An ICS chronology sample or modern basemap does not unlock paleo coastlines.';

const BLOCKED_TITLE = 'Full-Earth map blocked';
const ILLUSTRATION_TITLE = 'Illustration only — not unlocked';
const VERIFIED_TITLE = 'Source-verified full-Earth map';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * True only when a packaged, full-Earth, non-mock asset backs source_verified.
 * Status labels alone never unlock.
 */
export function isAuthorizedSourceVerifiedMap(
  map: TemporalEarthMapRecord | undefined,
  catalogIsMockData: boolean,
): boolean {
  if (!map) return false;
  if (catalogIsMockData) return false;
  if (map.status !== 'source_verified') return false;
  if (!map.asset) return false;
  if (map.fullEarthCoverage !== true) return false;
  if (!map.asset.sha256 || map.asset.sha256.length < 64) return false;
  if (!map.asset.path) return false;
  if (map.coveredGridCellCount < map.expectedGridCellCount) return false;
  return true;
}

/**
 * Resolve player-facing state. Catalog/status hacks that set source_verified
 * without an authorized asset are refused into blocked (or illustration when
 * the catalog is explicitly mock / partial illustration).
 */
export function resolveTemporalMapPresentation(
  map: TemporalEarthMapRecord,
  options: { catalogIsMockData?: boolean } = {},
): TemporalMapPresentation {
  const catalogIsMock = Boolean(options.catalogIsMockData);
  const authorized = isAuthorizedSourceVerifiedMap(map, catalogIsMock);
  const coverageLabel = `${map.coveredGridCellCount}/${map.expectedGridCellCount} cells`;
  const fakeVerifiedLabel =
    map.status === 'source_verified' && !authorized;

  if (authorized) {
    return {
      playerState: 'verified',
      scientificallyUnlocked: true,
      sourceVerified: true,
      catalogStatusLabel: map.status,
      playerTitle: VERIFIED_TITLE,
      playerSummary:
        'Authorized reconstruction asset is packaged with checksum and full-Earth coverage. Paleogeography may render for this gate.',
      unlockRequirementNote: UNLOCK_NOTE,
      coverageLabel,
      refusedFakeVerifiedLabel: false,
      ariaLabel: `${VERIFIED_TITLE}. source_verified=true. scientifically_unlocked=true. Coverage ${coverageLabel}.`,
    };
  }

  // Illustration: mock catalog, partial coverage, or ICS/sample context —
  // never scientifically unlocked.
  const illustration =
    catalogIsMock ||
    map.status === 'partial' ||
    (map.coveredGridCellCount > 0 && map.coveredGridCellCount < map.expectedGridCellCount);

  if (illustration) {
    const summary = catalogIsMock
      ? 'Catalog is mock / illustrative. Chronology browsing is available; full-Earth paleogeographic reconstructions are not unlocked and no speculative coastlines are drawn.'
      : 'Partial or sample geography is illustration-only. Maps stay locked until an authorized full-Earth reconstruction asset is packaged and verified.';
    return {
      playerState: 'illustration',
      scientificallyUnlocked: false,
      sourceVerified: false,
      catalogStatusLabel: map.status,
      playerTitle: ILLUSTRATION_TITLE,
      playerSummary: summary,
      unlockRequirementNote: UNLOCK_NOTE,
      coverageLabel,
      refusedFakeVerifiedLabel: fakeVerifiedLabel,
      ariaLabel:
        `${ILLUSTRATION_TITLE}. playerState=illustration. source_verified=false. scientifically_unlocked=false.` +
        (fakeVerifiedLabel ? ' Refused fake source_verified label without authorized asset.' : '') +
        ` Coverage ${coverageLabel}.`,
    };
  }

  return {
    playerState: 'blocked',
    scientificallyUnlocked: false,
    sourceVerified: false,
    catalogStatusLabel: map.status,
    playerTitle: BLOCKED_TITLE,
    playerSummary:
      map.blockedReason ??
      'No authorized paleogeographic reconstruction asset is available for this Time Atlas gate. Maps remain locked; this build does not invent coastlines.',
    unlockRequirementNote: UNLOCK_NOTE,
    coverageLabel,
    refusedFakeVerifiedLabel: fakeVerifiedLabel,
    ariaLabel:
      `${BLOCKED_TITLE}. playerState=blocked. source_verified=false. scientifically_unlocked=false.` +
      (fakeVerifiedLabel ? ' Refused fake source_verified label without authorized asset.' : '') +
      ` Coverage ${coverageLabel}.`,
  };
}

/** Quarantine a sabotaged map record — strip fake verified unlock fields. */
export function quarantineTemporalMapUnlockHack(
  map: TemporalEarthMapRecord,
  options: { catalogIsMockData?: boolean } = {},
): TemporalEarthMapRecord {
  const catalogIsMock = Boolean(options.catalogIsMockData);
  if (isAuthorizedSourceVerifiedMap(map, catalogIsMock)) {
    return map;
  }
  // Force blocked presentation inputs: no asset, not full coverage, not verified.
  if (
    map.status === 'source_verified' ||
    map.fullEarthCoverage === true ||
    map.asset != null
  ) {
    return {
      ...map,
      status: 'blocked_external',
      fullEarthCoverage: false,
      asset: null,
      coveredGridCellCount: 0,
      coveredGridCellIds: [],
      blockedReason:
        map.blockedReason ??
        'Honesty quarantine: source_verified / unlock fields without an authorized reconstruction asset were refused.',
    };
  }
  return map;
}

export function summarizeTemporalMapCatalogHonesty(
  catalog: TemporalEarthMapCatalog,
): TemporalMapCatalogHonesty {
  const maps = catalog.maps ?? [];
  const total = maps.length || EXPECTED_MAPS;
  let scientificallyUnlocked = 0;
  let labeledSourceVerified = 0;
  let blocked = 0;
  let illustration = 0;

  for (const map of maps) {
    const p = resolveTemporalMapPresentation(map, {
      catalogIsMockData: catalog.isMockData,
    });
    if (map.status === 'source_verified') labeledSourceVerified += 1;
    if (p.scientificallyUnlocked) scientificallyUnlocked += 1;
    else if (p.playerState === 'illustration') illustration += 1;
    else blocked += 1;
  }

  const honestyCopy = `${scientificallyUnlocked}/${EXPECTED_MAPS} full-Earth maps source-verified — blocked`;
  const playerBanner =
    `FULL-EARTH MAPS ${scientificallyUnlocked}/${EXPECTED_MAPS} SOURCE-VERIFIED` +
    ` · blocked=${blocked} · illustration=${illustration}` +
    ` — locked without authorized reconstruction assets; no speculative coastlines.`;

  return {
    total,
    expectedTotal: EXPECTED_MAPS,
    scientificallyUnlocked,
    labeledSourceVerified,
    blocked,
    illustration,
    honestyCopy,
    playerBanner,
    isMockCatalog: catalog.isMockData,
  };
}

export function assertTemporalMapPresentationHonesty(
  presentation: TemporalMapPresentation,
): void {
  if (presentation.playerState === 'verified') {
    if (!presentation.scientificallyUnlocked || !presentation.sourceVerified) {
      throw new Error('Verified map presentation must set scientificallyUnlocked and sourceVerified');
    }
    return;
  }
  if (presentation.scientificallyUnlocked !== false || presentation.sourceVerified !== false) {
    throw new Error(
      `Time Atlas ${presentation.playerState} presentation must keep scientificallyUnlocked=false / sourceVerified=false`,
    );
  }
}

export function assertTemporalMapCatalogHonesty(
  honesty: TemporalMapCatalogHonesty,
  options: { allowVerified?: boolean } = {},
): void {
  if (!options.allowVerified && honesty.scientificallyUnlocked !== 0) {
    throw new Error(
      `Time Atlas honesty violation: expected 0 scientifically unlocked maps, got ${honesty.scientificallyUnlocked}`,
    );
  }
  if (honesty.expectedTotal !== 17) {
    throw new Error('Time Atlas honesty expects 17 supported full-Earth map gates');
  }
  if (!honesty.honestyCopy.includes('0/17') && honesty.scientificallyUnlocked === 0) {
    throw new Error('Time Atlas honesty copy must retain 0/17 when nothing is unlocked');
  }
}

/** Compact status chip for gate cards / detail rows. */
export function renderTemporalMapStatusHtml(
  presentation: TemporalMapPresentation,
): string {
  assertTemporalMapPresentationHonesty(presentation);
  const state = presentation.playerState;
  const badge =
    state === 'verified'
      ? 'SOURCE VERIFIED — UNLOCKED'
      : state === 'illustration'
        ? 'ILLUSTRATION — NOT UNLOCKED'
        : 'BLOCKED — NO AUTHORIZED ASSET';
  const refused = presentation.refusedFakeVerifiedLabel
    ? ' <span class="mock-badge">REFUSED FAKE source_verified LABEL</span>'
    : '';
  return `
    <span class="temporal-map-status temporal-map-state-${state}"
          data-temporal-map-state="${state}"
          data-temporal-map-source-verified="${presentation.sourceVerified}"
          data-temporal-map-unlocked="${presentation.scientificallyUnlocked}"
          data-temporal-map-refused-fake-verified="${presentation.refusedFakeVerifiedLabel}"
          aria-label="${escapeHtml(presentation.ariaLabel)}">
      <span class="${state === 'verified' ? 'earth-mode-badge' : 'mock-badge'}">${escapeHtml(badge)}</span>
      ${escapeHtml(presentation.coverageLabel)}${refused}
    </span>
  `.trim();
}

/** Banner for the Time Atlas panel header. */
export function renderTemporalMapCatalogBannerHtml(
  honesty: TemporalMapCatalogHonesty,
): string {
  assertTemporalMapCatalogHonesty(honesty, {
    allowVerified: honesty.scientificallyUnlocked > 0,
  });
  return `
    <aside class="temporal-map-honesty-banner"
           data-temporal-maps-unlocked="${honesty.scientificallyUnlocked}"
           data-temporal-maps-total="${honesty.expectedTotal}"
           data-temporal-maps-blocked="${honesty.blocked}"
           data-temporal-maps-illustration="${honesty.illustration}"
           data-temporal-maps-mock="${honesty.isMockCatalog}"
           role="status"
           aria-label="${escapeHtml(honesty.honestyCopy)}">
      <span class="mock-badge">FULL-EARTH MAPS ${honesty.scientificallyUnlocked}/${honesty.expectedTotal} SOURCE-VERIFIED</span>
      Blocked until authorized reconstruction assets exist — no speculative coastlines.
      <span class="temporal-map-state-legend">
        States: <code>blocked</code> (no asset) · <code>illustration</code> (mock/partial, not unlocked) · <code>verified</code> (authorized asset only).
      </span>
    </aside>
  `.trim();
}

/** Detail panel explaining why a map stays locked. */
export function renderTemporalMapBlockedPanelHtml(
  presentation: TemporalMapPresentation,
): string {
  assertTemporalMapPresentationHonesty(presentation);
  return `
    <aside class="temporal-map-blocked-panel"
           data-temporal-map-state="${presentation.playerState}"
           data-temporal-map-source-verified="${presentation.sourceVerified}"
           data-temporal-map-unlocked="${presentation.scientificallyUnlocked}"
           role="note"
           aria-label="${escapeHtml(presentation.ariaLabel)}">
      <p class="temporal-map-blocked-title"><strong>${escapeHtml(presentation.playerTitle)}</strong>
        <span class="blocked-badge">${escapeHtml(presentation.playerState)}</span></p>
      <p class="temporal-map-blocked-summary">${escapeHtml(presentation.playerSummary)}</p>
      <p class="temporal-map-blocked-unlock">${escapeHtml(presentation.unlockRequirementNote)}</p>
      <p class="temporal-map-blocked-invariants"><em>source_verified=${presentation.sourceVerified} · scientifically_unlocked=${presentation.scientificallyUnlocked} · coverage ${escapeHtml(presentation.coverageLabel)}</em></p>
    </aside>
  `.trim();
}
