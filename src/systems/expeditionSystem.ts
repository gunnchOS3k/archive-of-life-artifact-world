/**
 * Expedition / objective / clue systems — Alpha depth over quest visit/collect.
 */

import type { NotebookEntry, SaveState } from '@/schema';

export type ExpeditionObjectiveType =
  | 'visit_region'
  | 'collect_artifact'
  | 'discover_clue'
  | 'journal_entry';

export interface ExpeditionObjective {
  id: string;
  type: ExpeditionObjectiveType;
  target: string;
  label: string;
}

export interface ExpeditionDef {
  id: string;
  name: string;
  regionId: string;
  biome: string;
  description: string;
  objectives: ExpeditionObjective[];
  clueIds: string[];
  journalPrompt: string;
}

export interface ClueDef {
  id: string;
  expeditionId: string;
  regionId: string;
  title: string;
  text: string;
  unlocksJournal: boolean;
}

export interface ExpeditionProgress {
  expeditionId: string;
  startedAt: number;
  completedObjectiveIds: string[];
  discoveredClueIds: string[];
  completed: boolean;
}

export interface ExpeditionSaveSlice {
  active: string[];
  completed: string[];
  progress: Record<string, ExpeditionProgress>;
  discoveredClueIds: string[];
}

export function createEmptyExpeditionSlice(): ExpeditionSaveSlice {
  return { active: [], completed: [], progress: {}, discoveredClueIds: [] };
}

export function ensureExpeditionSlice(state: SaveState): ExpeditionSaveSlice {
  if (!state.expeditions) {
    state.expeditions = createEmptyExpeditionSlice();
  }
  if (!Array.isArray(state.expeditions.active)) state.expeditions.active = [];
  if (!Array.isArray(state.expeditions.completed)) state.expeditions.completed = [];
  if (!state.expeditions.progress) state.expeditions.progress = {};
  if (!Array.isArray(state.expeditions.discoveredClueIds)) state.expeditions.discoveredClueIds = [];
  return state.expeditions;
}

export function startExpedition(state: SaveState, expedition: ExpeditionDef, now = Date.now()): void {
  const slice = ensureExpeditionSlice(state);
  if (slice.completed.includes(expedition.id) || slice.active.includes(expedition.id)) return;
  slice.active.push(expedition.id);
  slice.progress[expedition.id] = {
    expeditionId: expedition.id,
    startedAt: now,
    completedObjectiveIds: [],
    discoveredClueIds: [],
    completed: false,
  };
}

export function discoverClue(
  state: SaveState,
  clue: ClueDef,
  now = Date.now(),
): NotebookEntry | null {
  const slice = ensureExpeditionSlice(state);
  if (slice.discoveredClueIds.includes(clue.id)) return null;
  slice.discoveredClueIds.push(clue.id);

  const progress = slice.progress[clue.expeditionId];
  if (progress && !progress.discoveredClueIds.includes(clue.id)) {
    progress.discoveredClueIds.push(clue.id);
  }

  // Auto-complete discover_clue objectives
  // (evaluated fully in evaluateExpedition)
  if (!clue.unlocksJournal) return null;

  const entry: NotebookEntry = {
    time: now,
    text: `Clue: ${clue.title} — ${clue.text}`,
    speciesId: '',
    regionId: clue.regionId,
    scientificName: undefined,
  };
  state.notebook.push(entry);
  return entry;
}

export function evaluateExpedition(
  state: SaveState,
  expedition: ExpeditionDef,
): { objectivesDone: string[]; complete: boolean } {
  const slice = ensureExpeditionSlice(state);
  const progress = slice.progress[expedition.id];
  if (!progress) return { objectivesDone: [], complete: false };

  const done: string[] = [];
  for (const obj of expedition.objectives) {
    let ok = false;
    switch (obj.type) {
      case 'visit_region':
        ok = state.player.visitedRegions.includes(obj.target);
        break;
      case 'collect_artifact':
        ok = state.artifacts.some((a) => a.speciesId === obj.target);
        break;
      case 'discover_clue':
        ok = slice.discoveredClueIds.includes(obj.target);
        break;
      case 'journal_entry':
        ok = state.notebook.some((n) => n.text.includes(obj.target) || n.speciesId === obj.target);
        break;
    }
    if (ok) {
      done.push(obj.id);
      if (!progress.completedObjectiveIds.includes(obj.id)) {
        progress.completedObjectiveIds.push(obj.id);
      }
    }
  }

  const complete = expedition.objectives.every((o) => done.includes(o.id));
  if (complete && !progress.completed) {
    progress.completed = true;
    slice.active = slice.active.filter((id) => id !== expedition.id);
    if (!slice.completed.includes(expedition.id)) slice.completed.push(expedition.id);
  }
  return { objectivesDone: done, complete };
}

export function appendExpeditionJournal(
  state: SaveState,
  expedition: ExpeditionDef,
  now = Date.now(),
): NotebookEntry {
  const entry: NotebookEntry = {
    time: now,
    text: `Expedition journal — ${expedition.name}: ${expedition.journalPrompt}`,
    speciesId: '',
    regionId: expedition.regionId,
  };
  state.notebook.push(entry);
  return entry;
}
