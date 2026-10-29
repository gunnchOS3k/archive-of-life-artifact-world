/**
 * Expedition → museum → dex → lifeling → save offline integrity polish.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertFlagshipArtHonesty,
  listFlagshipTaxonIds,
  FLAGSHIP_OBSERVATION_PROFILES,
} from '@/services/flagshipTaxonProfiles';
import {
  assertRegionDepthFloor,
  evaluateRegionExploration,
  getRegionExplorationCard,
  REGION_EXPLORATION_CARDS,
} from '@/systems/regionExploration';
import { createDefaultSave, validateSave, saveGame, loadSave, deleteSave } from '@/systems/saveSystem';
import {
  buildOfflinePackManifest,
  stampOfflinePackIntegrity,
  verifyOfflinePackIntegrity,
} from '@/systems/offlinePack';
import { classifyUnsupportedClaim } from '@/services/ingestion/publicSourceAdapters';
import { RELEASE_PROVENANCE_CLASSES } from '@/schema/provenance';
import { collectArtifact } from '@/systems/artifactSystem';
import type { PlayableSpecies } from '@/services/DataCatalogService';
import type { LifelingTrait } from '@/schema';

const ROOT = process.cwd();
const DATA = join(ROOT, 'public/data');
const BUNDLES = join(DATA, 'bundles');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const horse: PlayableSpecies = {
  id: 'equus_caballus_ferus',
  commonName: "Przewalski's Horse",
  scientificName: 'Equus ferus przewalskii',
  group: 'Mammal',
  family: 'Equidae',
  conservationStatus: 'Endangered',
  artifactTypes: ['track_cast'],
  region: 'steppe',
  questType: 'observation',
  dangerLevel: 2,
  ethicalInteraction: 'observe_from_distance',
  timeRange: 'Present',
  habitats: ['steppe'],
  continents: ['Asia'],
  diet: 'Herbivore',
  activity: 'Diurnal',
  size: '1.2–1.4 m',
  behavior: 'Steppe herd browser',
  learningTopics: [],
  funFacts: [],
  whyItMatters: '',
  timeUnitIds: ['holocene'],
  provenance: [
    {
      source: 'game_authored',
      sourceVersion: 'mvp',
      sourceRecordId: 'equus_caballus_ferus',
      license: 'GAME-ORIGINAL',
      citation: 'Archive authored',
      citationRequired: false,
      retrievedAt: '2026-10-29T00:00:00.000Z',
      lastUpdated: '2026-10-29T00:00:00.000Z',
      verificationStatus: 'game_authored_verified',
      isMockData: false,
    },
  ],
};

describe('expedition journey polish', () => {
  it('keeps flagship 24 with species-specific marks (not generic final art)', () => {
    const ids = listFlagshipTaxonIds();
    expect(ids.length).toBe(24);
    for (const id of ids) {
      const profile = FLAGSHIP_OBSERVATION_PROFILES[id];
      assertFlagshipArtHonesty(profile);
      expect(profile.habitatCues.length).toBeGreaterThan(0);
      expect(profile.behaviorNote.length).toBeGreaterThan(8);
    }
  });

  it('preserves ≥120 encounter taxa and ≥12 explore regions', () => {
    const encounter = loadJson<{ species: unknown[] }>(join(BUNDLES, 'encounter-taxa.json'));
    expect(encounter.species.length).toBeGreaterThanOrEqual(120);
    const regions = loadJson<Array<{ id: string }>>(join(BUNDLES, 'regions.json'));
    expect(regions.length).toBeGreaterThanOrEqual(12);
    assertRegionDepthFloor(12);
    expect(REGION_EXPLORATION_CARDS.length).toBe(13);
  });

  it('completes steppe portal → observation → lifeling → offline save path digitally', () => {
    const card = getRegionExplorationCard('steppe');
    expect(card).toBeTruthy();
    const result = evaluateRegionExploration(card!, {
      portalReachable: true,
      taxonEncountered: true,
      iconHonest: true,
      observationRecorded: true,
      offlineIntegrityOk: true,
    });
    expect(result.complete).toBe(true);
    expect(result.earthCompleteClaim).toBe(false);

    deleteSave();
    const state = createDefaultSave();
    state.player.currentRegion = 'steppe';
    state.player.visitedRegions = ['museum', 'steppe'];
    const traits: LifelingTrait[] = [
      {
        id: 'steppe_mane',
        name: 'Steppe Mane',
        category: 'head',
        description: 'Wind-cut mane',
        unlockedBy: 'equus_caballus_ferus',
      },
    ];
    const modules = loadJson<{ modules: Array<{ id: string }> }>(
      join(BUNDLES, 'companion-modules.json'),
    ).modules;
    const collected = collectArtifact(state, horse, traits, {
      timePeriodId: 'holocene',
      modules: modules as never,
    });
    expect(collected.success).toBe(true);
    expect(validateSave(state)).toBe(true);
    state.companion.name = 'Steppe Scout';
    saveGame(state);
    const restored = loadSave();
    expect(restored?.player.visitedRegions).toContain('steppe');
    expect(restored?.companion.name).toBe('Steppe Scout');
    expect((restored?.stats.speciesDocumented ?? 0) + (restored?.artifacts.length ?? 0)).toBeGreaterThan(0);
    deleteSave();
  });

  it('offline pack integrity remains honest (liveClaim false)', () => {
    expect(existsSync(join(BUNDLES, 'hero-species.json'))).toBe(true);
    let pack = buildOfflinePackManifest({
      packId: 'journey-polish-offline',
      snapshotId: 'sample-2026-07',
      regionCount: 13,
      encounterCount: 157,
      flagshipCount: 24,
      tierRRecordCount: 0,
    });
    expect(pack.liveClaim).toBe(false);
    pack = stampOfflinePackIntegrity(pack, DATA);
    const verify = verifyOfflinePackIntegrity(pack, DATA);
    expect(verify.liveClaimHonest).toBe(true);
    expect(verify.ok).toBe(true);
  });

  it('provenance classes include unsupported_claim; fake map unlock rejected', () => {
    expect(RELEASE_PROVENANCE_CLASSES).toContain('unsupported_claim');
    expect(RELEASE_PROVENANCE_CLASSES).toContain('mock_sample');
    expect(classifyUnsupportedClaim('17 maps unlocked')).toBe('unsupported_claim');
  });

  it('production readiness stays false until earned', () => {
    const report = loadJson<{ ready: boolean }>(join(DATA, 'status/production_readiness_report.json'));
    expect(report.ready).toBe(false);
    const manifest = loadJson<{ coverage?: { iucnAssessed?: number } }>(join(DATA, 'manifest.json'));
    expect(manifest.coverage?.iucnAssessed ?? 0).toBe(0);
    const honesty = loadJson<{
      iucn_assessed_source_verified_count?: number;
      GLOBAL_DATA_COMPLETE: boolean;
    }>(join(ROOT, 'artifacts/archive_full/DATA_COVERAGE_HONESTY.json'));
    expect(honesty.GLOBAL_DATA_COMPLETE).toBe(false);
    expect(honesty.iucn_assessed_source_verified_count ?? 0).toBe(0);
  });
});
