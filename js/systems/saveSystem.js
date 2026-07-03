const SAVE_KEY = 'archive_of_life_save';

export function createDefaultSave() {
  return {
    version: 1,
    player: {
      x: 400,
      y: 300,
      currentRegion: 'museum',
      visitedRegions: ['museum'],
    },
    artifacts: [],
    notebook: [],
    quests: {
      active: ['quest_savanna_intro', 'quest_forest_tracks', 'quest_wetland_life', 'quest_insect_world', 'quest_fossil_dig', 'quest_coastal_watch', 'quest_archive_wing'],
      completed: [],
    },
    companion: {
      name: 'Relic',
      bodyColor: '#7EC8A3',
      equippedTraits: [],
      unlockedTraits: ['celebrate_emote'],
      bond: 0,
    },
    stats: {
      artifactsCollected: 0,
      speciesDocumented: 0,
      regionsExplored: 1,
    },
    timestamp: Date.now(),
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    return { ...createDefaultSave(), ...save };
  } catch {
    return null;
  }
}

export function saveGame(state) {
  const data = {
    version: 1,
    player: state.player,
    artifacts: state.artifacts,
    notebook: state.notebook,
    quests: state.quests,
    companion: state.companion,
    stats: state.stats,
    timestamp: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
