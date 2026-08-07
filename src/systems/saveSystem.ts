import type { SaveState } from '@/schema';
import { ensureCompanionProgressFields } from '@/systems/companionProgression';
import { speciesCache } from '@/services/IndexedDBCache';
import { track } from '@/systems/telemetry';

const SAVE_KEY = 'archive_of_life_save';
const SAVE_BACKUP_KEY = 'save_state';
export const SAVE_VERSION = 3;

export function createDefaultSave(): SaveState {
  return {
    version: SAVE_VERSION,
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
      level: 1,
      xp: 0,
      observationCount: 0,
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
    timeAtlas: {
      viewedTimeUnits: [],
      viewedGates: [],
      analyzedPeriods: [],
      activeTimeUnitId: null,
    },
    timestamp: Date.now(),
  };
}

function migrateSave(raw: Partial<SaveState>): SaveState {
  const defaults = createDefaultSave();
  const merged: SaveState = {
    ...defaults,
    ...raw,
    version: SAVE_VERSION,
    player: { ...defaults.player, ...(raw.player ?? {}) },
    quests: { ...defaults.quests, ...(raw.quests ?? {}) },
    companion: ensureCompanionProgressFields({
      ...defaults.companion,
      ...(raw.companion ?? {}),
    }),
    stats: { ...defaults.stats, ...(raw.stats ?? {}) },
    earthLayers: raw.earthLayers ?? defaults.earthLayers,
    timeAtlas: {
      ...defaults.timeAtlas,
      ...(raw.timeAtlas ?? {}),
      activeTimeUnitId: raw.timeAtlas?.activeTimeUnitId ?? null,
    },
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts : [],
    notebook: Array.isArray(raw.notebook) ? raw.notebook : [],
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
  };
  return merged;
}

export function validateSave(state: unknown): state is SaveState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Partial<SaveState>;
  return (
    !!s.player &&
    typeof s.player.currentRegion === 'string' &&
    Array.isArray(s.artifacts) &&
    Array.isArray(s.notebook) &&
    !!s.companion &&
    !!s.quests &&
    !!s.stats
  );
}

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    if (!validateSave({ ...createDefaultSave(), ...parsed })) return null;
    const save = migrateSave(parsed);
    track('load', { region: save.player.currentRegion, version: save.version });
    return save;
  } catch {
    return null;
  }
}

/** Async load: localStorage first, then IndexedDB offline backup. */
export async function loadSaveAsync(): Promise<SaveState | null> {
  const local = loadSave();
  if (local) return local;
  try {
    const backup = await speciesCache.getBundle<SaveState>(SAVE_BACKUP_KEY);
    if (backup && validateSave(backup)) {
      const migrated = migrateSave(backup);
      // Rehydrate localStorage for subsequent sync reads
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
      } catch {
        /* ignore */
      }
      track('load', { region: migrated.player.currentRegion, version: migrated.version, source: 'idb' });
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveGame(state: SaveState): void {
  const data = serializeSave(state);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* quota — still try IndexedDB below */
  }
  void speciesCache.setBundle(SAVE_BACKUP_KEY, `save-v${SAVE_VERSION}`, data).catch(() => {
    /* offline cache optional */
  });
  track('save', {
    region: data.player.currentRegion,
    artifacts: data.stats.artifactsCollected,
    companionLevel: data.companion.level ?? 1,
  });
}

export function serializeSave(state: SaveState): SaveState {
  ensureCompanionProgressFields(state.companion);
  return {
    version: SAVE_VERSION,
    player: state.player,
    artifacts: state.artifacts,
    notebook: state.notebook,
    quests: state.quests,
    companion: state.companion,
    stats: state.stats,
    earthLayers: state.earthLayers ?? { viewedTabs: [], analyzedRegions: [] },
    timeAtlas: {
      viewedTimeUnits: state.timeAtlas?.viewedTimeUnits ?? [],
      viewedGates: state.timeAtlas?.viewedGates ?? [],
      analyzedPeriods: state.timeAtlas?.analyzedPeriods ?? [],
      activeTimeUnitId: state.timeAtlas?.activeTimeUnitId ?? null,
    },
    timestamp: Date.now(),
  };
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
  void speciesCache.deleteBundle(SAVE_BACKUP_KEY);
}

export async function exportSaveJson(state: SaveState): Promise<string> {
  return JSON.stringify(serializeSave(state), null, 2);
}

export function importSaveJson(json: string): SaveState | null {
  try {
    const parsed = JSON.parse(json) as Partial<SaveState>;
    if (!validateSave({ ...createDefaultSave(), ...parsed })) return null;
    return migrateSave(parsed);
  } catch {
    return null;
  }
}
