/**
 * Durable local scientific DB (SQLite via node:sqlite).
 * Indexed taxonomic / time / geo / provenance / synonym store for game runtime.
 */

import { createHash } from 'crypto';
import { createRequire } from 'module';
import { existsSync, mkdirSync, renameSync, copyFileSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import {
  MIGRATIONS,
  SCIENCE_DB_SCHEMA_VERSION,
  SCIENCE_DB_SNAPSHOT_LABEL,
} from './schema';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
type DatabaseSyncInstance = InstanceType<typeof DatabaseSync>;

export interface TaxonRow {
  taxon_id: string;
  scientific_name: string;
  accepted_name?: string | null;
  common_name?: string | null;
  taxonomic_rank?: string | null;
  program_tier?: string | null;
  representation_tier?: number | null;
  region_id?: string | null;
  biome?: string | null;
  life_status?: string | null;
  is_extinct?: number;
  is_playable?: number;
  era_id?: string | null;
  source_primary?: string | null;
  payload_json?: string | null;
}

export interface ProvenanceRow {
  taxon_id: string;
  source: string;
  source_record_id?: string;
  license?: string;
  attribution?: string;
  citation?: string;
  source_url?: string;
  retrieved_at?: string;
  mode?: string;
  is_live?: boolean;
  is_fixture?: boolean;
}

export interface SynonymRow {
  taxon_id: string;
  synonym_name: string;
  accepted_name?: string;
  source?: string;
}

export interface GeoRow {
  taxon_id: string;
  scientific_name?: string;
  lat?: number | null;
  lon?: number | null;
  locality?: string;
  region_id?: string;
  source?: string;
  source_record_id?: string;
}

export interface TimeRangeRow {
  taxon_id: string;
  era_id?: string;
  era_label?: string;
  max_ma?: number | null;
  min_ma?: number | null;
  source?: string;
}

export interface ScienceDbStats {
  schemaVersion: number;
  taxa: number;
  synonyms: number;
  provenance: number;
  geo: number;
  timeRanges: number;
  snapshots: number;
  contentHash: string;
  snapshotId: string;
  offline: boolean;
}

export interface ScienceDbOpenOptions {
  path: string;
  readonly?: boolean;
}

function sha256Hex(parts: string[]): string {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  h.update('\n');
  return h.digest('hex');
}

export class ScientificDb {
  readonly path: string;
  private db: DatabaseSyncInstance;
  private readonly readonly: boolean;

  constructor(opts: ScienceDbOpenOptions) {
    this.path = opts.path;
    this.readonly = opts.readonly === true;
    if (!this.readonly) {
      mkdirSync(dirname(opts.path), { recursive: true });
    }
    this.db = new DatabaseSync(opts.path, {
      readOnly: this.readonly,
    });
    if (!this.readonly) {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
      this.migrate();
    }
  }

  close(): void {
    this.db.close();
  }

  migrate(): { from: number; to: number; applied: number[] } {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);
    const row = this.db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as
      | { v: number | null }
      | undefined;
    const current = row?.v ?? 0;
    const applied: number[] = [];
    for (const m of MIGRATIONS) {
      if (m.version <= current) continue;
      this.db.exec('BEGIN');
      try {
        this.db.exec(m.sql);
        this.db
          .prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)')
          .run(m.version, new Date().toISOString());
        this.db
          .prepare(
            `INSERT INTO schema_meta(key, value) VALUES('schema_version', ?)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
          )
          .run(String(m.version));
        this.db.exec('COMMIT');
        applied.push(m.version);
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    }
    return { from: current, to: SCIENCE_DB_SCHEMA_VERSION, applied };
  }

  clearScientificTables(): void {
    this.db.exec(`
      DELETE FROM ingest_ops_log;
      DELETE FROM snapshot_versions;
      DELETE FROM time_ranges;
      DELETE FROM geo_occurrence;
      DELETE FROM provenance;
      DELETE FROM synonyms;
      DELETE FROM taxa;
    `);
  }

  upsertTaxon(row: TaxonRow): void {
    this.db
      .prepare(
        `INSERT INTO taxa(
          taxon_id, scientific_name, accepted_name, common_name, taxonomic_rank,
          program_tier, representation_tier, region_id, biome, life_status,
          is_extinct, is_playable, era_id, source_primary, payload_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(taxon_id) DO UPDATE SET
          scientific_name=excluded.scientific_name,
          accepted_name=excluded.accepted_name,
          common_name=excluded.common_name,
          taxonomic_rank=excluded.taxonomic_rank,
          program_tier=excluded.program_tier,
          representation_tier=excluded.representation_tier,
          region_id=excluded.region_id,
          biome=excluded.biome,
          life_status=excluded.life_status,
          is_extinct=excluded.is_extinct,
          is_playable=excluded.is_playable,
          era_id=excluded.era_id,
          source_primary=excluded.source_primary,
          payload_json=excluded.payload_json`,
      )
      .run(
        row.taxon_id,
        row.scientific_name,
        row.accepted_name ?? null,
        row.common_name ?? null,
        row.taxonomic_rank ?? null,
        row.program_tier ?? null,
        row.representation_tier ?? null,
        row.region_id ?? null,
        row.biome ?? null,
        row.life_status ?? null,
        row.is_extinct ?? 0,
        row.is_playable ?? 0,
        row.era_id ?? null,
        row.source_primary ?? null,
        row.payload_json ?? null,
      );
  }

  insertSynonym(row: SynonymRow): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO synonyms(taxon_id, synonym_name, accepted_name, source)
         VALUES (?,?,?,?)`,
      )
      .run(row.taxon_id, row.synonym_name, row.accepted_name ?? null, row.source ?? null);
  }

  insertProvenance(row: ProvenanceRow): void {
    this.db
      .prepare(
        `INSERT INTO provenance(
          taxon_id, source, source_record_id, license, attribution, citation,
          source_url, retrieved_at, mode, is_live, is_fixture
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        row.taxon_id,
        row.source,
        row.source_record_id ?? null,
        row.license ?? null,
        row.attribution ?? null,
        row.citation ?? null,
        row.source_url ?? null,
        row.retrieved_at ?? null,
        row.mode ?? null,
        row.is_live ? 1 : 0,
        row.is_fixture ? 1 : 0,
      );
  }

  insertGeo(row: GeoRow): void {
    this.db
      .prepare(
        `INSERT INTO geo_occurrence(
          taxon_id, scientific_name, lat, lon, locality, region_id, source, source_record_id
        ) VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        row.taxon_id,
        row.scientific_name ?? null,
        row.lat ?? null,
        row.lon ?? null,
        row.locality ?? null,
        row.region_id ?? null,
        row.source ?? null,
        row.source_record_id ?? null,
      );
  }

  insertTimeRange(row: TimeRangeRow): void {
    this.db
      .prepare(
        `INSERT INTO time_ranges(taxon_id, era_id, era_label, max_ma, min_ma, source)
         VALUES (?,?,?,?,?,?)`,
      )
      .run(
        row.taxon_id,
        row.era_id ?? null,
        row.era_label ?? null,
        row.max_ma ?? null,
        row.min_ma ?? null,
        row.source ?? null,
      );
  }

  recordSnapshot(opts: {
    snapshotId: string;
    snapshotVersion: string;
    contentHash: string;
    recordCount: number;
    notes?: string;
    offline?: boolean;
  }): void {
    this.db
      .prepare(
        `INSERT INTO snapshot_versions(
          snapshot_id, snapshot_version, schema_version, created_at, content_hash, record_count, offline, notes
        ) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(snapshot_id) DO UPDATE SET
          snapshot_version=excluded.snapshot_version,
          schema_version=excluded.schema_version,
          created_at=excluded.created_at,
          content_hash=excluded.content_hash,
          record_count=excluded.record_count,
          offline=excluded.offline,
          notes=excluded.notes`,
      )
      .run(
        opts.snapshotId,
        opts.snapshotVersion,
        SCIENCE_DB_SCHEMA_VERSION,
        new Date().toISOString(),
        opts.contentHash,
        opts.recordCount,
        opts.offline === false ? 0 : 1,
        opts.notes ?? null,
      );
  }

  logIngestOp(opts: {
    runId: string;
    source?: string;
    pagesFetched?: number;
    records?: number;
    elapsedMs?: number;
    contentHash?: string;
    errors?: string[];
  }): void {
    this.db
      .prepare(
        `INSERT INTO ingest_ops_log(
          run_id, source, pages_fetched, records, elapsed_ms, content_hash, errors_json, created_at
        ) VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        opts.runId,
        opts.source ?? null,
        opts.pagesFetched ?? 0,
        opts.records ?? 0,
        opts.elapsedMs ?? 0,
        opts.contentHash ?? null,
        JSON.stringify(opts.errors ?? []),
        new Date().toISOString(),
      );
  }

  getTaxonById(taxonId: string): TaxonRow | undefined {
    return this.db.prepare('SELECT * FROM taxa WHERE taxon_id = ?').get(taxonId) as
      | TaxonRow
      | undefined;
  }

  findByScientificName(name: string): TaxonRow[] {
    const n = name.trim().toLowerCase();
    return this.db
      .prepare(
        `SELECT * FROM taxa WHERE lower(scientific_name) = ? OR lower(accepted_name) = ?
         LIMIT 50`,
      )
      .all(n, n) as TaxonRow[];
  }

  resolveSynonym(name: string): TaxonRow[] {
    const n = name.trim().toLowerCase();
    const ids = this.db
      .prepare(`SELECT DISTINCT taxon_id FROM synonyms WHERE lower(synonym_name) = ?`)
      .all(n) as Array<{ taxon_id: string }>;
    return ids
      .map((r) => this.getTaxonById(r.taxon_id))
      .filter((t): t is TaxonRow => t != null);
  }

  listByRegion(regionId: string): TaxonRow[] {
    return this.db
      .prepare(`SELECT * FROM taxa WHERE region_id = ? ORDER BY scientific_name`)
      .all(regionId) as TaxonRow[];
  }

  listByBiome(biome: string): TaxonRow[] {
    return this.db
      .prepare(`SELECT * FROM taxa WHERE biome = ? ORDER BY scientific_name`)
      .all(biome) as TaxonRow[];
  }

  listByEra(eraId: string): TaxonRow[] {
    return this.db
      .prepare(
        `SELECT DISTINCT t.* FROM taxa t
         LEFT JOIN time_ranges tr ON tr.taxon_id = t.taxon_id
         WHERE t.era_id = ? OR tr.era_id = ?
         ORDER BY t.scientific_name`,
      )
      .all(eraId, eraId) as TaxonRow[];
  }

  listPlayableTier(programTier: string): TaxonRow[] {
    return this.db
      .prepare(
        `SELECT * FROM taxa WHERE program_tier = ? AND is_playable = 1 ORDER BY scientific_name`,
      )
      .all(programTier) as TaxonRow[];
  }

  provenanceFor(taxonId: string): ProvenanceRow[] {
    return this.db
      .prepare(`SELECT * FROM provenance WHERE taxon_id = ?`)
      .all(taxonId) as ProvenanceRow[];
  }

  stats(): ScienceDbStats {
    const count = (table: string): number => {
      const r = this.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
      return r.n;
    };
    const snap = this.db
      .prepare(
        `SELECT snapshot_id, content_hash, offline FROM snapshot_versions
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as { snapshot_id: string; content_hash: string; offline: number } | undefined;
    const schemaRow = this.db
      .prepare(`SELECT value FROM schema_meta WHERE key = 'schema_version'`)
      .get() as { value: string } | undefined;
    const taxa = count('taxa');
    const contentHash =
      snap?.content_hash ??
      sha256Hex([
        String(taxa),
        String(count('synonyms')),
        String(count('provenance')),
        String(count('geo_occurrence')),
        String(count('time_ranges')),
      ]);
    return {
      schemaVersion: Number(schemaRow?.value ?? SCIENCE_DB_SCHEMA_VERSION),
      taxa,
      synonyms: count('synonyms'),
      provenance: count('provenance'),
      geo: count('geo_occurrence'),
      timeRanges: count('time_ranges'),
      snapshots: count('snapshot_versions'),
      contentHash,
      snapshotId: snap?.snapshot_id ?? SCIENCE_DB_SNAPSHOT_LABEL,
      offline: snap ? snap.offline === 1 : true,
    };
  }

  computeContentHash(): string {
    const rows = this.db
      .prepare(
        `SELECT taxon_id, scientific_name, program_tier, region_id FROM taxa
         ORDER BY taxon_id`,
      )
      .all() as Array<{
      taxon_id: string;
      scientific_name: string;
      program_tier: string | null;
      region_id: string | null;
    }>;
    return sha256Hex(
      rows.map(
        (r) =>
          `${r.taxon_id}|${r.scientific_name}|${r.program_tier ?? ''}|${r.region_id ?? ''}`,
      ),
    );
  }

  /** Atomic replace helper for snapshot update / rollback. */
  static atomicReplace(fromPath: string, toPath: string): void {
    mkdirSync(dirname(toPath), { recursive: true });
    const tmp = `${toPath}.tmp-${Date.now()}`;
    copyFileSync(fromPath, tmp);
    renameSync(tmp, toPath);
  }

  static backup(path: string, backupPath: string): void {
    if (!existsSync(path)) throw new Error(`Science DB missing: ${path}`);
    mkdirSync(dirname(backupPath), { recursive: true });
    copyFileSync(path, backupPath);
  }

  static rollback(backupPath: string, path: string): void {
    if (!existsSync(backupPath)) throw new Error(`Backup missing: ${backupPath}`);
    copyFileSync(backupPath, path);
  }

  static removeIfExists(path: string): void {
    if (existsSync(path)) unlinkSync(path);
  }
}

export function defaultScienceDbPath(root = process.cwd()): string {
  return `${root}/public/data/science/archive_science.sqlite`;
}
