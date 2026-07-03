import type { SaveState, Quest, SpeciesIndexEntry } from '@/schema';

export interface QuestProgress {
  objectives: Array<Quest['objectives'][0] & { done: boolean }>;
  complete: boolean;
}

export function checkQuestProgress(
  state: SaveState,
  quests: Quest[],
  indexEntries: SpeciesIndexEntry[]
) {
  const updates: Array<{ quest: Quest; completed: boolean }> = [];

  for (const questId of [...state.quests.active]) {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) continue;

    const progress = getQuestProgress(state, quest, indexEntries);
    if (progress.complete) {
      state.quests.completed.push(questId);
      state.quests.active = state.quests.active.filter((id) => id !== questId);
      updates.push({ quest, completed: true });
    }
  }

  return updates;
}

export function getQuestProgress(
  state: SaveState,
  quest: Quest,
  indexEntries: SpeciesIndexEntry[]
): QuestProgress {
  const objectives = quest.objectives.map((obj) => {
    let done = false;

    switch (obj.type) {
      case 'visit_region':
        done = state.player.visitedRegions.includes(obj.target);
        break;
      case 'collect_artifact':
        done = state.artifacts.some((a) => a.speciesId === obj.target);
        break;
      case 'collect_count': {
        const target = parseInt(obj.target, 10);
        let ids: Set<string>;
        if (obj.group === 'insect') {
          ids = new Set(
            indexEntries.filter((e) => e.group === 'Insect' || e.group === 'Arachnid').map((e) => e.id)
          );
        } else if (obj.group === 'extinct') {
          ids = new Set(indexEntries.filter((e) => e.isExtinct).map((e) => e.id));
        } else {
          ids = new Set(indexEntries.filter((e) => e.group === 'Mammal').map((e) => e.id));
        }
        const count = state.artifacts.filter((a) => ids.has(a.speciesId)).length;
        done = count >= target;
        break;
      }
      case 'view_earth_tab':
        done = state.earthLayers?.viewedTabs?.includes(obj.target) ?? false;
        break;
      case 'analyze_earth_region': {
        const prefix = `${obj.target}:`;
        done = state.earthLayers?.analyzedRegions?.some((r) => r.startsWith(prefix)) ?? false;
        break;
      }
    }

    return { ...obj, done };
  });

  return {
    objectives,
    complete: objectives.every((o) => o.done),
  };
}

export function visitRegion(state: SaveState, regionId: string): void {
  if (!state.player.visitedRegions.includes(regionId)) {
    state.player.visitedRegions.push(regionId);
    state.stats.regionsExplored++;
  }
  state.player.currentRegion = regionId;
}
