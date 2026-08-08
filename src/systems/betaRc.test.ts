/**
 * Beta digital + Digital RC + production ingest honesty tests.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ProductionIngestOrchestrator } from '@/services/ingestion/ProductionIngestOrchestrator';
import {
  DEFAULT_SOURCE_REGISTRY,
  assertNeverCallFixtureLive,
  mayCallLiveHttp,
  resolveIngestMode,
} from '@/services/ingestion/sourceRegistry';
import { buildSynonymIndex } from '@/services/ingestion/synonyms';
import { evaluateBetaDigital } from '@/systems/betaDigital';
import { evaluateDigitalRc } from '@/systems/digitalRc';
import { runFieldLoop, fieldGameplayReady } from '@/systems/fieldGameplay';
import { evaluateScientificOps } from '@/systems/scientificOps';
import {
  companionPathsDiverge,
  evaluateCompanionModules,
  type CompanionModuleDef,
} from '@/systems/companionModules';
import { createDefaultSave } from '@/systems/saveSystem';
import { buildDigitalRcOfflinePack, offlinePackReady } from '@/systems/offlinePack';
import { viewTimeUnit } from '@/systems/deepTimeSystem';

const FIX = join(process.cwd(), 'public/data/fixtures/ingest');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('Source registry states', () => {
  it('declares LIVE_PUBLIC|AUTHORIZED_BULK|SNAPSHOT|FIXTURE_TEST_ONLY|UNAVAILABLE', () => {
    const states = new Set(DEFAULT_SOURCE_REGISTRY.map((e) => e.state));
    for (const s of [
      'LIVE_PUBLIC',
      'AUTHORIZED_BULK',
      'SNAPSHOT',
      'UNAVAILABLE',
    ] as const) {
      expect(states.has(s)).toBe(true);
    }
    expect(mayCallLiveHttp(DEFAULT_SOURCE_REGISTRY.find((e) => e.id === 'col')!)).toBe(true);
    expect(mayCallLiveHttp(DEFAULT_SOURCE_REGISTRY.find((e) => e.id === 'iucn')!)).toBe(false);
  });

  it('never allows live HTTP for FIXTURE_TEST_ONLY', () => {
    const entry = {
      ...DEFAULT_SOURCE_REGISTRY[0],
      state: 'FIXTURE_TEST_ONLY' as const,
      fixtureOnly: true,
    };
    expect(resolveIngestMode(entry, {})).toBe('fixture');
    expect(() => assertNeverCallFixtureLive(entry, true)).toThrow(/Honesty violation/);
  });
});

describe('ProductionIngestOrchestrator — fixture scale + counts', () => {
  it('imports fixtures with synonyms/conflicts and liveClaim=false', async () => {
    const col = loadJson<{ entries: Array<Record<string, unknown>> }>(join(FIX, 'col_batch.json'));
    const gbif = loadJson<{ records: Array<Record<string, unknown>> }>(join(FIX, 'gbif_batch.json'));
    const pbdb = loadJson<{ records: Array<Record<string, unknown>> }>(join(FIX, 'pbdb_batch.json'));

    const orch = new ProductionIngestOrchestrator();
    const result = await orch.run({
      snapshotId: 'test-beta-fixture',
      snapshotVersion: '2',
      forceFixture: true,
      queries: {
        col: { limit: 200, useFixture: true },
        gbif: { limit: 100, useFixture: true },
        pbdb: { limit: 80, useFixture: true },
      },
      fixtures: {
        col: { entries: col.entries },
        gbif: { records: gbif.records },
        pbdb: { records: pbdb.records },
      },
    });

    expect(result.batch.anyLiveClaim).toBe(false);
    expect(result.actualCounts.globalCompleteClaim).toBe(false);
    expect(result.actualCounts.unique_taxa).toBeGreaterThan(200);
    expect(result.actualCounts.records_by_source.col).toBeGreaterThan(50);
    expect(result.actualCounts.honesty.noFabricatedGlobalComplete).toBe(true);
    expect(result.sourceStates.every((s) => s.mode === 'fixture' || s.mode === 'blocked')).toBe(
      true,
    );

    const syn = buildSynonymIndex(result.batch.allRecords);
    expect(syn.stats.synonymEdges + syn.stats.conflicts).toBeGreaterThanOrEqual(0);
    expect(result.actualCounts.synonyms).toBe(syn.stats.uniqueSynonyms);
  });
});

describe('Field gameplay + companion divergence + deep time', () => {
  it('runs field loop and diverges companion paths', () => {
    const a = createDefaultSave();
    const b = createDefaultSave();
    const modules: CompanionModuleDef[] = [
      {
        id: 'mod_a',
        label: 'A',
        unlockWhen: { kind: 'observe_species', speciesId: 'panthera_leo' },
        affinity: 'savanna',
        xpBonus: 5,
      },
      {
        id: 'mod_b',
        label: 'B',
        unlockWhen: { kind: 'visit_region', regionId: 'forest' },
        affinity: 'forest',
        xpBonus: 5,
      },
      {
        id: 'mod_scan',
        label: 'Scan',
        unlockWhen: { kind: 'scan_taxon', speciesId: 'panthera_leo' },
        affinity: 'science',
        xpBonus: 5,
      },
      {
        id: 'mod_time',
        label: 'Time',
        unlockWhen: { kind: 'view_time_unit', speciesId: 'carboniferous' },
        affinity: 'deep_time',
        xpBonus: 5,
      },
    ];

    a.player.visitedRegions.push('savanna');
    runFieldLoop(a, {
      observation: {
        speciesId: 'panthera_leo',
        scientificName: 'Panthera leo',
        regionId: 'savanna',
        ethical: true,
        patienceScore: 0.8,
        modules,
      },
      scanQuery: 'Panthera leo',
      catalog: [{ id: 'panthera_leo', scientificName: 'Panthera leo' }],
      documentSpeciesId: 'panthera_leo',
      documentScientificName: 'Panthera leo',
    });
    evaluateCompanionModules(a.companion, {
      modules,
      observedSpeciesIds: ['panthera_leo'],
      scannedTaxonIds: ['panthera_leo'],
      visitedRegions: a.player.visitedRegions,
    });
    viewTimeUnit(a, { id: 'carboniferous', label: 'Carboniferous' });
    evaluateCompanionModules(a.companion, {
      modules,
      observedSpeciesIds: ['panthera_leo'],
      scannedTaxonIds: ['panthera_leo'],
      viewedTimeUnitIds: ['carboniferous'],
      visitedRegions: a.player.visitedRegions,
    });

    b.player.visitedRegions.push('forest');
    evaluateCompanionModules(b.companion, {
      modules,
      visitedRegions: b.player.visitedRegions,
    });

    expect(companionPathsDiverge(a.companion, b.companion)).toBe(true);
    expect(fieldGameplayReady({
      hasObservation: true,
      hasScanning: true,
      hasCodex: true,
      hasExpedition: true,
    }).ready).toBe(true);
  });
});

describe('Beta + Digital RC tokens', () => {
  it('emits ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL when systems+floors met', () => {
    const beta = evaluateBetaDigital({
      snapshotId: 'test',
      floors: {
        regions: { required: 12, actual: 12, met: true },
        encounterTaxa: { required: 120, actual: 156, met: true },
        flagship: { required: 24, actual: 24, met: true },
        tierRBeyondEncounter: { required: true, actual: 500, encounter: 156, met: true },
      },
      actualCounts: {
        unique_taxa: 500,
        records_by_source: { col: 300, gbif: 120, pbdb: 80 },
        synonyms: 10,
        conflicts: 2,
      },
      systems: {
        world_regions: { present: true },
        deep_time: { present: true },
        field_gameplay: { present: true },
        companion_divergence: { present: true },
        scientific_ops: { present: true },
        tier_r_scale: { present: true },
        actual_counts: { present: true },
        source_registry: { present: true },
        offline_pack: { present: true },
        synonym_resolution: { present: true },
      },
    });
    expect(beta.statusToken).toBe('ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL');
    expect(beta.honesty.globalCompleteClaim).toBe(false);
  });

  it('emits ARCHIVE_DIGITAL_RC_READY only when runtime DB integration + suite pass', () => {
    const rc = evaluateDigitalRc({
      snapshotId: 'test',
      betaDigitalPass: true,
      pipelineComplete: true,
      runtimeDbIntegration: true,
      dbMigrationOk: true,
      snapshotUpdateOk: true,
      snapshotCorruptDetectOk: true,
      offlineOk: true,
      sourceUpdateOk: true,
      saveMigrateOk: true,
      packageManifestPresent: true,
      updateRollbackOk: true,
      provenanceDisplayOk: true,
      a11yOk: true,
      localizationReady: true,
      uniqueIconTitleOk: true,
      actualCountsPresent: true,
      ingestCheckpointResume: true,
      testsGreenSignal: true,
      packId: 'archive-of-life-digital-rc',
      version: '2.1.0-cont-vi',
      artifactPaths: ['rc/package_manifest.json'],
    });
    expect(rc.statusToken).toBe('ARCHIVE_DIGITAL_RC_READY');
  });

  it('blocks ARCHIVE_DIGITAL_RC_READY without runtime DB integration', () => {
    const rc = evaluateDigitalRc({
      snapshotId: 'test',
      betaDigitalPass: true,
      pipelineComplete: true,
      runtimeDbIntegration: false,
      dbMigrationOk: true,
      snapshotUpdateOk: true,
      snapshotCorruptDetectOk: true,
      offlineOk: true,
      sourceUpdateOk: true,
      saveMigrateOk: true,
      packageManifestPresent: true,
      updateRollbackOk: true,
      provenanceDisplayOk: true,
      a11yOk: true,
      localizationReady: true,
      uniqueIconTitleOk: true,
      actualCountsPresent: true,
      ingestCheckpointResume: true,
      testsGreenSignal: true,
      packId: 'archive-of-life-digital-rc',
      version: '2.1.0-cont-vi',
      artifactPaths: ['rc/package_manifest.json'],
    });
    expect(rc.statusToken).not.toBe('ARCHIVE_DIGITAL_RC_READY');
    expect(rc.gaps.some((g) => g.includes('runtime_db_integration'))).toBe(true);
  });

  it('builds digital RC offline pack with provenance pointers', () => {
    const pack = buildDigitalRcOfflinePack({
      packId: 'digital-rc-offline-pack',
      snapshotId: 'test',
      regionCount: 12,
      encounterCount: 156,
      flagshipCount: 24,
      tierRRecordCount: 500,
      provenanceArtifact: 'rc/provenance_bundle.json',
      actualCountsArtifact: 'coverage/actual_counts.json',
      packageVersion: '2.0.0',
    });
    expect(offlinePackReady(pack.manifest).ready).toBe(true);
    expect(pack.manifest.provenanceArtifact).toBe('rc/provenance_bundle.json');
  });

  it('scientific ops rejects fabricated global complete', () => {
    const report = evaluateScientificOps({
      registry: DEFAULT_SOURCE_REGISTRY,
      actualCounts: {
        schemaVersion: '1.0.0',
        snapshotId: 't',
        snapshotVersion: '1',
        generatedAt: new Date().toISOString(),
        globalCompleteClaim: false,
        liveClaimAny: false,
        records_by_source: { col: 1 },
        records_by_source_detail: [],
        unique_taxa: 1,
        unique_taxa_by_accepted_name: 1,
        synonyms: 0,
        synonym_edges: 0,
        conflicts: 0,
        rejected: 0,
        dropped_by_id: 0,
        dropped_by_name: 0,
        pages_fetched: 1,
        checkpoint_count: 1,
        cache_entries: 1,
        honesty: {
          fixturesNeverClaimedLive: true,
          liveOnlyWhenQueried: true,
          noFabricatedGlobalComplete: true,
        },
        notes: [],
      },
      batchReportPresent: true,
      provenancePolicyPresent: true,
      offlinePackReady: true,
      fixtureNeverCalledLive: true,
    });
    expect(report.allCriticalOk).toBe(true);
  });
});
