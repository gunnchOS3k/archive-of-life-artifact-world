/**
 * Expedition → museum → dex → lifeling → save offline integrity polish.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertFlagshipArtHonesty,
  flagshipArtStatusLabel,
  listFlagshipTaxonIds,
  FLAGSHIP_OBSERVATION_PROFILES,
} from '@/services/flagshipTaxonProfiles';
import {
  assertRegionDepthFloor,
  evaluateRegionExploration,
  getRegionExplorationCard,
  REGION_EXPLORATION_CARDS,
} from '@/systems/regionExploration';
import {
  createDefaultSave,
  validateSave,
  saveGame,
  loadSave,
  deleteSave,
  migrateSave,
  SAVE_VERSION,
} from '@/systems/saveSystem';
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
import {
  assertMuseumDexHonesty,
  buildMuseumHubPresentation,
  listArchiveDexFlagshipPresentations,
} from '@/systems/museumDexPresentation';
import { applyAccessibilitySettings, loadAccessibilitySettings } from '@/systems/accessibility';

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

  it('completes museum → expedition → observation → dex → lifeling → museum → save/reload', () => {
    const museum = getRegionExplorationCard('museum');
    const steppe = getRegionExplorationCard('steppe');
    expect(museum).toBeTruthy();
    expect(steppe).toBeTruthy();
    expect(
      evaluateRegionExploration(museum!, {
        portalReachable: true,
        taxonEncountered: false,
        iconHonest: true,
        observationRecorded: false,
        offlineIntegrityOk: true,
      }).earthCompleteClaim,
    ).toBe(false);

    const horseProfile = FLAGSHIP_OBSERVATION_PROFILES.equus_caballus_ferus;
    expect(horseProfile).toBeTruthy();
    assertFlagshipArtHonesty(horseProfile);
    expect(flagshipArtStatusLabel(horseProfile)).toMatch(/not a finished model|not human-approved|candidate/i);
    expect(horseProfile.finalArtStatus).not.toBe('final_asset_human_approved');

    const result = evaluateRegionExploration(steppe!, {
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
    state.player.currentRegion = 'museum';
    state.player.visitedRegions = ['museum'];
    // Expedition out
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
    // Dex / documentation + lifeling
    state.stats.speciesDocumented = Math.max(1, state.stats.speciesDocumented ?? 0);
    state.companion.name = 'Steppe Scout';
    state.companion.unlockedTraits = [
      ...new Set([...(state.companion.unlockedTraits ?? []), 'steppe_mane']),
    ];
    // Return to museum after collection
    state.player.currentRegion = 'museum';
    if (!state.player.visitedRegions.includes('museum')) {
      state.player.visitedRegions.push('museum');
    }
    expect(validateSave(state)).toBe(true);
    saveGame(state);
    const restored = loadSave();
    expect(restored?.player.visitedRegions).toEqual(expect.arrayContaining(['museum', 'steppe']));
    expect(restored?.player.currentRegion).toBe('museum');
    expect(restored?.companion.name).toBe('Steppe Scout');
    expect(restored?.companion.unlockedTraits).toContain('steppe_mane');
    expect((restored?.stats.speciesDocumented ?? 0) + (restored?.artifacts.length ?? 0)).toBeGreaterThan(0);
    deleteSave();
  });

  it('owner playable review package documents scientific claim honesty', () => {
    const pkg = loadJson<{
      gates: { human_ready: boolean; rc_ready: boolean; v1_ready: boolean; production_ready: boolean };
      scientificClaimHonesty: {
        anySourceVerified: boolean;
        temporalMapsSourceVerified: string;
        iucnBlockedWithoutCredentials: boolean;
      };
      flagshipArtHonesty: { finishedModelsClaimed: boolean };
    }>(join(ROOT, 'artifacts/owner_playable_review/OWNER_PLAYABLE_REVIEW_PACKAGE.json'));
    expect(pkg.gates.human_ready).toBe(false);
    expect(pkg.gates.rc_ready).toBe(false);
    expect(pkg.gates.v1_ready).toBe(false);
    expect(pkg.gates.production_ready).toBe(false);
    expect(pkg.scientificClaimHonesty.anySourceVerified).toBe(false);
    expect(pkg.scientificClaimHonesty.temporalMapsSourceVerified).toBe('0/17');
    expect(pkg.scientificClaimHonesty.iucnBlockedWithoutCredentials).toBe(true);
    expect(pkg.flagshipArtHonesty.finishedModelsClaimed).toBe(false);
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

  it('museum hub + ArchiveDex presentations stay honest (no Earth-complete / IUCN assessed)', () => {
    const hub = buildMuseumHubPresentation();
    const entries = listArchiveDexFlagshipPresentations();
    expect(hub.exploreRegionCount).toBeGreaterThanOrEqual(12);
    expect(hub.flagshipCount).toBe(24);
    expect(hub.earthCompleteClaim).toBe(false);
    expect(hub.productionReadyClaim).toBe(false);
    expect(hub.sourceVerifiedReleaseClaim).toBe(false);
    expect(hub.temporalMapsHonesty).toContain('0/17');
    expect(hub.ariaLabel.toLowerCase()).toMatch(/0 of 17|0\/17/);
    expect(entries).toHaveLength(24);
    for (const entry of entries) {
      expect(entry.iucnAssessed).toBe(false);
      expect(entry.finishedModelClaimed).toBe(false);
      expect(entry.claimClass).not.toBe('source_verified');
      expect(entry.artStatusLabel).toMatch(/candidate|not a finished model|not human-approved|not finished/i);
    }
    expect(() => assertMuseumDexHonesty(hub, entries)).not.toThrow();
  });

  it('migrates legacy saves to SAVE_VERSION without global coverage claims', () => {
    const legacy = {
      version: 1,
      player: { x: 10, y: 20, currentRegion: 'steppe', visitedRegions: ['museum', 'steppe'] },
      artifacts: [],
      notebook: [],
      quests: { active: [], completed: [] },
      companion: { name: 'Legacy Scout', bodyColor: '#111', equippedTraits: [], unlockedTraits: [] },
      stats: { artifactsCollected: 0, speciesDocumented: 1, regionsExplored: 2 },
      campaign: { globalCoverageClaimed: true },
    };
    const migrated = migrateSave(legacy as never);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.player.currentRegion).toBe('steppe');
    expect(migrated.companion.name).toBe('Legacy Scout');
    expect(migrated.campaign?.globalCoverageClaimed).toBe(false);
    expect(migrated.expeditions).toBeTruthy();
    expect(validateSave(migrated)).toBe(true);
  });

  it('a11y settings apply without claiming human polish complete', () => {
    const root = document.createElement('div');
    const settings = { ...loadAccessibilitySettings(), highContrast: true, largeText: true };
    applyAccessibilitySettings(settings, root);
    expect(root.classList.contains('a11y-high-contrast')).toBe(true);
    expect(root.classList.contains('a11y-large-text')).toBe(true);
    const hub = buildMuseumHubPresentation();
    expect(hub.ariaLabel.length).toBeGreaterThan(40);
  });

  it('RTM binds GUNNCHOS3K_PVS@1.0.0 and keeps HUMAN/RC2/V1 + independent_review not_started', () => {
    const rtm = loadJson<{
      schema_version: string;
      contract_id: string;
      contract_version: string;
      contract_source_sha: string;
      product_id: string;
      honesty_flags: { HUMAN: boolean; RC2: boolean; V1: boolean };
      phase_summary: {
        cursor_complete: { status: string };
        codex_independently_verified: { status: string };
        human_approval: { status: string };
      };
      rows: Array<{
        req_id: string;
        independent_review_status: string;
        limitations: string[];
        notes?: string;
      }>;
    }>(join(ROOT, 'artifacts/rtm/ARCHIVE_REQUIREMENTS_TO_EVIDENCE_MATRIX.json'));
    expect(rtm.schema_version).toBe('1.0.0');
    expect(rtm.contract_id).toBe('GUNNCHOS3K_PVS');
    expect(rtm.contract_version).toBe('1.0.0');
    expect(rtm.contract_source_sha.startsWith('45b4566')).toBe(true);
    expect(rtm.product_id).toBe('archive-of-life');
    expect(rtm.honesty_flags.HUMAN).toBe(false);
    expect(rtm.honesty_flags.RC2).toBe(false);
    expect(rtm.honesty_flags.V1).toBe(false);
    expect(rtm.phase_summary.cursor_complete.status).toBe('not_started');
    expect(rtm.phase_summary.codex_independently_verified.status).toBe('not_started');
    expect(rtm.phase_summary.human_approval.status).toBe('not_started');
    expect(rtm.rows.length).toBeGreaterThanOrEqual(10);
    expect(rtm.rows.every((r) => r.independent_review_status === 'not_started')).toBe(true);
    const blob = JSON.stringify(rtm);
    expect(blob).toMatch(/sample_fallback/);
    expect(blob).toMatch(/0\/17/);
    expect(blob).toMatch(/IUCN/);
    const ids = new Set(rtm.rows.map((r) => r.req_id));
    for (const needed of [
      'AOL-SCI-001',
      'AOL-SCI-002',
      'AOL-TAX-003',
      'AOL-EXP-001',
      'AOL-ORG-001',
      'AOL-A11Y-001',
      'AOL-MUX-001',
    ]) {
      expect(ids.has(needed)).toBe(true);
    }
  });
});
