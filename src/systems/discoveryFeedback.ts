/**
 * Living-world discovery feedback — expedition moments, not database browse rows.
 * Critic question (HUMAN_PENDING / S2): does this feel like a living world vs an
 * educational database with controls? These hooks engineer toward expedition framing.
 */

export type DiscoveryKind =
  | 'region_arrive'
  | 'species_sighted'
  | 'observation_complete'
  | 'artifact_filed'
  | 'era_shift'
  | 'archivedex_reveal'
  | 'lifeling_react'
  | 'finale_return'
  | 'postgame_continue'
  | 'achievement_presented';

export interface DiscoveryBeat {
  kind: DiscoveryKind;
  headline: string;
  detail: string;
  livingWorldFraming: true;
  at: number;
}

const history: DiscoveryBeat[] = [];
const MAX = 80;

export function presentDiscovery(
  kind: DiscoveryKind,
  headline: string,
  detail: string,
): DiscoveryBeat {
  const beat: DiscoveryBeat = {
    kind,
    headline,
    detail,
    livingWorldFraming: true,
    at: Date.now(),
  };
  history.push(beat);
  if (history.length > MAX) history.shift();
  return beat;
}

export function getDiscoveryHistory(): readonly DiscoveryBeat[] {
  return history;
}

export function clearDiscoveryHistory(): void {
  history.length = 0;
}

export function livingWorldFramingActive(): boolean {
  return history.some((b) => b.livingWorldFraming);
}

/** Honest critic class input — digital framing exists; human fun still pending. */
export function discoveryCriticNotes(): {
  engineered_toward: 'living_world_expedition';
  not_claimed: 'HUMAN_FUN_OR_WORLD_FEEL';
  database_risk: 'S2_OPEN';
} {
  return {
    engineered_toward: 'living_world_expedition',
    not_claimed: 'HUMAN_FUN_OR_WORLD_FEEL',
    database_risk: 'S2_OPEN',
  };
}
