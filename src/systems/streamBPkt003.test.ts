/**
 * STREAM-B-PKT-003 Archive of Life — scientific ingest / Lifeling / expedition / playtest.
 */
import { describe, expect, it } from 'vitest';
import {
  advanceLifelingProgression,
  buildOfflineScientificPack,
  buildPlaytestPacket,
  emitStreamBPkt003Artifacts,
  ingestScientificBatch,
  scoreExpeditionDiversity,
} from './streamBPkt003';

describe('streamBPkt003 scientific ingest', () => {
  it('handles provenance + name conflicts without global claims', () => {
    const report = ingestScientificBatch([
      {
        taxonId: 't1',
        scientificName: 'Panthera leo',
        sourceId: 'col',
        license: 'CC0',
        citation: 'COL',
      },
      {
        taxonId: 't1',
        scientificName: 'Felis leo',
        sourceId: 'gbif',
        license: 'CC BY 4.0',
        citation: 'GBIF',
      },
    ]);
    expect(report.liveClaim).toBe(false);
    expect(report.GLOBAL_DATA_COMPLETE).toBe(false);
    expect(report.ALL_SPECIES_INGESTED).toBe(false);
    expect(report.conflicts.length).toBeGreaterThan(0);
    expect(report.conflicts[0].chosen).toBe('Panthera leo');
    expect(report.provenance.length).toBe(2);
    expect(report.synonymEdges.length).toBeGreaterThan(0);
  });
});

describe('streamBPkt003 offline pack + lifeling + expeditions + playtest', () => {
  it('builds bounded offline scientific pack', () => {
    const pack = buildOfflineScientificPack({
      taxaCount: 3,
      regionCount: 2,
      expeditionCount: 3,
      payload: { sample: true },
    });
    expect(pack.bounded).toBe(true);
    expect(pack.globalComplete).toBe(false);
    expect(pack.liveClaim).toBe(false);
    expect(pack.sha256).toHaveLength(64);
  });

  it('advances Lifeling progression', () => {
    const prog = advanceLifelingProgression([15, 20, 30]);
    expect(prog.progressionOk).toBe(true);
    expect(prog.steps.at(-1)!.level).toBeGreaterThan(prog.steps[0].level);
  });

  it('scores expedition diversity across biomes/objectives', () => {
    const div = scoreExpeditionDiversity([
      {
        id: 'a',
        biome: 'savanna',
        regionId: 'savanna',
        objectives: [{ type: 'visit_region' }, { type: 'observe_species' }],
      },
      {
        id: 'b',
        biome: 'forest',
        regionId: 'forest',
        objectives: [{ type: 'collect_artifact' }, { type: 'discover_clue' }],
      },
      {
        id: 'c',
        biome: 'deep_time',
        regionId: 'carboniferous',
        objectives: [{ type: 'view_time_unit' }, { type: 'scan_taxon' }],
      },
    ]);
    expect(div.diversityOk).toBe(true);
    expect(div.uniqueBiomes.length).toBeGreaterThanOrEqual(2);
  });

  it('playtest packet keeps human/global flags false', () => {
    const p = buildPlaytestPacket();
    expect(p.HUMAN_PLAYTEST_VALIDATED).toBe(false);
    expect(p.GLOBAL_DATA_COMPLETE).toBe(false);
    expect(p.ALL_SPECIES_INGESTED).toBe(false);
    expect(p.scriptedBeats.length).toBeGreaterThanOrEqual(4);
  });

  it('emits stream_b artifacts', () => {
    const state = emitStreamBPkt003Artifacts();
    expect(state.HUMAN_PLAYTEST_VALIDATED).toBe(false);
    expect(state.GLOBAL_DATA_COMPLETE).toBe(false);
    expect(state.ALL_SPECIES_INGESTED).toBe(false);
  });
});
