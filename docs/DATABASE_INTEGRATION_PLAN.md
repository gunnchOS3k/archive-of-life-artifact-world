# Database Integration Plan

This document outlines how Archive of Life can evolve from static JSON bundles to a full database-backed platform.

## Phase 1 — Current (Browser Prototype)

- Static bundles in `public/data/bundles/`
- Manifest-driven loading
- IndexedDB client cache
- localStorage player saves

## Phase 2 — CDN + Snapshot Releases

- Pipeline exports versioned bundle sets to object storage (S3, GCS)
- Manifest served from CDN with `snapshotId` and checksums
- Client invalidates IndexedDB on snapshot change
- Supports millions of index entries via sharded search bundles

```
manifest.json
  └── search-index-shard-000.json … search-index-shard-NNN.json
  └── hero-species-shard-*.json
  └── region-{id}.json
```

## Phase 3 — API Gateway (Read-Only)

REST or GraphQL API for:

| Endpoint | Purpose |
|----------|---------|
| `GET /manifest` | Current snapshot metadata |
| `GET /species/search` | Paginated, filtered search |
| `GET /species/:id` | Full ArchiveSpecies detail |
| `GET /regions/:id/species` | Regional discoverable set |
| `GET /coverage` | Global representation stats |

Player saves remain client-side or sync to user account service.

## Phase 4 — Write Path + Classroom Mode

- Teacher dashboards write quest assignments (not species taxonomy)
- Community species packs submitted for review
- Provenance audit on every contributed record

## Recommended Database Schema (Postgres)

```sql
-- Core taxonomy (COL-aligned)
species (id, col_id, scientific_name, rank, family, …)
taxonomy_snapshots (id, source, version, imported_at)

-- Overlays
conservation_assessments (species_id, iucn_category, year, …)
occurrence_summaries (species_id, region, count, …)
fossil_records (species_id, pbdb_no, time_range, …)

-- Game layer
gameplay_profiles (species_id, tier, region, quest_type, …)
artifact_templates (species_id, artifact_type, …)

-- Provenance
source_provenance (species_id, source, version, license, citation, …)
```

## Indexing Strategy

- Postgres full-text search on `common_name`, `scientific_name`
- Materialized view for threatened/extinct counts
- Elasticsearch optional for million-scale fuzzy search

## Migration Path

1. Keep `ArchiveSpecies` JSON schema as API response shape
2. Pipeline writes DB + exports bundles in parallel during transition
3. Audit scripts run against DB and exported bundles
4. Deprecate static bundles when API latency meets offline PWA goals
