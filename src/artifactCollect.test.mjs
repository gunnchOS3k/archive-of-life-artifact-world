import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recordCollectedArtifact, restoreCollectedArtifacts } from './systems/artifactRecord.ts';
import { evaluateExpedition, startExpedition } from './systems/expeditionSystem.ts';

function freshState() {
  return {
    player: { currentRegion: 'museum', visitedRegions: ['museum'] },
    artifacts: [],
    notebook: [],
    stats: { artifactsCollected: 0, speciesDocumented: 0, regionsExplored: 1 },
    expeditions: { active: [], completed: [], progress: {}, discoveredClueIds: [] },
  };
}

describe('artifact collect and restore', () => {
  it('records a game-authored find and completes that objective', () => {
    const state = freshState();
    const expedition = {
      id: 'exp-sample',
      name: 'Museum sample',
      regionId: 'museum',
      biome: 'museum',
      description: 'Collect the labeled sample.',
      objectives: [{ id: 'obj-collect', type: 'collect_artifact', target: 'sample-beetle', label: 'Collect the sample' }],
      clueIds: [],
      journalPrompt: 'What did you collect?',
    };
    startExpedition(state, expedition, 10);
    const recorded = recordCollectedArtifact(state, {
      id: 'sample-beetle',
      commonName: 'Sample beetle',
      scientificName: 'Sampleus beetleus',
      artifactTypes: ['observation'],
    }, 11);
    assert.equal(recorded.success, true);
    assert.equal(recorded.artifact.scientificVerification, false);
    assert.equal(recorded.artifact.provenance, 'game_authored');
    const again = recordCollectedArtifact(state, {
      id: 'sample-beetle',
      artifactTypes: ['observation'],
    }, 12);
    assert.equal(again.success, false);
    const result = evaluateExpedition(state, expedition);
    assert.equal(result.complete, true);
  });

  it('restores a saved find without scientific verification', () => {
    const restored = restoreCollectedArtifacts([
      {
        speciesId: 'sample-beetle',
        scientificVerification: true,
        provenance: 'field_measurement',
      },
      { name: 'not-an-artifact' },
    ]);
    assert.equal(restored.length, 1);
    assert.equal(restored[0].scientificVerification, false);
    assert.equal(restored[0].provenance, 'game_authored');
  });
});