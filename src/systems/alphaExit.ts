/**
 * Alpha exit evaluator — launch-critical systems per ADR-GAME-AR-001 + product systems.
 * Does NOT claim Beta/RC. Alpha exit digital pass only when launch-critical systems exist
 * and ADR content floors are met. Tier R scale path may exist without global live ingest.
 */

export type AlphaSystemId =
  | 'map_regions'
  | 'deep_time'
  | 'expedition'
  | 'objectives'
  | 'clues'
  | 'observation'
  | 'scanning'
  | 'codex'
  | 'companion'
  | 'offline_pack'
  | 'tier_r_index'
  | 'batch_ingest';

export interface AlphaSystemCheck {
  id: AlphaSystemId;
  present: boolean;
  launchCritical: boolean;
  detail: string;
}

export interface AlphaExitFloors {
  regions: { required: number; actual: number; met: boolean };
  encounterTaxa: { required: number; actual: number; met: boolean };
  flagship: { required: number; actual: number; met: boolean };
  polarRegion: { required: true; present: boolean; met: boolean };
}

export interface AlphaExitReport {
  snapshotId: string;
  generatedAt: string;
  /** Status token — honest */
  statusToken:
    | 'ARCHIVE_ALPHA_EXIT_DIGITAL_PASS'
    | 'ARCHIVE_ALPHA_EXIT_IN_PROGRESS'
    | 'ARCHIVE_ALPHA_EXIT_NOT_READY';
  claimLevel: 'alpha_exit' | 'none';
  /** Explicit non-claims */
  doesNotClaim: string[];
  floors: AlphaExitFloors;
  systems: AlphaSystemCheck[];
  launchCriticalMet: boolean;
  floorsMet: boolean;
  tierR: {
    totalRecords: number;
    bySource: Array<{ source: string; records: number; liveClaim: boolean; mode: string }>;
    scalesBeyondEncounterCatalog: boolean;
  };
  honesty: {
    authoredPublicTaxonomyLiveClaim: false;
    globalLiveIngestClaimed: false;
    fixturesNeverClaimedLive: true;
  };
  gaps: string[];
}

export interface AlphaExitInput {
  snapshotId: string;
  floors: AlphaExitFloors;
  systems: Record<AlphaSystemId, { present: boolean; detail?: string }>;
  tierR: {
    totalRecords: number;
    bySource: Array<{ source: string; records: number; liveClaim: boolean; mode: string }>;
  };
  encounterCatalogSize: number;
}

const LAUNCH_CRITICAL: AlphaSystemId[] = [
  'map_regions',
  'deep_time',
  'expedition',
  'objectives',
  'clues',
  'observation',
  'scanning',
  'codex',
  'companion',
  'offline_pack',
];

export function evaluateAlphaExit(input: AlphaExitInput): AlphaExitReport {
  const systems: AlphaSystemCheck[] = (Object.keys(input.systems) as AlphaSystemId[]).map((id) => ({
    id,
    present: input.systems[id].present,
    launchCritical: LAUNCH_CRITICAL.includes(id),
    detail: input.systems[id].detail ?? (input.systems[id].present ? 'present' : 'missing'),
  }));

  // Ensure all launch-critical ids appear
  for (const id of LAUNCH_CRITICAL) {
    if (!systems.some((s) => s.id === id)) {
      systems.push({
        id,
        present: false,
        launchCritical: true,
        detail: 'missing from input',
      });
    }
  }

  const floorsMet =
    input.floors.regions.met &&
    input.floors.encounterTaxa.met &&
    input.floors.flagship.met &&
    input.floors.polarRegion.met;

  const launchCriticalMet = LAUNCH_CRITICAL.every(
    (id) => systems.find((s) => s.id === id)?.present === true,
  );

  const gaps: string[] = [];
  for (const s of systems.filter((x) => x.launchCritical && !x.present)) {
    gaps.push(`Missing launch-critical system: ${s.id}`);
  }
  if (!input.floors.regions.met) {
    gaps.push(`Regions ${input.floors.regions.actual}/${input.floors.regions.required}`);
  }
  if (!input.floors.encounterTaxa.met) {
    gaps.push(
      `Encounter taxa ${input.floors.encounterTaxa.actual}/${input.floors.encounterTaxa.required}`,
    );
  }
  if (!input.floors.flagship.met) {
    gaps.push(`Flagship ${input.floors.flagship.actual}/${input.floors.flagship.required}`);
  }
  if (!input.floors.polarRegion.met) gaps.push('Polar region missing');
  if (input.tierR.totalRecords <= input.encounterCatalogSize) {
    gaps.push(
      `Tier R index (${input.tierR.totalRecords}) not yet scaled beyond encounter catalog (${input.encounterCatalogSize}) — path exists but import scale pending`,
    );
  }
  const anyLive = input.tierR.bySource.some((s) => s.liveClaim);
  if (!anyLive) {
    gaps.push('No liveClaim ingest yet — authored/fixture only (honest; not global live)');
  }

  let statusToken: AlphaExitReport['statusToken'] = 'ARCHIVE_ALPHA_EXIT_NOT_READY';
  let claimLevel: AlphaExitReport['claimLevel'] = 'none';
  if (launchCriticalMet && floorsMet) {
    statusToken = 'ARCHIVE_ALPHA_EXIT_DIGITAL_PASS';
    claimLevel = 'alpha_exit';
  } else if (launchCriticalMet || floorsMet) {
    statusToken = 'ARCHIVE_ALPHA_EXIT_IN_PROGRESS';
  }

  return {
    snapshotId: input.snapshotId,
    generatedAt: new Date().toISOString(),
    statusToken,
    claimLevel,
    doesNotClaim: [
      'Beta',
      'RC',
      'global live COL/GBIF/PBDB coverage',
      'source-verified production scientific release',
      'complete known-life archive',
    ],
    floors: input.floors,
    systems: systems.sort((a, b) => a.id.localeCompare(b.id)),
    launchCriticalMet,
    floorsMet,
    tierR: {
      totalRecords: input.tierR.totalRecords,
      bySource: input.tierR.bySource,
      scalesBeyondEncounterCatalog: input.tierR.totalRecords > input.encounterCatalogSize,
    },
    honesty: {
      authoredPublicTaxonomyLiveClaim: false,
      globalLiveIngestClaimed: false,
      fixturesNeverClaimedLive: true,
    },
    gaps,
  };
}
