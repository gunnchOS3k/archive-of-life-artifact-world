/**
 * Launch-campaign pacing / tutorial density — finite LAUNCH_CAMPAIGN path.
 * Does not claim global species coverage.
 * Wired into Game.ts — beats advance from real expedition events.
 */

export type PacingBeatId =
  | 'title_to_onboarding'
  | 'onboarding_to_first_region'
  | 'first_sighting'
  | 'first_observation_loop'
  | 'provenance_notebook'
  | 'dex_and_companion'
  | 'multi_region_era'
  | 'finale_return'
  | 'credits_postgame'
  | 'achievement_browser';

export interface PacingBeat {
  id: PacingBeatId;
  label: string;
  suggestedSeconds: number;
  done: boolean;
}

export const LAUNCH_PACING_BEATS: readonly Omit<PacingBeat, 'done'>[] = [
  { id: 'title_to_onboarding', label: 'Name your explorer and meet Relic', suggestedSeconds: 45 },
  { id: 'onboarding_to_first_region', label: 'Leave the museum for a field region', suggestedSeconds: 60 },
  { id: 'first_sighting', label: 'Approach a living subject ethically', suggestedSeconds: 40 },
  { id: 'first_observation_loop', label: 'Hold observation until the artifact files', suggestedSeconds: 90 },
  { id: 'provenance_notebook', label: 'Confirm source/license/citation on the notebook', suggestedSeconds: 40 },
  { id: 'dex_and_companion', label: 'Open ArchiveDex and customize Lifeling', suggestedSeconds: 75 },
  { id: 'multi_region_era', label: 'Visit more regions and shift Time Atlas eras', suggestedSeconds: 180 },
  { id: 'finale_return', label: 'Acknowledge the launch finale at the hub', suggestedSeconds: 45 },
  { id: 'credits_postgame', label: 'Credits then continue the same save', suggestedSeconds: 30 },
  { id: 'achievement_browser', label: 'Review launch achievements (not global coverage)', suggestedSeconds: 40 },
];

export function buildPacingProgress(doneIds: Iterable<PacingBeatId>): PacingBeat[] {
  const done = new Set(doneIds);
  return LAUNCH_PACING_BEATS.map((b) => ({ ...b, done: done.has(b.id) }));
}

export function pacingCompletionPercent(beats: PacingBeat[]): number {
  if (!beats.length) return 0;
  return Math.round((100 * beats.filter((b) => b.done).length) / beats.length);
}

export function estimatedLaunchMinutes(): number {
  return Math.ceil(LAUNCH_PACING_BEATS.reduce((sum, b) => sum + b.suggestedSeconds, 0) / 60);
}

/** Live tracker used by Game — marks beats from real expedition events. */
export class LaunchPacingTracker {
  private readonly done = new Set<PacingBeatId>();

  mark(id: PacingBeatId): boolean {
    if (this.done.has(id)) return false;
    this.done.add(id);
    return true;
  }

  has(id: PacingBeatId): boolean {
    return this.done.has(id);
  }

  progress(): PacingBeat[] {
    return buildPacingProgress(this.done);
  }

  percent(): number {
    return pacingCompletionPercent(this.progress());
  }

  doneIds(): PacingBeatId[] {
    return [...this.done];
  }

  clear(): void {
    this.done.clear();
  }
}
