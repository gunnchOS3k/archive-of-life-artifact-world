/**
 * Alpha exit + batch ingest + Tier R + world systems tests.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { BatchSnapshotIngest } from '@/services/ingestion/BatchSnapshotIngest';
import { CheckpointStore } from '@/services/ingestion/checkpointStore';
import { dedupRecords } from '@/services/ingestion/dedup';
import { validateIngestedRecord } from '@/services/ingestion/validateRecord';
import { TierRRecordIndex } from '@/coverage/TierRRecordIndex';
import { evaluateAlphaExit } from '@/systems/alphaExit';
import { buildOfflinePackManifest, offlinePackReady } from '@/systems/offlinePack';
import { recordObservation } from '@/systems/observationSystem';
import { scanTaxon } from '@/systems/scanningSystem';
import { viewTimeUnit, analyzePeriod, setActiveTimeUnit } from '@/systems/deepTimeSystem';
import { buildCodexProgress, markCodexDocumented } from '@/systems/codexSystem';
import { createDefaultSave } from '@/systems/saveSystem';
import {
  evaluateExpedition,
  startExpedition,
  type ExpeditionDef,
} from '@/systems/expeditionSystem';

const FIX = join(process.cwd(), 'public/data/fixtures/ingest');
const DATA = join(process.cwd(), 'public/data/bundles');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('BatchSnapshotIngest — fixture honesty', () => {
  it('imports fixture pages with resume/dedup/validation and liveClaim=false', async () => {
    const col = loadJson<{ entries: Array<Record<string, unknown>> }>(join(FIX, 'col_batch.json'));
    const gbif = loadJson<{ records: Array<Record<string, unknown>> }>(join(FIX, 'gbif_batch.json'));
    const pbdb = loadJson<{ records: Array<Record<string, unknown>> }>(join(FIX, 'pbdb_batch.json'));

    const store = new CheckpointStore();
    const batch = new BatchSnapshotIngest({ fixtureOnly: true }, store);
    batch.setFixtures({
      col: { entries: col.entries },
      gbif: { records: gbif.records },
      pbdb: { records: pbdb.records },
    });

    const result = await batch.run({
      snapshotId: 'test-fixture',
      snapshotVersion: '1',
      useFixture: true,
      resume: false,
      crossSourceNameDedup: true,
      queries: {
        col: { limit: 50, useFixture: true },
        gbif: { limit: 40, useFixture: true },
        pbdb: { limit: 30, useFixture: true },
      },
    });

    expect(result.anyLiveClaim).toBe(false);
    expect(result.totals.imported).toBeGreaterThan(50);
    for (const s of result.bySource) {
      expect(s.liveClaim).toBe(false);
      expect(s.mode).toBe('fixture');
      expect(s.records.every((r) => r.provenance.isLive === false)).toBe(true);
      expect(s.checkpoint?.liveClaim).toBe(false);
    }

    // Resume advances checkpoint
    expect(store.list().length).toBe(3);

    const index = new TierRRecordIndex('test-fixture', '1');
    const { added } = index.importRecords(result.allRecords);
    expect(added).toBe(result.allRecords.length);
    expect(index.size).toBeGreaterThan(50);
    const report = index.report();
    expect(report.honesty.fixturesNeverClaimedLive).toBe(true);
    expect(report.bySource.every((s) => s.liveClaim === false)).toBe(true);
  });

  it('dedup + validate reject honesty violations', () => {
    const bad = {
      scientificName: 'Panthera leo',
      provenance: {
        source: 'col' as const,
        sourceRecordId: '1',
        license: 'COL terms of use',
        attribution: 'x',
        citation: 'y',
        retrievedAt: new Date().toISOString(),
        mode: 'fixture' as const,
        isLive: true,
        isFixture: true,
      },
      confidence: 'observed' as const,
      cacheStatus: 'fixture' as const,
      payload: {},
    };
    expect(validateIngestedRecord(bad).ok).toBe(false);

    const a = { ...bad, provenance: { ...bad.provenance, isLive: false } };
    const b = { ...a, provenance: { ...a.provenance, sourceRecordId: '1' } };
    const { stats } = dedupRecords([a, b]);
    expect(stats.droppedById).toBe(1);
  });
});

describe('Tier R index scales beyond encounter catalog', () => {
  it('can hold more records than authored E catalog when fixtures imported', async () => {
    const col = loadJson<{ entries: Array<Record<string, unknown>> }>(join(FIX, 'col_batch.json'));
    const gbif = loadJson<{ records: Array<Record<string, unknown>> }>(join(FIX, 'gbif_batch.json'));
    const pbdb = loadJson<{ records: Array<Record<string, unknown>> }>(join(FIX, 'pbdb_batch.json'));
    const enc = loadJson<{ species: unknown[] }>(join(DATA, 'encounter-taxa.json'));

    const batch = new BatchSnapshotIngest({ fixtureOnly: true });
    batch.setFixtures({
      col: { entries: col.entries },
      gbif: { records: gbif.records },
      pbdb: { records: pbdb.records },
    });
    const result = await batch.run({
      snapshotId: 'scale-test',
      snapshotVersion: '1',
      useFixture: true,
      queries: {
        col: { limit: 10_000, useFixture: true },
        gbif: { limit: 10_000, useFixture: true },
        pbdb: { limit: 10_000, useFixture: true },
      },
    });
    const index = new TierRRecordIndex('scale-test', '1');
    index.importRecords(result.allRecords);
    expect(index.size).toBeGreaterThan(enc.species.length);
    expect(index.report().totalRecords).toBeGreaterThan(167);
  });
});

describe('Alpha exit world systems', () => {
  it('observation, scanning, deep time, codex, offline pack work together', () => {
    const state = createDefaultSave();
    recordObservation(state, {
      speciesId: 'panthera_leo',
      scientificName: 'Panthera leo',
      commonName: 'Lion',
      regionId: 'savanna',
      ethical: true,
      patienceScore: 100,
      provenanceCitations: [
        {
          providerId: 'col',
          license: 'COL terms of use',
          citation: 'Catalogue of Life',
        },
      ],
    });
    expect(state.companion.observationCount).toBeGreaterThan(0);

    viewTimeUnit(state, { id: 'maastrichtian', label: 'Maastrichtian', gateId: 'gate_kpg' });
    analyzePeriod(state, 'maastrichtian');
    setActiveTimeUnit(state, 'maastrichtian');
    expect(state.timeAtlas?.viewedTimeUnits).toContain('maastrichtian');

    markCodexDocumented(state, 'panthera_leo', 'Panthera leo');
    const codex = buildCodexProgress(state, [
      { id: 'panthera_leo', scientificName: 'Panthera leo' },
      { id: 'ursus_maritimus', scientificName: 'Ursus maritimus' },
    ]);
    expect(codex.documentedCount).toBeGreaterThanOrEqual(1);

    const scan = scanTaxon(
      'Panthera leo',
      [{ id: 'panthera_leo', scientificName: 'Panthera leo' }],
      null,
      state,
    );
    expect(scan.matched).toBe(true);
    expect(scan.liveClaim).toBe(false);

    const pack = buildOfflinePackManifest({
      packId: 'test',
      snapshotId: 's',
      regionCount: 12,
      encounterCount: 120,
      flagshipCount: 24,
      tierRRecordCount: 200,
    });
    expect(pack.liveClaim).toBe(false);
    expect(offlinePackReady(pack).ready).toBe(true);
  });

  it('expedition objectives support observe/scan/time', () => {
    const state = createDefaultSave();
    const exp: ExpeditionDef = {
      id: 'exp_test',
      name: 'Test',
      regionId: 'savanna',
      biome: 'savanna',
      description: 't',
      clueIds: [],
      journalPrompt: 'j',
      objectives: [
        { id: 'o1', type: 'visit_region', target: 'savanna', label: 'visit' },
        { id: 'o2', type: 'observe_species', target: 'panthera_leo', label: 'observe' },
        { id: 'o3', type: 'scan_taxon', target: 'panthera_leo', label: 'scan' },
        { id: 'o4', type: 'view_time_unit', target: 'holocene', label: 'time' },
      ],
    };
    startExpedition(state, exp);
    if (!state.player.visitedRegions.includes('savanna')) state.player.visitedRegions.push('savanna');
    recordObservation(state, {
      speciesId: 'panthera_leo',
      scientificName: 'Panthera leo',
      regionId: 'savanna',
      ethical: true,
      patienceScore: 80,
    });
    scanTaxon('Panthera leo', [{ id: 'panthera_leo', scientificName: 'Panthera leo' }], null, state);
    viewTimeUnit(state, { id: 'holocene', label: 'Holocene' });
    const result = evaluateExpedition(state, exp);
    expect(result.complete).toBe(true);
  });

  it('evaluateAlphaExit issues DIGITAL_PASS only when systems+floors met; never Beta/RC', () => {
    const report = evaluateAlphaExit({
      snapshotId: 't',
      encounterCatalogSize: 167,
      floors: {
        regions: { required: 12, actual: 12, met: true },
        encounterTaxa: { required: 120, actual: 167, met: true },
        flagship: { required: 24, actual: 24, met: true },
        polarRegion: { required: true, present: true, met: true },
      },
      systems: {
        map_regions: { present: true },
        deep_time: { present: true },
        expedition: { present: true },
        objectives: { present: true },
        clues: { present: true },
        observation: { present: true },
        scanning: { present: true },
        codex: { present: true },
        companion: { present: true },
        offline_pack: { present: true },
        tier_r_index: { present: true },
        batch_ingest: { present: true },
      },
      tierR: {
        totalRecords: 300,
        bySource: [
          { source: 'col', records: 200, liveClaim: false, mode: 'fixture' },
          { source: 'gbif', records: 80, liveClaim: false, mode: 'fixture' },
          { source: 'pbdb', records: 20, liveClaim: false, mode: 'fixture' },
        ],
      },
    });
    expect(report.statusToken).toBe('ARCHIVE_ALPHA_EXIT_DIGITAL_PASS');
    expect(report.claimLevel).toBe('alpha_exit');
    expect(report.doesNotClaim).toContain('Beta');
    expect(report.doesNotClaim).toContain('RC');
    expect(report.honesty.globalLiveIngestClaimed).toBe(false);
    expect(report.tierR.scalesBeyondEncounterCatalog).toBe(true);
  });
});

describe('ADR content floors still hold', () => {
  it('12 regions, ≥120 E, 24 F, polar', () => {
    const regions = loadJson<Array<{ id: string }>>(join(DATA, 'regions.json'));
    const heroes = loadJson<{ species: unknown[] }>(join(DATA, 'hero-species.json'));
    const enc = loadJson<{ species: Array<{ programTier: string }> }>(join(DATA, 'encounter-taxa.json'));
    expect(regions.length).toBeGreaterThanOrEqual(12);
    expect(regions.some((r) => r.id === 'polar_ice')).toBe(true);
    expect(heroes.species.length).toBeGreaterThanOrEqual(24);
    expect(enc.species.filter((s) => s.programTier === 'E_Encounter').length).toBeGreaterThanOrEqual(
      120,
    );
  });
});
