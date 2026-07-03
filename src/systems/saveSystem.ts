import type { SaveState } from '@/schema';

const SAVE_KEY = 'archive_of_life_save';

export function createDefaultSave(): SaveState {
  return {
    version: 2,
    player: {
      x: 400,
      y: 300,
      currentRegion: 'museum',
      visitedRegions: ['museum'],
    },
    artifacts: [],
    notebook: [],
    quests: {
      active: [
        'quest_savanna_intro',
        'quest_forest_tracks',
        'quest_wetland_life',
        'quest_insect_world',
        'quest_fossil_dig',
        'quest_coastal_watch',
        'quest_archive_wing',
        'quest_nasa_pollinators',
        'quest_nasa_fire_range',
        'quest_nasa_ocean_bloom',
      ],
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
    earthLayers: {
      viewedTabs: [],
      analyzedRegions: [],
    },
    timestamp: Date.now(),
  };
}

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as Partial<SaveState>;
    const defaults = createDefaultSave();
    return {
      ...defaults,
      ...save,
      earthLayers: save.earthLayers ?? defaults.earthLayers,
    };
  } catch {
    return null;
  }
}

export function saveGame(state: SaveState): void {
  const data: SaveState = {
    version: 2,
    player: state.player,
    artifacts: state.artifacts,
    notebook: state.notebook,
    quests: state.quests,
    companion: state.companion,
    stats: state.stats,
    earthLayers: state.earthLayers ?? { viewedTabs: [], analyzedRegions: [] },
    timestamp: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
