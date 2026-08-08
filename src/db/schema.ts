/**
 * Scientific DB schema — SQLite tables + migration versions.
 * Cont VI durable local archive (taxonomic / time / geo / provenance / synonym).
 */

export const SCIENCE_DB_SCHEMA_VERSION = 1;
export const SCIENCE_DB_SNAPSHOT_LABEL = 'cont-vi-science-db-2026-08';

export const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS taxa (
  taxon_id TEXT PRIMARY KEY,
  scientific_name TEXT NOT NULL,
  accepted_name TEXT,
  common_name TEXT,
  taxonomic_rank TEXT,
  program_tier TEXT,
  representation_tier INTEGER,
  region_id TEXT,
  biome TEXT,
  life_status TEXT,
  is_extinct INTEGER NOT NULL DEFAULT 0,
  is_playable INTEGER NOT NULL DEFAULT 0,
  era_id TEXT,
  source_primary TEXT,
  payload_json TEXT
);

CREATE TABLE IF NOT EXISTS synonyms (
  synonym_id INTEGER PRIMARY KEY AUTOINCREMENT,
  taxon_id TEXT NOT NULL,
  synonym_name TEXT NOT NULL,
  accepted_name TEXT,
  source TEXT,
  UNIQUE(taxon_id, synonym_name)
);

CREATE TABLE IF NOT EXISTS provenance (
  provenance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  taxon_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_record_id TEXT,
  license TEXT,
  attribution TEXT,
  citation TEXT,
  source_url TEXT,
  retrieved_at TEXT,
  mode TEXT,
  is_live INTEGER NOT NULL DEFAULT 0,
  is_fixture INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS geo_occurrence (
  occ_id INTEGER PRIMARY KEY AUTOINCREMENT,
  taxon_id TEXT NOT NULL,
  scientific_name TEXT,
  lat REAL,
  lon REAL,
  locality TEXT,
  region_id TEXT,
  source TEXT,
  source_record_id TEXT
);

CREATE TABLE IF NOT EXISTS time_ranges (
  time_id INTEGER PRIMARY KEY AUTOINCREMENT,
  taxon_id TEXT NOT NULL,
  era_id TEXT,
  era_label TEXT,
  max_ma REAL,
  min_ma REAL,
  source TEXT
);

CREATE TABLE IF NOT EXISTS snapshot_versions (
  snapshot_id TEXT PRIMARY KEY,
  snapshot_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  offline INTEGER NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS ingest_ops_log (
  op_id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  source TEXT,
  pages_fetched INTEGER,
  records INTEGER,
  elapsed_ms INTEGER,
  content_hash TEXT,
  errors_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_taxa_scientific ON taxa(scientific_name);
CREATE INDEX IF NOT EXISTS idx_taxa_accepted ON taxa(accepted_name);
CREATE INDEX IF NOT EXISTS idx_taxa_region ON taxa(region_id);
CREATE INDEX IF NOT EXISTS idx_taxa_biome ON taxa(biome);
CREATE INDEX IF NOT EXISTS idx_taxa_tier ON taxa(program_tier);
CREATE INDEX IF NOT EXISTS idx_taxa_era ON taxa(era_id);
CREATE INDEX IF NOT EXISTS idx_syn_name ON synonyms(synonym_name);
CREATE INDEX IF NOT EXISTS idx_prov_taxon ON provenance(taxon_id);
CREATE INDEX IF NOT EXISTS idx_prov_source ON provenance(source);
CREATE INDEX IF NOT EXISTS idx_geo_taxon ON geo_occurrence(taxon_id);
CREATE INDEX IF NOT EXISTS idx_geo_region ON geo_occurrence(region_id);
CREATE INDEX IF NOT EXISTS idx_time_taxon ON time_ranges(taxon_id);
CREATE INDEX IF NOT EXISTS idx_time_era ON time_ranges(era_id);
`,
  },
];
