import type { DataProvider, FederatedRecord, OccurrenceQuery, TaxonQuery } from './types';

const NASA_METADATA = '/data/earth/nasa_metadata_cache.json';
const GBIF_FIXTURE = '/data/bundles/gbif-occurrences.json';
const PBDB_FIXTURE = '/data/bundles/fossil-pbdb.json';
const COL_FIXTURE = '/data/bundles/search-index.json';

function nowIso(): string {
  return new Date().toISOString();
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json() as Promise<T>;
}

function wrapFixture<T>(
  providerId: string,
  sourceRecordId: string,
  payload: T,
  attribution: string,
  license: string,
  interpretation: FederatedRecord['interpretation'] = 'observed',
): FederatedRecord<T> {
  return {
    providerId,
    sourceRecordId,
    retrievedAt: nowIso(),
    license,
    attribution,
    confidence: 'observed',
    interpretation,
    cacheStatus: 'fixture',
    payload,
  };
}

export const nasaProvider: DataProvider = {
  id: 'nasa',
  organization: 'NASA',
  domains: ['earth_observation', 'climate', 'environmental_change'],
  async healthCheck() {
    try {
      await fetchJson(NASA_METADATA);
      return { ok: true, message: 'NASA metadata cache reachable' };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  },
  getAttribution() {
    return {
      organization: 'NASA',
      dataset: 'Earthdata / EONET / POWER metadata cache',
      license: 'NASA open data policy (per dataset)',
      citation: 'NASA Earthdata',
      sourceUrl: 'https://www.earthdata.nasa.gov/',
    };
  },
  async getEnvironmentalLayer(query) {
    const cache = await fetchJson<{ layers?: Array<{ id: string; mode: string }> }>(NASA_METADATA);
    const layer = cache.layers?.find((l) => l.id === query.layerId);
    if (!layer) return null;
    return wrapFixture(
      'nasa',
      `${query.regionId}:${query.layerId}`,
      layer,
      'NASA Earthdata metadata cache',
      'NASA open data policy',
      'inferred',
    );
  },
};

export const gbifProvider: DataProvider = {
  id: 'gbif',
  organization: 'GBIF',
  domains: ['biodiversity', 'occurrence', 'taxonomy'],
  async healthCheck() {
    try {
      await fetchJson(GBIF_FIXTURE);
      return { ok: true, message: 'GBIF fixture bundle loaded (live API blocked without download)' };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  },
  getAttribution() {
    return {
      organization: 'GBIF',
      dataset: 'GBIF occurrence snapshot (fixture until GBIF_DOWNLOAD_PATH configured)',
      license: 'CC BY 4.0 (typical GBIF occurrence media; verify per record)',
      citation: 'GBIF.org',
      sourceUrl: 'https://www.gbif.org/',
    };
  },
  async getOccurrences(query: OccurrenceQuery) {
    const bundle = await fetchJson<{ records: Array<Record<string, unknown>> }>(GBIF_FIXTURE);
    const limit = query.limit ?? 10;
    return bundle.records.slice(0, limit).map((row, i) =>
      wrapFixture('gbif', String(row.gbifTaxonKey ?? row.speciesId ?? i), row, 'GBIF occurrence fixture', 'CC BY 4.0'),
    );
  },
};

export const pbdbProvider: DataProvider = {
  id: 'pbdb',
  organization: 'Paleobiology Database',
  domains: ['paleontology', 'fossil_occurrence'],
  async healthCheck() {
    try {
      await fetchJson(PBDB_FIXTURE);
      return { ok: true, message: 'PBDB fixture bundle loaded' };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  },
  getAttribution() {
    return {
      organization: 'Paleobiology Database',
      dataset: 'PBDB fossil snapshot (fixture)',
      license: 'CC BY 4.0',
      citation: 'Paleobiology Database',
      sourceUrl: 'https://paleobiodb.org/',
    };
  },
  async getFossilOccurrences(query: OccurrenceQuery) {
    const bundle = await fetchJson<{ records: Array<Record<string, unknown>> }>(PBDB_FIXTURE);
    const limit = query.limit ?? 10;
    return bundle.records.slice(0, limit).map((row, i) =>
      wrapFixture(
        'pbdb',
        String(row.paleobiodbTaxonNo ?? row.speciesId ?? i),
        row,
        'PBDB fossil fixture',
        'CC BY 4.0',
        'observed',
      ),
    );
  },
};

export const colProvider: DataProvider = {
  id: 'col',
  organization: 'Catalogue of Life',
  domains: ['taxonomy'],
  async healthCheck() {
    try {
      await fetchJson(COL_FIXTURE);
      return { ok: true, message: 'Taxonomy search index fixture (COL snapshot blocked)' };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  },
  getAttribution() {
    return {
      organization: 'Catalogue of Life',
      dataset: 'COL taxonomic crosswalk (pending approved snapshot)',
      license: 'COL terms of use',
      citation: 'Catalogue of Life',
      sourceUrl: 'https://www.catalogueoflife.org/',
    };
  },
  async searchTaxa(query: TaxonQuery) {
    const index = await fetchJson<{ entries: Array<Record<string, unknown>> }>(COL_FIXTURE);
    const q = query.scientificName?.toLowerCase();
    const hits = index.entries
      .filter((e) => !q || String(e.scientificName ?? '').toLowerCase().includes(q))
      .slice(0, 5);
    return hits.map((row, i) =>
      wrapFixture('col', String(row.id ?? i), row, 'Catalogue of Life via search index fixture', 'COL terms'),
    );
  },
};

/** Marine placeholder — OBIS/WoRMS adapters pending credentials and API review. */
export const obisProvider: DataProvider = {
  id: 'obis',
  organization: 'OBIS',
  domains: ['marine_biodiversity'],
  async healthCheck() {
    return { ok: false, message: 'OBIS live adapter not configured — marine records use regional fixtures' };
  },
  getAttribution() {
    return {
      organization: 'OBIS',
      dataset: 'Ocean Biodiversity Information System (planned)',
      license: 'OBIS data policy',
      citation: 'OBIS',
      sourceUrl: 'https://obis.org/',
    };
  },
};

export const PROVIDER_REGISTRY: DataProvider[] = [
  nasaProvider,
  gbifProvider,
  pbdbProvider,
  colProvider,
  obisProvider,
];

export function getProvider(id: string): DataProvider | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === id);
}

export async function federationHealthSummary(): Promise<
  Array<{ id: string; ok: boolean; message: string }>
> {
  const results = [];
  for (const provider of PROVIDER_REGISTRY) {
    results.push({ id: provider.id, ...(await provider.healthCheck()) });
  }
  return results;
}
