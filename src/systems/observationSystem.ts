/**
 * Observation system — ethical wildlife observation progress beyond the minigame UI.
 */

import type { NotebookEntry, NotebookProvenanceCite, SaveState } from '@/schema';
import type { LifelingTrait } from '@/schema/trait';
import { applyModularObservation, type CompanionModuleDef } from '@/systems/companionModules';
import { applyObservationProgress } from '@/systems/companionProgression';

export interface ObservationEvent {
  speciesId: string;
  scientificName: string;
  commonName?: string;
  regionId: string;
  ethical: true;
  patienceScore: number;
  timePeriodId?: string | null;
  provenanceCitations?: NotebookProvenanceCite[];
  traits?: LifelingTrait[];
  modules?: CompanionModuleDef[];
  previouslyObserved?: string[];
}

export interface ObservationResult {
  notebookEntry: NotebookEntry;
  companionXpGained: number;
  documented: boolean;
}

export function ensureObservationStats(state: SaveState): void {
  if (!state.stats) {
    state.stats = { artifactsCollected: 0, speciesDocumented: 0, regionsExplored: 0 };
  }
}

export function recordObservation(
  state: SaveState,
  event: ObservationEvent,
  now = Date.now(),
): ObservationResult {
  ensureObservationStats(state);

  const already = state.notebook.some(
    (n) => n.speciesId === event.speciesId && n.text.startsWith('Observed'),
  );

  const entry: NotebookEntry = {
    time: now,
    text: `Observed ${event.commonName ?? event.scientificName} (${event.scientificName}) ethically — patience ${Math.round(event.patienceScore)}.`,
    speciesId: event.speciesId,
    scientificName: event.scientificName,
    regionId: event.regionId,
    timePeriodId: event.timePeriodId ?? null,
    provenanceCitations: event.provenanceCitations,
  };
  state.notebook.push(entry);

  if (!already) {
    state.stats.speciesDocumented += 1;
  }

  const xpBefore = state.companion.xp ?? 0;
  applyObservationProgress(state.companion, {
    kind: 'observe',
    speciesId: event.speciesId,
    traits: [],
  });

  if (event.modules?.length) {
    applyModularObservation(state.companion, {
      kind: 'observe',
      speciesId: event.speciesId,
      traits: event.traits ?? [],
      modules: event.modules,
      previouslyObserved: event.previouslyObserved ?? [],
      visitedRegions: state.player.visitedRegions,
    });
  }

  return {
    notebookEntry: entry,
    companionXpGained: (state.companion.xp ?? 0) - xpBefore,
    documented: !already,
  };
}

export function observationCount(state: SaveState): number {
  return state.companion.observationCount ?? 0;
}
