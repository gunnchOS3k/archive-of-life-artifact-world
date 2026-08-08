/**
 * Beta digital content completeness evaluator.
 * Token: ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL when content systems + Tier R scale path ready.
 * Does NOT claim global live scientific completeness or physical product readiness.
 */

export type BetaSystemId =
  | 'world_regions'
  | 'deep_time'
  | 'field_gameplay'
  | 'companion_divergence'
  | 'scientific_ops'
  | 'tier_r_scale'
  | 'actual_counts'
  | 'source_registry'
  | 'offline_pack'
  | 'synonym_resolution';

export interface BetaSystemCheck {
  id: BetaSystemId;
  present: boolean;
  required: boolean;
  detail: string;
}

export interface BetaDigitalReport {
  snapshotId: string;
  generatedAt: string;
  statusToken:
    | 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL'
    | 'ARCHIVE_BETA_CONTENT_IN_PROGRESS'
    | 'ARCHIVE_BETA_CONTENT_NOT_READY';
  claimLevel: 'beta_digital' | 'none';
  doesNotClaim: string[];
  systems: BetaSystemCheck[];
  requiredMet: boolean;
  actualCounts: {
    unique_taxa: number;
    records_by_source: Record<string, number>;
    synonyms: number;
    conflicts: number;
  };
  floors: {
    regions: { required: number; actual: number; met: boolean };
    encounterTaxa: { required: number; actual: number; met: boolean };
    flagship: { required: number; actual: number; met: boolean };
    tierRBeyondEncounter: { required: true; actual: number; encounter: number; met: boolean };
  };
  honesty: {
    globalCompleteClaim: false;
    fixturesNeverClaimedLive: true;
    liveOnlyWhenQueried: true;
  };
  /** Explicit: Beta never asserts global scientific ingest */
  scientificCoverageClaim: 'none';
  gaps: string[];
}

export interface BetaDigitalInput {
  snapshotId: string;
  systems: Record<BetaSystemId, { present: boolean; detail?: string }>;
  floors: BetaDigitalReport['floors'];
  actualCounts: BetaDigitalReport['actualCounts'];
}

const REQUIRED: BetaSystemId[] = [
  'world_regions',
  'deep_time',
  'field_gameplay',
  'companion_divergence',
  'scientific_ops',
  'tier_r_scale',
  'actual_counts',
  'source_registry',
  'offline_pack',
  'synonym_resolution',
];

export function evaluateBetaDigital(input: BetaDigitalInput): BetaDigitalReport {
  const systems: BetaSystemCheck[] = REQUIRED.map((id) => ({
    id,
    present: input.systems[id]?.present === true,
    required: true,
    detail: input.systems[id]?.detail ?? (input.systems[id]?.present ? 'present' : 'missing'),
  }));

  const floorsMet =
    input.floors.regions.met &&
    input.floors.encounterTaxa.met &&
    input.floors.flagship.met &&
    input.floors.tierRBeyondEncounter.met;

  const requiredMet = REQUIRED.every((id) => systems.find((s) => s.id === id)?.present);

  const gaps: string[] = [];
  for (const s of systems.filter((x) => !x.present)) {
    gaps.push(`Missing Beta system: ${s.id}`);
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
  if (!input.floors.tierRBeyondEncounter.met) {
    gaps.push(
      `Tier R ${input.floors.tierRBeyondEncounter.actual} not beyond encounter ${input.floors.tierRBeyondEncounter.encounter}`,
    );
  }
  if (input.actualCounts.unique_taxa <= 0) {
    gaps.push('actualCounts.unique_taxa is zero');
  }

  let statusToken: BetaDigitalReport['statusToken'] = 'ARCHIVE_BETA_CONTENT_NOT_READY';
  let claimLevel: BetaDigitalReport['claimLevel'] = 'none';
  if (requiredMet && floorsMet) {
    statusToken = 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL';
    claimLevel = 'beta_digital';
  } else if (requiredMet || floorsMet) {
    statusToken = 'ARCHIVE_BETA_CONTENT_IN_PROGRESS';
  }

  return {
    snapshotId: input.snapshotId,
    generatedAt: new Date().toISOString(),
    statusToken,
    claimLevel,
    doesNotClaim: [
      'global live COL/GBIF/PBDB coverage',
      'GLOBAL_DATA_COMPLETE',
      'ALL_SPECIES_INGESTED',
      'physical product / Gate 1 hardware completeness',
      'source-verified production scientific release of all known life',
      'IUCN/authorized-bulk completeness',
    ],
    scientificCoverageClaim: 'none' as const,
    systems,
    requiredMet,
    actualCounts: input.actualCounts,
    floors: input.floors,
    honesty: {
      globalCompleteClaim: false,
      fixturesNeverClaimedLive: true,
      liveOnlyWhenQueried: true,
    },
    gaps,
  };
}
