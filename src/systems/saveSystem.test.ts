import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultSave,
  deleteSave,
  hasSave,
  importSaveJson,
  loadSave,
  saveGame,
  serializeSave,
  validateSave,
  SAVE_VERSION,
} from '@/systems/saveSystem';
import { collectArtifact } from '@/systems/artifactSystem';
import type { PlayableSpecies } from '@/services/DataCatalogService';

const species: PlayableSpecies = {
  id: 'panthera_leo',
  commonName: 'Lion',
  scientificName: 'Panthera leo',
  group: 'Mammal',
  family: 'Felidae',
  conservationStatus: 'Vulnerable',
  artifactTypes: ['track_cast'],
  region: 'savanna',
  questType: 'observation',
  dangerLevel: 5,
  ethicalInteraction: 'observe_from_distance',
  timeRange: 'Present',
  habitats: ['savanna'],
  diet: '',
  activity: '',
  size: '',
  behavior: '',
  learningTopics: [],
  funFacts: [],
  whyItMatters: '',
  timeUnitIds: ['holocene'],
  provenance: [
    {
      source: 'catalogue_of_life',
      sourceVersion: 'fixture',
      sourceRecordId: 'COL-1',
      license: 'CC0-1.0',
      citation: 'COL fixture Lion',
      citationRequired: true,
      retrievedAt: '2026-08-07T00:00:00.000Z',
      lastUpdated: '2026-08-07T00:00:00.000Z',
      verificationStatus: 'mock_sample',
      isMockData: true,
    },
  ],
};

describe('saveSystem + journal provenance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates, saves, loads, and migrates save state', () => {
    const state = createDefaultSave();
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.companion.level).toBe(1);
    expect(state.timeAtlas.activeTimeUnitId).toBeNull();
    expect(validateSave(state)).toBe(true);
    saveGame(state);
    expect(hasSave()).toBe(true);
    const loaded = loadSave();
    expect(loaded?.player.currentRegion).toBe('museum');
    expect(loaded?.companion.xp).toBe(0);
    deleteSave();
    expect(hasSave()).toBe(false);
  });

  it('round-trips serialize/import and deepens journal with provenance citations', () => {
    const state = createDefaultSave();
    state.player.currentRegion = 'savanna';
    state.timeAtlas.activeTimeUnitId = 'holocene';
    const result = collectArtifact(state, species, [], { timePeriodId: 'holocene' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(state.notebook[0].provenanceCitations?.length).toBeGreaterThan(0);
    expect(state.notebook[0].text).toMatch(/Provenance/);
    expect(state.notebook[0].provenanceCitations![0].license).toBe('CC0-1.0');
    expect(state.companion.observationCount).toBe(1);

    const json = JSON.stringify(serializeSave(state));
    const imported = importSaveJson(json);
    expect(imported?.artifacts).toHaveLength(1);
    expect(imported?.notebook[0].scientificName).toBe('Panthera leo');
  });
});
