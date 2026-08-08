/**
 * COL / GBIF / PBDB scientific ingestion with pagination, retry, rate-limit, provenance.
 * Live where public APIs allow. Fixtures only when useFixture / fixtureOnly — never labeled live.
 */

import { assertRealTaxonName } from '@/services/providers/provenanceAdapters';
import { ScientificHttpClient } from './httpClient';
import type {
  IngestedTaxonRecord,
  IngestionClientConfig,
  IngestionMode,
  IngestionPageResult,
  IngestionQuery,
  IngestionSource,
  ProvenanceStamp,
} from './types';
import { DEFAULT_INGESTION_CONFIG } from './types';

const COL_SEARCH =
  'https://api.checklistbank.org/dataset/3LR/nameusage/search';
const GBIF_OCC = 'https://api.gbif.org/v1/occurrence/search';
const PBDB_OCC =
  'https://paleobiodb.org/data1.2/occs/list.json';

export interface FixtureBundles {
  col?: { entries?: Array<Record<string, unknown>>; species?: Array<Record<string, unknown>> };
  gbif?: { records?: Array<Record<string, unknown>> };
  pbdb?: { records?: Array<Record<string, unknown>> };
}

function nowIso(): string {
  return new Date().toISOString();
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function stamp(
  source: IngestionSource,
  sourceRecordId: string,
  license: string,
  attribution: string,
  citation: string,
  mode: IngestionMode,
  sourceUrl?: string,
): ProvenanceStamp {
  const isLive = mode === 'live';
  const isFixture = mode === 'fixture';
  return {
    source,
    sourceRecordId,
    license,
    attribution,
    citation,
    sourceUrl,
    retrievedAt: nowIso(),
    mode,
    isLive,
    isFixture,
  };
}

function toRecord(
  scientificName: string | undefined,
  source: IngestionSource,
  sourceRecordId: string,
  license: string,
  attribution: string,
  citation: string,
  mode: IngestionMode,
  payload: unknown,
  extras: Partial<IngestedTaxonRecord> = {},
  sourceUrl?: string,
): IngestedTaxonRecord | null {
  if (!assertRealTaxonName(scientificName)) return null;
  if (!license.trim()) return null;
  return {
    scientificName,
    acceptedName: extras.acceptedName,
    taxonomicRank: extras.taxonomicRank,
    provenance: stamp(source, sourceRecordId, license, attribution, citation, mode, sourceUrl),
    confidence: 'observed',
    cacheStatus: mode === 'live' ? 'live' : mode === 'fixture' ? 'fixture' : 'cached',
    payload,
  };
}

export class ScientificIngestionService {
  private readonly http: ScientificHttpClient;
  private fixtures: FixtureBundles = {};

  constructor(config: Partial<IngestionClientConfig> = {}) {
    this.http = new ScientificHttpClient({ ...DEFAULT_INGESTION_CONFIG, ...config });
  }

  /** Inject fixture payloads for tests — results always mode=fixture, isLive=false. */
  setFixtures(fixtures: FixtureBundles): void {
    this.fixtures = fixtures;
  }

  getClientConfig(): IngestionClientConfig {
    return this.http.config;
  }

  async ingestCol(query: IngestionQuery): Promise<IngestionPageResult> {
    const errors: string[] = [];
    if (query.useFixture || this.http.config.fixtureOnly) {
      return this.colFromFixture(query, errors);
    }
    const q = query.scientificName?.trim();
    if (!q) {
      return { records: [], page: 0, offset: 0, pageSize: 0, hasMore: false, mode: 'live', errors: ['missing scientificName'] };
    }
    try {
      const pageSize = Math.min(query.limit ?? this.http.config.pagination.pageSize, 50);
      const offset = query.offset ?? 0;
      const { items, pagesFetched } = await this.http.paginate<{
        result?: Array<{ usage?: Record<string, unknown>; id?: string }>;
        total?: number;
      }, IngestedTaxonRecord>({
        buildUrl: (off, size) =>
          `${COL_SEARCH}?q=${encodeURIComponent(q)}&limit=${size}&offset=${off}`,
        extract: (body) => {
          const hits = body.result ?? [];
          const mapped = hits
            .map((hit, i) => {
              const usage = (hit.usage ?? hit) as Record<string, unknown>;
              const name = str(usage.scientificName ?? usage.label ?? usage.name);
              const id = String(hit.id ?? usage.id ?? i);
              return toRecord(
                name,
                'col',
                id,
                'COL terms of use',
                'Catalogue of Life ChecklistBank',
                `Catalogue of Life — ${name} (${id})`,
                'live',
                usage,
                {
                  acceptedName: str(
                    (usage.accepted as Record<string, unknown> | undefined)?.name ??
                      usage.acceptedName,
                  ),
                  taxonomicRank: str(usage.rank),
                },
                'https://www.catalogueoflife.org/',
              );
            })
            .filter((r): r is IngestedTaxonRecord => r != null);
          const hasMore =
            hits.length >= pageSize &&
            (typeof body.total === 'number' ? offset + hits.length < body.total : hits.length > 0);
          return { items: mapped, hasMore };
        },
        pagination: {
          pageSize,
          maxPages: query.limit ? Math.max(1, Math.ceil((query.limit ?? pageSize) / pageSize)) : this.http.config.pagination.maxPages,
          offsetParam: 'offset',
        },
      });
      const limited = query.limit ? items.slice(0, query.limit) : items;
      return {
        records: limited,
        page: pagesFetched,
        offset,
        pageSize,
        hasMore: items.length > limited.length,
        mode: 'live',
        errors,
      };
    } catch (err) {
      errors.push(`COL live failed: ${String(err)}`);
      return this.colFromFixture(query, errors);
    }
  }

  async ingestGbif(query: IngestionQuery): Promise<IngestionPageResult> {
    const errors: string[] = [];
    if (query.useFixture || this.http.config.fixtureOnly) {
      return this.gbifFromFixture(query, errors);
    }
    const q = query.scientificName?.trim();
    if (!q) {
      return { records: [], page: 0, offset: 0, pageSize: 0, hasMore: false, mode: 'live', errors: ['missing scientificName'] };
    }
    try {
      const pageSize = Math.min(query.limit ?? this.http.config.pagination.pageSize, 50);
      const startOffset = query.offset ?? 0;
      const { items, pagesFetched } = await this.http.paginate<{
        results?: Array<Record<string, unknown>>;
        endOfRecords?: boolean;
        count?: number;
      }, IngestedTaxonRecord>({
        buildUrl: (off, size) =>
          `${GBIF_OCC}?scientificName=${encodeURIComponent(q)}&limit=${size}&offset=${off + startOffset}`,
        extract: (body) => {
          const rows = body.results ?? [];
          const mapped = rows
            .map((row, i) => {
              const name = str(row.scientificName);
              const id = String(row.key ?? row.gbifID ?? i);
              return toRecord(
                name,
                'gbif',
                id,
                str(row.license) ?? 'CC BY 4.0',
                'GBIF Occurrence API',
                `GBIF.org — ${name} (${id})`,
                'live',
                row,
                { acceptedName: str(row.acceptedScientificName), taxonomicRank: str(row.taxonRank) },
                row.key ? `https://www.gbif.org/occurrence/${row.key}` : 'https://www.gbif.org/',
              );
            })
            .filter((r): r is IngestedTaxonRecord => r != null);
          const hasMore = body.endOfRecords === false || rows.length >= pageSize;
          return { items: mapped, hasMore };
        },
        pagination: {
          pageSize,
          maxPages: query.limit
            ? Math.max(1, Math.ceil((query.limit ?? pageSize) / pageSize))
            : this.http.config.pagination.maxPages,
          offsetParam: 'offset',
        },
      });
      const limited = query.limit ? items.slice(0, query.limit) : items;
      return {
        records: limited,
        page: pagesFetched,
        offset: startOffset,
        pageSize,
        hasMore: items.length > limited.length,
        mode: 'live',
        errors,
      };
    } catch (err) {
      errors.push(`GBIF live failed: ${String(err)}`);
      return this.gbifFromFixture(query, errors);
    }
  }

  async ingestPbdb(query: IngestionQuery): Promise<IngestionPageResult> {
    const errors: string[] = [];
    if (query.useFixture || this.http.config.fixtureOnly) {
      return this.pbdbFromFixture(query, errors);
    }
    const q = query.scientificName?.trim();
    if (!q) {
      return { records: [], page: 0, offset: 0, pageSize: 0, hasMore: false, mode: 'live', errors: ['missing scientificName'] };
    }
    try {
      const pageSize = Math.min(query.limit ?? this.http.config.pagination.pageSize, 50);
      const offset = query.offset ?? 0;
      // PBDB uses limit; walk via offset-like skip using sequential limit windows
      const { items, pagesFetched } = await this.http.paginate<{
        records?: Array<Record<string, unknown>>;
      }, IngestedTaxonRecord>({
        buildUrl: (off, size) =>
          `${PBDB_OCC}?taxon_name=${encodeURIComponent(q)}&limit=${size}&offset=${off + offset}&show=coords,attr,class,time`,
        extract: (body) => {
          const rows = body.records ?? [];
          const mapped = rows
            .map((row, i) => {
              const name = str(row.identified_name ?? row.accepted_name ?? row.taxon_name);
              const id = String(row.occurrence_no ?? row.oid ?? i);
              return toRecord(
                name,
                'pbdb',
                id,
                'CC BY 4.0',
                'Paleobiology Database API',
                `Paleobiology Database — ${name} (${id})`,
                'live',
                row,
                { acceptedName: str(row.accepted_name), taxonomicRank: str(row.taxon_rank ?? row.rank) },
                row.occurrence_no
                  ? `https://paleobiodb.org/classic/basicOccurrenceInfo?occurrence_no=${row.occurrence_no}`
                  : 'https://paleobiodb.org/',
              );
            })
            .filter((r): r is IngestedTaxonRecord => r != null);
          return { items: mapped, hasMore: rows.length >= pageSize };
        },
        pagination: {
          pageSize,
          maxPages: query.limit
            ? Math.max(1, Math.ceil((query.limit ?? pageSize) / pageSize))
            : this.http.config.pagination.maxPages,
          offsetParam: 'offset',
        },
      });
      const limited = query.limit ? items.slice(0, query.limit) : items;
      return {
        records: limited,
        page: pagesFetched,
        offset,
        pageSize,
        hasMore: items.length > limited.length,
        mode: 'live',
        errors,
      };
    } catch (err) {
      errors.push(`PBDB live failed: ${String(err)}`);
      return this.pbdbFromFixture(query, errors);
    }
  }

  /** Assert honesty: no fixture record may report isLive. */
  static assertHonestMode(records: IngestedTaxonRecord[]): void {
    for (const r of records) {
      if (r.provenance.isFixture && r.provenance.isLive) {
        throw new Error(`Honesty violation: fixture claimed live for ${r.scientificName}`);
      }
      if (r.provenance.mode === 'fixture' && r.provenance.isLive) {
        throw new Error(`Honesty violation: mode=fixture with isLive for ${r.scientificName}`);
      }
      if (r.cacheStatus === 'fixture' && r.provenance.isLive) {
        throw new Error(`Honesty violation: cacheStatus=fixture with isLive for ${r.scientificName}`);
      }
    }
  }

  private colFromFixture(query: IngestionQuery, errors: string[]): IngestionPageResult {
    const entries =
      this.fixtures.col?.entries ??
      this.fixtures.col?.species ??
      [];
    const q = query.scientificName?.trim()?.toLowerCase();
    const filtered = entries.filter((e) => {
      const sci = str(e.scientificName)?.toLowerCase() ?? '';
      return !q || sci.includes(q);
    });
    const limit = query.limit ?? 5;
    const offset = query.offset ?? 0;
    const slice = filtered.slice(offset, offset + limit);
    const records = slice
      .map((e, i) =>
        toRecord(
          str(e.scientificName),
          'col',
          String(e.id ?? i),
          'COL terms of use',
          'Catalogue of Life fixture',
          `COL fixture — ${str(e.scientificName)}`,
          'fixture',
          e,
        ),
      )
      .filter((r): r is IngestedTaxonRecord => r != null);
    ScientificIngestionService.assertHonestMode(records);
    return {
      records,
      page: 1,
      offset,
      pageSize: limit,
      hasMore: offset + limit < filtered.length,
      mode: 'fixture',
      errors,
    };
  }

  private gbifFromFixture(query: IngestionQuery, errors: string[]): IngestionPageResult {
    const rows = this.fixtures.gbif?.records ?? [];
    const q = query.scientificName?.trim()?.toLowerCase();
    const filtered = rows.filter((e) => {
      const sci = str(e.scientificName ?? e.acceptedScientificName)?.toLowerCase() ?? '';
      return !q || sci.includes(q);
    });
    const limit = query.limit ?? 5;
    const offset = query.offset ?? 0;
    const slice = filtered.slice(offset, offset + limit);
    const records = slice
      .map((e, i) =>
        toRecord(
          str(e.scientificName ?? e.acceptedScientificName),
          'gbif',
          String(e.gbifTaxonKey ?? e.key ?? i),
          'CC BY 4.0',
          'GBIF occurrence fixture',
          `GBIF fixture — ${str(e.scientificName)}`,
          'fixture',
          e,
        ),
      )
      .filter((r): r is IngestedTaxonRecord => r != null);
    ScientificIngestionService.assertHonestMode(records);
    return {
      records,
      page: 1,
      offset,
      pageSize: limit,
      hasMore: offset + limit < filtered.length,
      mode: 'fixture',
      errors,
    };
  }

  private pbdbFromFixture(query: IngestionQuery, errors: string[]): IngestionPageResult {
    const rows = this.fixtures.pbdb?.records ?? [];
    const q = query.scientificName?.trim()?.toLowerCase();
    const filtered = rows.filter((e) => {
      const sci = str(e.scientificName)?.toLowerCase() ?? '';
      return !q || sci.includes(q);
    });
    const limit = query.limit ?? 5;
    const offset = query.offset ?? 0;
    const slice = filtered.slice(offset, offset + limit);
    const records = slice
      .map((e, i) =>
        toRecord(
          str(e.scientificName),
          'pbdb',
          String(e.paleobiodbTaxonNo ?? e.speciesId ?? i),
          'CC BY 4.0',
          'PBDB fossil fixture',
          `PBDB fixture — ${str(e.scientificName)}`,
          'fixture',
          e,
        ),
      )
      .filter((r): r is IngestedTaxonRecord => r != null);
    ScientificIngestionService.assertHonestMode(records);
    return {
      records,
      page: 1,
      offset,
      pageSize: limit,
      hasMore: offset + limit < filtered.length,
      mode: 'fixture',
      errors,
    };
  }
}

export const scientificIngestion = new ScientificIngestionService();
