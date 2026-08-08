/**
 * Cont VI science DB + runtime integration tests.
 * @vitest-environment node
 */
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, afterAll } from 'vitest';
import { ScientificDb } from '@/db/ScientificDb';
import { buildScienceDb } from '@/db/buildScienceDb';
import { traverseRegionsWithDb, runtimeIntegrationComplete } from '@/db/runtimeBridge';
import { createDefaultSave } from '@/systems/saveSystem';
import { runDigitalRcSuite } from '@/systems/digitalRcSuite';
import { evaluateClaimLedger } from '@/claims/evaluateClaimLedger';
import { auditLaunchTiers } from '@/claims/launchTierAudit';

const ROOT = process.cwd();
const TMP_DB = join(ROOT, 'public/data/science/test_archive_science.sqlite');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

afterAll(() => {
  for (const p of [TMP_DB, `${TMP_DB}-wal`, `${TMP_DB}-shm`]) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
});

describe('ScientificDb durable store', () => {
  it('migrates, indexes taxa, and supports taxonomic/region/era lookups', () => {
    const built = buildScienceDb({
      root: ROOT,
      dbPath: TMP_DB,
      clear: true,
      snapshotId: 'test-science-db',
      snapshotVersion: 'test-1',
    });
    expect(built.stats.taxa).toBeGreaterThan(150);
    expect(built.globalCompleteClaim).toBe(false);

    const db = new ScientificDb({ path: TMP_DB });
    const e = db.listPlayableTier('E_Encounter');
    const f = db.listPlayableTier('F_Flagship');
    expect(e.length).toBeGreaterThanOrEqual(120);
    expect(f.length).toBeGreaterThanOrEqual(24);

    const regions = loadJson<Array<{ id: string; biome?: string; type?: string }>>(
      join(ROOT, 'public/data/bundles/regions.json'),
    );
    for (const r of regions) {
      const rows = db.listByRegion(r.id);
      if (r.type === 'hub' || r.id === 'museum') {
        expect(db.listPlayableTier('F_Flagship').length).toBeGreaterThan(0);
        continue;
      }
      expect(rows.length).toBeGreaterThan(0);
      if (r.biome) expect(db.listByBiome(r.biome).length).toBeGreaterThan(0);
    }
    expect(db.listByEra('holocene').length + db.listByEra('deep_time').length).toBeGreaterThan(0);
    expect(db.stats().contentHash.length).toBe(64);
    db.close();
  });
});

describe('Runtime bridge across launch regions', () => {
  it('traverses encounter/biome/era/clue/observation/artifact/codex/companion via DB', () => {
    if (!existsSync(TMP_DB)) {
      buildScienceDb({ root: ROOT, dbPath: TMP_DB, clear: true });
    }
    const regions = loadJson<Array<{ id: string; biome?: string; name?: string }>>(
      join(ROOT, 'public/data/bundles/regions.json'),
    );
    const clues = loadJson<{ clues: Array<{ id: string; regionId?: string; text?: string }> }>(
      join(ROOT, 'public/data/bundles/clues.json'),
    );
    const modules = loadJson<{ modules: Parameters<typeof traverseRegionsWithDb>[0]['companionModules'] }>(
      join(ROOT, 'public/data/bundles/companion-modules.json'),
    );
    const enc = loadJson<{ species: Array<{ id: string; scientificName: string; programTier?: string; region?: string; isPlayable?: boolean }> }>(
      join(ROOT, 'public/data/bundles/encounter-taxa.json'),
    );
    const heroes = loadJson<{ species: Array<{ id: string; scientificName: string; gameplay?: unknown; artifactTemplates?: unknown }> }>(
      join(ROOT, 'public/data/bundles/hero-species.json'),
    );

    const launch = auditLaunchTiers({
      snapshotId: 'test',
      regions,
      encounterSpecies: enc.species,
      flagshipSpecies: heroes.species,
    });
    expect(launch.tokens.LAUNCH_TIER_E_COMPLETE).toBe(true);
    expect(launch.tokens.LAUNCH_TIER_F_COMPLETE).toBe(true);
    expect(launch.tierE.playable).toBeGreaterThanOrEqual(120);
    expect(launch.tierF.withGameplay).toBe(24);

    const db = new ScientificDb({ path: TMP_DB });
    const report = traverseRegionsWithDb({
      db,
      save: createDefaultSave(),
      regions,
      clues: clues.clues,
      companionModules: modules.modules,
    });
    db.close();

    expect(report.regionsTraversed).toBe(12);
    expect(report.dbUsedForLookups).toBe(true);
    expect(report.observations).toBeGreaterThanOrEqual(8);
    expect(report.encounters).toBeGreaterThanOrEqual(12);
    expect(runtimeIntegrationComplete(report)).toBe(true);
  });
});

describe('Digital RC suite + claim ledger runtime gate', () => {
  it('runs Cont VI RC suite checks', () => {
    const suite = runDigitalRcSuite(ROOT);
    expect(suite.checks.db_migration.ok).toBe(true);
    expect(suite.checks.snapshot_corrupt_detect.ok).toBe(true);
    expect(suite.checks.update_rollback.ok).toBe(true);
    expect(suite.checks.unique_icon_title.ok).toBe(true);
    expect(suite.checks.localization_ready.ok).toBe(true);
    expect(suite.allOk).toBe(true);
  });

  it('withholds ARCHIVE_DIGITAL_RC_READY without runtime integration', () => {
    const regions = loadJson<Array<{ id: string; biome?: string }>>(
      join(ROOT, 'public/data/bundles/regions.json'),
    );
    const enc = loadJson<{ species: Array<{ id: string; scientificName: string; programTier?: string; region?: string; isPlayable?: boolean }> }>(
      join(ROOT, 'public/data/bundles/encounter-taxa.json'),
    );
    const heroes = loadJson<{ species: Array<{ id: string; scientificName: string; gameplay?: unknown; artifactTemplates?: unknown }> }>(
      join(ROOT, 'public/data/bundles/hero-species.json'),
    );
    const launch = auditLaunchTiers({
      snapshotId: 'test',
      regions,
      encounterSpecies: enc.species,
      flagshipSpecies: heroes.species,
    });
    const ledger = evaluateClaimLedger({
      snapshotId: 'test',
      snapshotVersion: '2.0.0',
      launch,
      fixtureSnapshotLoaded: true,
      pipelineComplete: true,
      pipelineReason: 'test',
      officialBulkSnapshotLoaded: false,
      liveRecordsBySource: { col: 100, gbif: 100, pbdb: 50 },
      fixtureUniqueTaxa: 900,
      worldTraversalPass: true,
      worldTraversalDetail: 'ok',
      runtimeDbIntegration: false,
    });
    expect(ledger.earned.some((e) => e.token === 'ARCHIVE_DIGITAL_RC_READY')).toBe(false);
  });
});
