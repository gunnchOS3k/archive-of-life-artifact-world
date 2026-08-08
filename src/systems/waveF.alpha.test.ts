/**
 * Wave F — provenance honesty, no invented taxa, companion divergence, content floors.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ScientificIngestionService } from '@/services/ingestion/ScientificIngestionService';
import { assertRealTaxonName } from '@/services/providers/provenanceAdapters';
import {
  applyModularObservation,
  companionPathsDiverge,
  evaluateCompanionModules,
  serializeModuleFingerprint,
  type CompanionModuleDef,
} from '@/systems/companionModules';
import {
  discoverClue,
  evaluateExpedition,
  startExpedition,
  type ClueDef,
  type ExpeditionDef,
} from '@/systems/expeditionSystem';
import { createDefaultSave } from '@/systems/saveSystem';
import { buildTierCoverageReport } from '@/coverage/TierCoverageReport';
import type { CompanionState } from '@/schema';
import { computeBackoff, RateLimiter } from '@/services/ingestion/httpClient';

const DATA = join(process.cwd(), 'public/data/bundles');

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), 'utf8')) as T;
}

const MODULES: CompanionModuleDef[] = loadJson<{ modules: CompanionModuleDef[] }>(
  'companion-modules.json',
).modules;

function companion(): CompanionState {
  return {
    name: 'Relic',
    bodyColor: '#7EC8A3',
    equippedTraits: [],
    unlockedTraits: [],
    bond: 0,
    level: 1,
    xp: 0,
    observationCount: 0,
  };
}

describe('Wave F Alpha — content floors', () => {
  it('has ≥12 regions including polar_ice', () => {
    const regions = loadJson<Array<{ id: string; biome: string }>>('regions.json');
    expect(regions.length).toBeGreaterThanOrEqual(12);
    expect(regions.some((r) => r.id === 'polar_ice')).toBe(true);
  });

  it('has ≥24 flagship heroes and ≥120 encounter-capable taxa', () => {
    const heroes = loadJson<{ species: unknown[] }>('hero-species.json');
    expect(heroes.species.length).toBeGreaterThanOrEqual(24);

    const enc = loadJson<{ species: Array<{ scientificName: string; programTier: string }> }>(
      'encounter-taxa.json',
    );
    expect(enc.species.length).toBeGreaterThanOrEqual(120);
    for (const s of enc.species) {
      expect(assertRealTaxonName(s.scientificName)).toBe(true);
    }
    const eCount = enc.species.filter((s) => s.programTier === 'E_Encounter').length;
    expect(eCount).toBeGreaterThanOrEqual(120);
  });

  it('never invents taxa in encounter catalog (liveClaim false)', () => {
    const enc = loadJson<{
      species: Array<{ scientificName: string; liveClaim: boolean; provenanceMode: string }>;
    }>('encounter-taxa.json');
    for (const s of enc.species) {
      expect(s.liveClaim).toBe(false);
      expect(s.provenanceMode).toBe('authored_public_taxonomy');
      expect(assertRealTaxonName('unknown')).toBe(false);
      expect(assertRealTaxonName(s.scientificName)).toBe(true);
    }
  });
});

describe('Wave F Alpha — scientific ingestion provenance', () => {
  it('fixture path never claims live; rejects invented names', async () => {
    const svc = new ScientificIngestionService({ fixtureOnly: true });
    svc.setFixtures({
      col: {
        entries: [
          { id: '1', scientificName: 'Panthera leo' },
          { id: '2', scientificName: 'unknown' },
          { id: '3', scientificName: 'placeholder_taxon' },
        ],
      },
      gbif: {
        records: [
          { scientificName: 'Ursus maritimus', gbifTaxonKey: 2433406 },
          { scientificName: 'fake', key: 0 },
        ],
      },
      pbdb: {
        records: [{ scientificName: 'Tyrannosaurus rex', paleobiodbTaxonNo: 1 }],
      },
    });

    const col = await svc.ingestCol({ scientificName: 'Panthera', useFixture: true });
    expect(col.mode).toBe('fixture');
    expect(col.records.every((r) => r.provenance.isLive === false)).toBe(true);
    expect(col.records.every((r) => r.provenance.isFixture === true)).toBe(true);
    expect(col.records.map((r) => r.scientificName)).toEqual(['Panthera leo']);
    ScientificIngestionService.assertHonestMode(col.records);

    const gbif = await svc.ingestGbif({ scientificName: 'Ursus', useFixture: true });
    expect(gbif.mode).toBe('fixture');
    expect(gbif.records).toHaveLength(1);
    expect(gbif.records[0].provenance.isLive).toBe(false);

    const pbdb = await svc.ingestPbdb({ scientificName: 'Tyrannosaurus', useFixture: true });
    expect(pbdb.mode).toBe('fixture');
    expect(pbdb.records[0].provenance.isFixture).toBe(true);
  });

  it('rate-limit / backoff helpers are configured', () => {
    const delay = computeBackoff(2, {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      retryStatuses: [429],
    });
    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThanOrEqual(1000);
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000, minIntervalMs: 0 });
    expect(limiter).toBeTruthy();
  });
});

describe('Wave F Alpha — companion path divergence', () => {
  it('two observation histories unlock different modules and diverge', () => {
    const a = companion();
    const b = companion();

    applyModularObservation(a, {
      kind: 'observe',
      speciesId: 'panthera_leo',
      traits: [],
      modules: MODULES,
      previouslyObserved: [],
    });
    evaluateCompanionModules(a, {
      modules: MODULES,
      observedSpeciesIds: ['panthera_leo'],
      visitedRegions: ['savanna'],
    });

    applyModularObservation(b, {
      kind: 'observe',
      speciesId: 'ursus_maritimus',
      traits: [],
      modules: MODULES,
      previouslyObserved: [],
      visitedRegions: ['polar_ice'],
    });
    evaluateCompanionModules(b, {
      modules: MODULES,
      observedSpeciesIds: ['ursus_maritimus'],
      visitedRegions: ['polar_ice', 'deep_marine'],
      completedExpeditions: ['exp_polar_ice_edge'],
    });

    expect(companionPathsDiverge(a, b)).toBe(true);
    expect(serializeModuleFingerprint(a)).not.toEqual(serializeModuleFingerprint(b));
    expect(a.modules?.pathHash).not.toEqual(b.modules?.pathHash);
  });
});

describe('Wave F Alpha — expedition / clue / journal', () => {
  it('starts expedition, discovers clue into journal, completes objectives', () => {
    const state = createDefaultSave();
    const expeditions = loadJson<{ expeditions: ExpeditionDef[] }>('expeditions.json').expeditions;
    const clues = loadJson<{ clues: ClueDef[] }>('clues.json').clues;
    const exp = expeditions.find((e) => e.id === 'exp_polar_ice_edge')!;
    const clue = clues.find((c) => c.id === 'clue_ice_edge_foodweb')!;

    startExpedition(state, exp);
    expect(state.expeditions?.active).toContain(exp.id);

    if (!state.player.visitedRegions.includes('polar_ice')) {
      state.player.visitedRegions.push('polar_ice');
    }
    state.artifacts.push({
      id: 'art1',
      speciesId: 'ursus_maritimus',
      speciesName: 'Polar Bear',
      scientificName: 'Ursus maritimus',
      artifactType: 'behavioral_field_note',
      ethical: true,
      collectedAt: Date.now(),
      region: 'polar_ice',
    });

    const entry = discoverClue(state, clue);
    expect(entry).toBeTruthy();
    expect(state.notebook.some((n) => n.text.includes('Ice-edge'))).toBe(true);

    const result = evaluateExpedition(state, exp);
    expect(result.complete).toBe(true);
    expect(state.expeditions?.completed).toContain(exp.id);
  });
});

describe('Wave F Alpha — tier coverage report', () => {
  it('builds machine-readable by-source R/E/F report with honest liveClaim', () => {
    const index = loadJson<{
      snapshotId: string;
      entries: Array<{
        id: string;
        commonName: string;
        scientificName: string;
        group: string;
        family: string;
        tier: 'hero' | 'regional' | 'family' | 'database';
        representationTier: number;
        isExtinct: boolean;
        isThreatened: boolean;
        isPlayable: boolean;
        sources?: string[];
        programTier?: string;
      }>;
    }>('search-index.json');
    const regions = loadJson<Array<{ id: string }>>('regions.json');
    const report = buildTierCoverageReport({
      snapshotId: index.snapshotId,
      entries: index.entries,
      regionIds: regions.map((r) => r.id),
    });

    expect(report.floors.regions.met).toBe(true);
    expect(report.floors.flagship.met).toBe(true);
    expect(report.floors.polarRegion.met).toBe(true);
    expect(report.floors.encounterTaxa.met).toBe(true);
    expect(report.honesty.fixturesNeverClaimedLive).toBe(true);
    expect(report.honesty.authoredPublicTaxonomyLiveClaim).toBe(false);
    expect(report.bySource.some((s) => s.source === 'game_authored' && s.liveClaim === false)).toBe(
      true,
    );
  });
});
