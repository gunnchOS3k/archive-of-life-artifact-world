export function checkQuestProgress(state, gameData, event) {
  const updates = [];

  for (const questId of state.quests.active) {
    const quest = gameData.quests.find(q => q.id === questId);
    if (!quest) continue;

    const progress = getQuestProgress(state, quest, gameData);
    if (progress.complete) {
      state.quests.completed.push(questId);
      state.quests.active = state.quests.active.filter(id => id !== questId);
      updates.push({ quest, completed: true });
    }
  }

  return updates;
}

export function getQuestProgress(state, quest, gameData) {
  const objectives = quest.objectives.map(obj => {
    let done = false;

    switch (obj.type) {
      case 'visit_region':
        done = state.player.visitedRegions.includes(obj.target);
        break;
      case 'collect_artifact':
        done = state.artifacts.some(a => a.speciesId === obj.target);
        break;
      case 'collect_count': {
        const target = parseInt(obj.target, 10);
        if (obj.group === 'insect') {
          const insectIds = new Set(
            [...gameData.insects, ...gameData.allSpecies.filter(s => s.group === 'Arachnid')].map(s => s.id)
          );
          const count = state.artifacts.filter(a => insectIds.has(a.speciesId)).length;
          done = count >= target;
        } else if (obj.group === 'extinct') {
          const extinctIds = new Set(gameData.extinct.map(s => s.id));
          const count = state.artifacts.filter(a => extinctIds.has(a.speciesId)).length;
          done = count >= target;
        } else {
          const mammalIds = new Set(gameData.mammals.map(s => s.id));
          const count = state.artifacts.filter(a => mammalIds.has(a.speciesId)).length;
          done = count >= target;
        }
        break;
      }
    }

    return { ...obj, done };
  });

  return {
    objectives,
    complete: objectives.every(o => o.done),
  };
}

export function visitRegion(state, regionId) {
  if (!state.player.visitedRegions.includes(regionId)) {
    state.player.visitedRegions.push(regionId);
    state.stats.regionsExplored++;
  }
  state.player.currentRegion = regionId;
}
