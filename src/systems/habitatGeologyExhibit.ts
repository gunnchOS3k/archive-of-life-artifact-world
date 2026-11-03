/**
 * ArchiveDex habitat + geology exhibit depth.
 *
 * Joins data the runtime already carries (bundle distribution dataMode, flagship
 * habitat cues, region exploration cards, Time Atlas temporal-map catalog) into
 * the taxon exhibit. Nothing here adds ranges, periods, or paleogeography: a
 * mock_sample range stays sample_fallback, and paleomaps stay locked unless the
 * catalog record passes resolveTemporalMapPresentation's authorization checks.
 */
import type { ArchiveDexEntry, HabitatRangeProfile } from '@/schema/archivedex';
import { escapeHtml } from '@/schema/htmlSafety';
import type { TemporalEarthMapCatalog } from '@/schema/temporalMap';
import { getFlagshipProfile } from '@/services/flagshipTaxonProfiles';
import type { MuseumDexClaimClass } from '@/systems/museumDexPresentation';
import { getRegionExplorationCard } from '@/systems/regionExploration';
import { resolveTemporalMapPresentation } from '@/systems/timeAtlasBlockedPresentation';

export type RangeClaimClass = Extract<MuseumDexClaimClass, 'sample_fallback' | 'game_authored_floor' | 'source_verified'> | 'unlabeled';

export interface HabitatExhibit {
  rangeClaim: RangeClaimClass;
  rangeNote: string;
  fieldCues: string[];
  region?: {
    regionId: string;
    displayName: string;
    biome: string;
    continents: string[];
    scientificScope: string;
    earthCompleteClaim: false;
  };
}

export interface GeologyInterval {
  timeGateId: string;
  timeUnitIds: string[];
  oldestMa: number;
  youngestMa: number;
  paleomapState: 'verified' | 'illustration' | 'blocked';
  scientificallyUnlocked: boolean;
  playerTitle: string;
  playerSummary: string;
  ariaLabel: string;
}

export interface GeologyExhibit {
  catalogLoaded: boolean;
  intervals: GeologyInterval[];
  unmatchedTimeUnitIds: string[];
  scientificallyUnlockedCount: number;
  /** Formation names / geologic-period labels are not imported in bundled snapshots unless present here. */
  stratigraphy: StratigraphySnapshotHonesty;
}

/** Bundled dex entries may omit formation-level fields; never invent them at render time. */
export interface StratigraphySnapshotHonesty {
  formationNamesPresent: boolean;
  geologicPeriodLabelPresent: boolean;
  playerNote: string;
}

export function buildStratigraphySnapshotHonesty(entry: ArchiveDexEntry): StratigraphySnapshotHonesty {
  const formations = entry.habitatRange?.formations ?? [];
  const formationNamesPresent = formations.length > 0;
  const periodFields = [
    entry.time?.period,
    entry.time?.era,
    entry.time?.eon,
    entry.time?.epoch,
    entry.time?.age,
  ].filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
  const geologicPeriodLabelPresent = periodFields.length > 0;
  if (formationNamesPresent || geologicPeriodLabelPresent) {
    return {
      formationNamesPresent,
      geologicPeriodLabelPresent,
      playerNote:
        'Formation or chronostratigraphic labels appear in this snapshot — open Sources for citations; they are not paleomap unlocks.',
    };
  }
  return {
    formationNamesPresent: false,
    geologicPeriodLabelPresent: false,
    playerNote:
      'No formation names or geologic-period labels in this bundled snapshot. Time Atlas gate ages above are interval hints only — not formation-level geology.',
  };
}

const RANGE_NOTES: Record<RangeClaimClass, string> = {
  sample_fallback: 'Range hints are sample_fallback planning twins, not GBIF occurrence-verified ranges.',
  game_authored_floor: 'Range hints are game-authored for expedition play, not a surveyed range.',
  source_verified: 'Range fields are marked source_verified in the loaded snapshot; open Sources for citations.',
  unlabeled: 'Range provenance is not labeled in this snapshot; treat as unverified.',
};

const MOCK_SOURCE_VERSION = /mock|quarantined|sample/i;

/** Launch-floor bundles omit dataMode but keep a mock sourceVersion; that is still sample data. */
function rangeClaimFor(range: HabitatRangeProfile | undefined): RangeClaimClass {
  const mode = range?.rangeDataMode;
  if (mode === 'source_verified') return 'source_verified';
  if (mode === 'game_authored') return 'game_authored_floor';
  if (mode === 'mock_sample') return 'sample_fallback';
  if (range?.rangeSourceVersion && MOCK_SOURCE_VERSION.test(range.rangeSourceVersion)) return 'sample_fallback';
  return 'unlabeled';
}

export function buildHabitatExhibit(entry: ArchiveDexEntry): HabitatExhibit {
  const rangeClaim = rangeClaimFor(entry.habitatRange);
  const card = entry.region ? getRegionExplorationCard(entry.region) : undefined;
  return {
    rangeClaim,
    rangeNote: entry.habitatRange?.rangeUncertaintyNote || RANGE_NOTES[rangeClaim],
    fieldCues: getFlagshipProfile(entry.id)?.habitatCues ?? [],
    region: card
      ? {
          regionId: card.regionId,
          displayName: card.displayName,
          biome: card.biome,
          continents: card.continents,
          scientificScope: card.scientificScope,
          earthCompleteClaim: card.earthCompleteClaim,
        }
      : undefined,
  };
}

export function buildGeologyExhibit(entry: ArchiveDexEntry, catalog: TemporalEarthMapCatalog | null): GeologyExhibit {
  const units = entry.time?.timeUnitIds ?? [];
  const stratigraphy = buildStratigraphySnapshotHonesty(entry);
  if (!catalog) {
    return {
      catalogLoaded: false,
      intervals: [],
      unmatchedTimeUnitIds: [...units],
      scientificallyUnlockedCount: 0,
      stratigraphy,
    };
  }
  const seen = new Set<string>();
  const intervals: GeologyInterval[] = [];
  const unmatched: string[] = [];
  for (const unit of units) {
    const records = catalog.maps.filter((map) => map.timeUnitIds.includes(unit));
    if (!records.length) unmatched.push(unit);
    for (const map of records) {
      if (seen.has(map.timeGateId)) continue;
      seen.add(map.timeGateId);
      const view = resolveTemporalMapPresentation(map, { catalogIsMockData: catalog.isMockData });
      intervals.push({
        timeGateId: map.timeGateId,
        timeUnitIds: map.timeUnitIds.filter((id) => units.includes(id)),
        oldestMa: map.timeRange.oldestMa,
        youngestMa: map.timeRange.youngestMa,
        paleomapState: view.playerState,
        scientificallyUnlocked: view.scientificallyUnlocked,
        playerTitle: view.playerTitle,
        playerSummary: view.playerSummary,
        ariaLabel: view.ariaLabel,
      });
    }
  }
  intervals.sort((a, b) => b.oldestMa - a.oldestMa);
  return {
    catalogLoaded: true,
    intervals,
    unmatchedTimeUnitIds: unmatched,
    scientificallyUnlockedCount: intervals.filter((i) => i.scientificallyUnlocked).length,
    stratigraphy,
  };
}

function renderStratigraphyHonestyHtml(stratigraphy: StratigraphySnapshotHonesty): string {
  const snapshot = stratigraphy.formationNamesPresent || stratigraphy.geologicPeriodLabelPresent ? 'present' : 'absent';
  return `<p class="uncertainty-note dex-stratigraphy-honesty" data-stratigraphy-snapshot="${snapshot}" data-formations-present="${stratigraphy.formationNamesPresent}" data-geologic-period-present="${stratigraphy.geologicPeriodLabelPresent}">${escapeHtml(stratigraphy.playerNote)}</p>`;
}

function formatMa(value: number): string {
  if (value === 0) return 'present';
  return `${value} Ma`;
}

export function renderHabitatExhibitHtml(entry: ArchiveDexEntry): string {
  const exhibit = buildHabitatExhibit(entry);
  const region = exhibit.region
    ? `<div class="dex-field"><span class="detail-label">Expedition region:</span> <span>${escapeHtml(exhibit.region.displayName)} · biome ${escapeHtml(exhibit.region.biome)}${exhibit.region.continents.length ? ` · ${escapeHtml(exhibit.region.continents.join(', '))}` : ''}</span><p class="uncertainty-note">${escapeHtml(exhibit.region.scientificScope)}</p></div>`
    : '';
  const cues = exhibit.fieldCues.length
    ? `<div class="dex-field"><span class="detail-label">Field habitat cues (authored observation hints):</span><ul class="dex-list">${exhibit.fieldCues.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>`
    : '';
  return `<section class="dex-habitat-exhibit" data-range-claim="${exhibit.rangeClaim}" aria-label="Habitat exhibit">
    <h4>Habitat exhibit</h4>
    <p class="dex-range-claim"><span class="detail-label">Range evidence:</span> <strong>${escapeHtml(exhibit.rangeClaim)}</strong> — ${escapeHtml(exhibit.rangeNote)}</p>
    ${region}
    ${cues}
  </section>`;
}

export function renderGeologyExhibitHtml(entry: ArchiveDexEntry, catalog: TemporalEarthMapCatalog | null): string {
  const exhibit = buildGeologyExhibit(entry, catalog);
  const stratigraphyHtml = renderStratigraphyHonestyHtml(exhibit.stratigraphy);
  if (!exhibit.catalogLoaded) {
    return `<section class="dex-geology-exhibit" data-catalog-loaded="false" aria-label="Geologic time exhibit">
      <h4>Geologic time &amp; paleogeography</h4>
      <p class="uncertainty-note">Time Atlas map catalog not loaded; paleogeography status is unknown and not verified.</p>
      ${stratigraphyHtml}
    </section>`;
  }
  const rows = exhibit.intervals
    .map(
      (i) => `<li data-time-gate="${escapeHtml(i.timeGateId)}" data-paleomap-state="${i.paleomapState}" aria-label="${escapeHtml(i.ariaLabel)}">
        <strong>${escapeHtml(i.timeGateId.replace(/^gate_/, ''))}</strong> · ${formatMa(i.oldestMa)} → ${formatMa(i.youngestMa)}
        · paleomap: <em>${escapeHtml(i.playerTitle)}</em>
      </li>`,
    )
    .join('');
  const unmatched = exhibit.unmatchedTimeUnitIds.length
    ? `<p class="uncertainty-note">No Time Atlas gate for: ${escapeHtml(exhibit.unmatchedTimeUnitIds.join(', '))}.</p>`
    : '';
  return `<section class="dex-geology-exhibit" data-catalog-loaded="true" data-paleomaps-unlocked="${exhibit.scientificallyUnlockedCount}" aria-label="Geologic time exhibit">
    <h4>Geologic time &amp; paleogeography</h4>
    ${rows ? `<ul class="dex-list">${rows}</ul>` : '<p><em>No time units linked in current snapshot.</em></p>'}
    ${unmatched}
    <p class="uncertainty-note">Intervals come from the Time Atlas gate catalog. ${exhibit.scientificallyUnlockedCount}/${exhibit.intervals.length} paleogeographic reconstructions are scientifically unlocked; locked gates draw no coastlines.</p>
    ${stratigraphyHtml}
  </section>`;
}
