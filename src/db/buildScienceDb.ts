/**
 * Build durable science DB from launch bundles + optional live ingest records.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import {
  ScientificDb,
  defaultScienceDbPath,
  type TaxonRow,
} from './ScientificDb';
import { SCIENCE_DB_SCHEMA_VERSION, SCIENCE_DB_SNAPSHOT_LABEL } from './schema';
import type { IngestedTaxonRecord } from '@/services/ingestion/types';

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function eraFromLifeStatus(lifeStatus?: string, isExtinct?: boolean): string {
  if (isExtinct || lifeStatus === 'extinct') return 'deep_time';
  return 'holocene';
}

export interface BuildScienceDbOptions {
  root?: string;
  dbPath?: string;
  liveRecords?: IngestedTaxonRecord[];
  snapshotId?: string;
  snapshotVersion?: string;
  clear?: boolean;
}

export interface BuildScienceDbResult {
  dbPath: string;
  stats: ReturnType<ScientificDb['stats']>;
  metaPath: string;
  migration: { from: number; to: number; applied: number[] };
  elapsedMs: number;
  contentHash: string;
  globalCompleteClaim: false;
}

export function buildScienceDb(opts: BuildScienceDbOptions = {}): BuildScienceDbResult {
  const started = Date.now();
  const root = opts.root ?? process.cwd();
  const bundles = join(root, 'public/data/bundles');
  const dbPath = opts.dbPath ?? defaultScienceDbPath(root);
  mkdirSync(join(root, 'public/data/science'), { recursive: true });

  if (opts.clear !== false) {
    ScientificDb.removeIfExists(dbPath);
    ScientificDb.removeIfExists(`${dbPath}-wal`);
    ScientificDb.removeIfExists(`${dbPath}-shm`);
  }

  const db = new ScientificDb({ path: dbPath });
  const migration = db.migrate();
  if (opts.clear !== false) db.clearScientificTables();

  const regions = loadJson<Array<{ id: string; biome?: string; speciesIds?: string[] }>>(
    join(bundles, 'regions.json'),
  );
  const regionBiome = new Map(regions.map((r) => [r.id, r.biome ?? 'unknown']));

  const enc = loadJson<{
    species: Array<{
      id: string;
      scientificName: string;
      commonName?: string;
      programTier?: string;
      region?: string;
      isPlayable?: boolean;
      taxonomicRank?: string;
      lifeStatus?: string;
      isExtinct?: boolean;
      provenance?: Array<Record<string, unknown>>;
    }>;
  }>(join(bundles, 'encounter-taxa.json'));

  const heroes = loadJson<{
    species: Array<{
      id: string;
      scientificName: string;
      commonName?: string;
      region?: string;
      isExtinct?: boolean;
      conservationStatus?: string;
      taxonomy?: { rank?: string };
      provenance?: Array<Record<string, unknown>>;
      fossilProfile?: { maxMa?: number; minMa?: number; period?: string };
      gameplay?: unknown;
      artifactTemplates?: unknown[];
    }>;
  }>(join(bundles, 'hero-species.json'));

  const index = existsSync(join(bundles, 'search-index.json'))
    ? loadJson<{
        entries: Array<{
          id: string;
          scientificName: string;
          commonName?: string;
          representationTier?: number;
          lifeStatus?: string;
          isExtinct?: boolean;
          isPlayable?: boolean;
          programTier?: string;
          group?: string;
        }>;
      }>(join(bundles, 'search-index.json'))
    : { entries: [] };

  const fixtureDir = join(root, 'public/data/fixtures/ingest');
  const fixtureRecords: IngestedTaxonRecord[] = [];
  if (existsSync(join(fixtureDir, 'col_batch.json'))) {
    const col = loadJson<{ entries?: Array<Record<string, unknown>> }>(
      join(fixtureDir, 'col_batch.json'),
    );
    for (const [i, usage] of (col.entries ?? []).entries()) {
      const nested = (usage.name ?? {}) as Record<string, unknown>;
      const name = String(
        nested.scientificName ?? usage.scientificName ?? usage.label ?? `col_fixture_${i}`,
      );
      fixtureRecords.push({
        scientificName: name,
        acceptedName: name,
        taxonomicRank: String(nested.rank ?? usage.rank ?? 'species'),
        synonyms: Array.isArray(usage.synonyms) ? usage.synonyms.map(String) : undefined,
        provenance: {
          source: 'col',
          sourceRecordId: String(usage.id ?? i),
          license: 'COL terms of use',
          attribution: 'Catalogue of Life fixture',
          citation: `COL fixture ${name}`,
          retrievedAt: new Date().toISOString(),
          mode: 'fixture',
          isLive: false,
          isFixture: true,
        },
        confidence: 'observed',
        cacheStatus: 'fixture',
        payload: usage,
      });
    }
  }
  if (existsSync(join(fixtureDir, 'gbif_batch.json'))) {
    const gbif = loadJson<{ records?: Array<Record<string, unknown>> }>(
      join(fixtureDir, 'gbif_batch.json'),
    );
    for (const [i, row] of (gbif.records ?? []).entries()) {
      const name = String(row.scientificName ?? row.name ?? `gbif_fixture_${i}`);
      fixtureRecords.push({
        scientificName: name,
        acceptedName: String(row.accepted ?? name),
        synonyms: Array.isArray(row.synonyms) ? row.synonyms.map(String) : undefined,
        provenance: {
          source: 'gbif',
          sourceRecordId: String(row.key ?? row.taxonKey ?? i),
          license: 'CC BY 4.0',
          attribution: 'GBIF fixture',
          citation: `GBIF fixture ${name}`,
          retrievedAt: new Date().toISOString(),
          mode: 'fixture',
          isLive: false,
          isFixture: true,
        },
        confidence: 'observed',
        cacheStatus: 'fixture',
        payload: row,
      });
    }
  }
  if (existsSync(join(fixtureDir, 'pbdb_batch.json'))) {
    const pbdb = loadJson<{ records?: Array<Record<string, unknown>> }>(
      join(fixtureDir, 'pbdb_batch.json'),
    );
    for (const [i, row] of (pbdb.records ?? []).entries()) {
      const name = String(row.identified_name ?? row.taxon_name ?? row.nam ?? `pbdb_fixture_${i}`);
      fixtureRecords.push({
        scientificName: name,
        acceptedName: name,
        provenance: {
          source: 'pbdb',
          sourceRecordId: String(row.occurrence_no ?? row.taxon_no ?? i),
          license: 'CC BY 4.0',
          attribution: 'PBDB fixture',
          citation: `PBDB fixture ${name}`,
          retrievedAt: new Date().toISOString(),
          mode: 'fixture',
          isLive: false,
          isFixture: true,
        },
        confidence: 'observed',
        cacheStatus: 'fixture',
        payload: row,
      });
    }
  }

  const upsertFrom = (row: TaxonRow, prov?: Array<Record<string, unknown>>) => {
    db.upsertTaxon(row);
    for (const p of prov ?? []) {
      db.insertProvenance({
        taxon_id: row.taxon_id,
        source: String(p.source ?? p.providerId ?? 'authored'),
        source_record_id: p.sourceRecordId != null ? String(p.sourceRecordId) : undefined,
        license: p.license != null ? String(p.license) : undefined,
        attribution: p.attribution != null ? String(p.attribution) : undefined,
        citation: p.citation != null ? String(p.citation) : undefined,
        source_url: p.sourceUrl != null ? String(p.sourceUrl) : undefined,
        retrieved_at: p.retrievedAt != null ? String(p.retrievedAt) : undefined,
        mode: p.isMockData ? 'fixture' : 'authored',
        is_live: false,
        is_fixture: Boolean(p.isMockData),
      });
    }
  };

  for (const s of enc.species) {
    const regionId = s.region ?? null;
    upsertFrom(
      {
        taxon_id: s.id,
        scientific_name: s.scientificName,
        accepted_name: s.scientificName,
        common_name: s.commonName ?? null,
        taxonomic_rank: s.taxonomicRank ?? 'species',
        program_tier: s.programTier ?? 'E_Encounter',
        representation_tier: 2,
        region_id: regionId,
        biome: regionId ? regionBiome.get(regionId) ?? null : null,
        life_status: s.lifeStatus ?? (s.isExtinct ? 'extinct' : 'extant'),
        is_extinct: s.isExtinct ? 1 : 0,
        is_playable: s.isPlayable === false ? 0 : 1,
        era_id: eraFromLifeStatus(s.lifeStatus, s.isExtinct),
        source_primary: 'encounter-bundle',
        payload_json: JSON.stringify({ id: s.id, programTier: s.programTier }),
      },
      s.provenance,
    );
    db.insertTimeRange({
      taxon_id: s.id,
      era_id: eraFromLifeStatus(s.lifeStatus, s.isExtinct),
      era_label: s.isExtinct ? 'Deep time / fossil' : 'Holocene',
      source: 'encounter-bundle',
    });
    if (regionId) {
      db.insertGeo({
        taxon_id: s.id,
        scientific_name: s.scientificName,
        region_id: regionId,
        locality: regionId,
        source: 'encounter-bundle',
      });
    }
  }

  for (const s of heroes.species) {
    const regionId = s.region ?? null;
    const extinct = s.isExtinct || s.conservationStatus === 'Extinct';
    upsertFrom(
      {
        taxon_id: s.id,
        scientific_name: s.scientificName,
        accepted_name: s.scientificName,
        common_name: s.commonName ?? null,
        taxonomic_rank: s.taxonomy?.rank ?? 'species',
        program_tier: 'F_Flagship',
        representation_tier: 1,
        region_id: regionId,
        biome: regionId ? regionBiome.get(regionId) ?? null : null,
        life_status: extinct ? 'extinct' : 'extant',
        is_extinct: extinct ? 1 : 0,
        is_playable: 1,
        era_id: eraFromLifeStatus(undefined, extinct),
        source_primary: 'hero-bundle',
        payload_json: JSON.stringify({
          id: s.id,
          hasGameplay: s.gameplay != null,
          artifactTemplates: s.artifactTemplates?.length ?? 0,
        }),
      },
      s.provenance,
    );
    db.insertTimeRange({
      taxon_id: s.id,
      era_id: eraFromLifeStatus(undefined, extinct),
      era_label: s.fossilProfile?.period ?? (extinct ? 'Deep time' : 'Holocene'),
      max_ma: s.fossilProfile?.maxMa ?? null,
      min_ma: s.fossilProfile?.minMa ?? null,
      source: 'hero-bundle',
    });
    if (regionId) {
      db.insertGeo({
        taxon_id: s.id,
        scientific_name: s.scientificName,
        region_id: regionId,
        locality: regionId,
        source: 'hero-bundle',
      });
    }
  }

  // Index entries beyond E/F — durable store, not in-memory fixtures only
  for (const e of index.entries) {
    if (db.getTaxonById(e.id)) continue;
    db.upsertTaxon({
      taxon_id: e.id,
      scientific_name: e.scientificName,
      accepted_name: e.scientificName,
      common_name: e.commonName ?? null,
      program_tier: e.programTier ?? 'R_Reference',
      representation_tier: e.representationTier ?? 4,
      life_status: e.lifeStatus ?? (e.isExtinct ? 'extinct' : 'extant'),
      is_extinct: e.isExtinct ? 1 : 0,
      is_playable: e.isPlayable ? 1 : 0,
      era_id: eraFromLifeStatus(e.lifeStatus, e.isExtinct),
      source_primary: 'search-index',
      payload_json: JSON.stringify({ group: e.group }),
    });
  }

  for (const rec of [...fixtureRecords, ...(opts.liveRecords ?? [])]) {
    const id = `live_${rec.provenance.source}_${rec.provenance.sourceRecordId}`.replace(
      /[^A-Za-z0-9_.-]/g,
      '_',
    );
    const existing = db.findByScientificName(rec.scientificName)[0];
    const taxonId = existing?.taxon_id ?? id;
    if (!existing) {
      db.upsertTaxon({
        taxon_id: taxonId,
        scientific_name: rec.scientificName,
        accepted_name: rec.acceptedName ?? rec.scientificName,
        taxonomic_rank: rec.taxonomicRank ?? null,
        program_tier: 'R_LiveIngest',
        representation_tier: 5,
        is_playable: 0,
        source_primary: rec.provenance.source,
        payload_json: JSON.stringify(rec.payload ?? {}),
      });
    }
    for (const syn of rec.synonyms ?? []) {
      db.insertSynonym({
        taxon_id: taxonId,
        synonym_name: syn,
        accepted_name: rec.acceptedName ?? rec.scientificName,
        source: rec.provenance.source,
      });
    }
    if (rec.acceptedName && rec.acceptedName !== rec.scientificName) {
      db.insertSynonym({
        taxon_id: taxonId,
        synonym_name: rec.scientificName,
        accepted_name: rec.acceptedName,
        source: rec.provenance.source,
      });
    }
    db.insertProvenance({
      taxon_id: taxonId,
      source: rec.provenance.source,
      source_record_id: rec.provenance.sourceRecordId,
      license: rec.provenance.license,
      attribution: rec.provenance.attribution,
      citation: rec.provenance.citation,
      source_url: rec.provenance.sourceUrl,
      retrieved_at: rec.provenance.retrievedAt,
      mode: rec.provenance.mode,
      is_live: rec.provenance.isLive,
      is_fixture: rec.provenance.isFixture,
    });
    const payload = rec.payload as Record<string, unknown> | undefined;
    const lat = typeof payload?.lat === 'number' ? payload.lat : typeof payload?.latitude === 'number' ? payload.latitude : null;
    const lon = typeof payload?.lng === 'number' ? payload.lng : typeof payload?.longitude === 'number' ? payload.longitude : null;
    if (lat != null || lon != null) {
      db.insertGeo({
        taxon_id: taxonId,
        scientific_name: rec.scientificName,
        lat,
        lon,
        source: rec.provenance.source,
        source_record_id: rec.provenance.sourceRecordId,
      });
    }
  }

  const contentHash = db.computeContentHash();
  const stats = db.stats();
  db.recordSnapshot({
    snapshotId: opts.snapshotId ?? SCIENCE_DB_SNAPSHOT_LABEL,
    snapshotVersion: opts.snapshotVersion ?? `science-${SCIENCE_DB_SCHEMA_VERSION}.0.0`,
    contentHash,
    recordCount: stats.taxa,
    offline: true,
    notes: 'Cont VI durable science DB — not GLOBAL_DATA_COMPLETE',
  });

  const finalStats = db.stats();
  db.close();

  const meta = {
    schemaVersion: SCIENCE_DB_SCHEMA_VERSION,
    snapshotId: opts.snapshotId ?? SCIENCE_DB_SNAPSHOT_LABEL,
    snapshotVersion: opts.snapshotVersion ?? `science-${SCIENCE_DB_SCHEMA_VERSION}.0.0`,
    generatedAt: new Date().toISOString(),
    dbPath: 'public/data/science/archive_science.sqlite',
    contentHash,
    stats: finalStats,
    indexes: [
      'taxa.scientific_name',
      'taxa.accepted_name',
      'taxa.region_id',
      'taxa.biome',
      'taxa.program_tier',
      'taxa.era_id',
      'synonyms.synonym_name',
      'provenance.taxon_id',
      'geo_occurrence.taxon_id',
      'time_ranges.era_id',
    ],
    globalCompleteClaim: false as const,
    elapsedMs: Date.now() - started,
  };
  const metaPath = join(root, 'public/data/science/offline_snapshot_meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

  // File hash for integrity / corrupt detection
  const fileBuf = readFileSync(dbPath);
  const fileHash = createHash('sha256').update(fileBuf).digest('hex');
  writeFileSync(
    join(root, 'public/data/science/db_integrity.json'),
    JSON.stringify(
      {
        path: 'public/data/science/archive_science.sqlite',
        sha256: fileHash,
        bytes: fileBuf.length,
        schemaVersion: SCIENCE_DB_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        globalCompleteClaim: false,
      },
      null,
      2,
    ) + '\n',
  );

  return {
    dbPath,
    stats: finalStats,
    metaPath,
    migration,
    elapsedMs: Date.now() - started,
    contentHash,
    globalCompleteClaim: false,
  };
}
