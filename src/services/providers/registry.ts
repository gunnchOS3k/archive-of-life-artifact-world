import type {
  DataProvider,
  EnvironmentalLayerQuery,
  FederatedRecord,
  OccurrenceQuery,
  TaxonQuery,
} from './types';

const NASA_METADATA = '/data/earth/nasa_metadata_cache.json';
const GBIF_FIXTURE = '/data/bundles/gbif-occurrences.json';
const PBDB_FIXTURE = '/data/bundles/fossil-pbdb.json';
const COL_FIXTURE = '/data/bundles/search-index.json';
const BLOCKED_FIXTURE = '/data/fixtures/blocked-providers.json';

type BlockedProvidersFixture = {
  providers: Array<Record<string, unknown> & { id: string }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function numOrUndefined(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function strOrUndefined(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json() as Promise<T>;
}

async function fetchLiveJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Live fetch failed ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function wrapRecord<T>(
  providerId: string,
  sourceRecordId: string,
  payload: T,
  attribution: string,
  license: string,
  cacheStatus: FederatedRecord['cacheStatus'],
  interpretation: FederatedRecord['interpretation'] = 'observed',
  extras: Partial<FederatedRecord<T>> = {},
): FederatedRecord<T> {
  return {
    providerId,
    sourceRecordId,
    retrievedAt: nowIso(),
    license,
    attribution,
    confidence: interpretation,
    interpretation,
    cacheStatus,
    payload,
    ...extras,
  };
}

function wrapFixture<T>(
  providerId: string,
  sourceRecordId: string,
  payload: T,
  attribution: string,
  license: string,
  interpretation: FederatedRecord['interpretation'] = 'observed',
  extras: Partial<FederatedRecord<T>> = {},
): FederatedRecord<T> {
  return wrapRecord(
    providerId,
    sourceRecordId,
    payload,
    attribution,
    license,
    'fixture',
    interpretation,
    extras,
  );
}

function matchesSpecies(row: Record<string, unknown>, query: OccurrenceQuery): boolean {
  if (!query.taxonId && !query.scientificName) return true;
  const sid = String(row.speciesId ?? '').toLowerCase();
  const sci = String(row.scientificName ?? row.acceptedScientificName ?? '').toLowerCase();
  if (query.taxonId && sid === query.taxonId.toLowerCase()) return true;
  if (query.scientificName && sci.includes(query.scientificName.toLowerCase())) return true;
  if (query.taxonId && sid.includes(query.taxonId.toLowerCase().replace(/_/g, ' '))) return true;
  return false;
}

async function loadBlockedProvider(id: string): Promise<Record<string, unknown> | null> {
  try {
    const fixture = await fetchJson<BlockedProvidersFixture>(BLOCKED_FIXTURE);
    return fixture.providers.find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}

export const nasaProvider: DataProvider = {
  id: 'nasa',
  organization: 'NASA',
  domains: ['earth_observation', 'climate', 'environmental_change'],
  async healthCheck() {
    try {
      await fetchLiveJson('https://eonet.gsfc.nasa.gov/api/v3/events?limit=1');
      return { ok: true, message: 'NASA EONET live API reachable' };
    } catch {
      try {
        await fetchJson(NASA_METADATA);
        return { ok: true, message: 'NASA metadata cache only — EONET unreachable' };
      } catch (e) {
        return { ok: false, message: String(e) };
      }
    }
  },
  getAttribution() {
    return {
      organization: 'NASA',
      dataset: 'Earthdata / EONET / POWER',
      license: 'NASA open data policy (per dataset)',
      citation: 'NASA Earthdata',
      sourceUrl: 'https://www.earthdata.nasa.gov/',
    };
  },
  async getEnvironmentalLayer(query: EnvironmentalLayerQuery) {
    try {
      const live = await fetchLiveJson<{ events?: Array<Record<string, unknown>> }>(
        'https://eonet.gsfc.nasa.gov/api/v3/events?limit=5',
      );
      if (live.events?.length) {
        return wrapRecord(
          'nasa',
          `${query.regionId}:${query.layerId}:eonet`,
          { events: live.events, layerId: query.layerId, regionId: query.regionId },
          'NASA EONET live events',
          'NASA open data policy',
          'live',
          'inferred',
          {
            sourceUrl: 'https://eonet.gsfc.nasa.gov/',
            qualityFlag: 'eonet_events_live',
            eventDate: strOrUndefined(live.events[0]?.geometry
              ? (live.events[0].geometry as Array<{ date?: string }>)?.[0]?.date
              : undefined),
          },
        );
      }
    } catch {
      /* fall through to metadata cache */
    }

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
      {
        sourceUrl: 'https://www.earthdata.nasa.gov/',
        qualityFlag: 'nasa_metadata_cache',
      },
    );
  },
};

export const gbifProvider: DataProvider = {
  id: 'gbif',
  organization: 'GBIF',
  domains: ['biodiversity', 'occurrence', 'taxonomy'],
  async healthCheck() {
    try {
      await fetchLiveJson<{ count?: number }>('https://api.gbif.org/v1/occurrence/search?limit=1');
      return { ok: true, message: 'GBIF live API reachable (fixture fallback available)' };
    } catch {
      try {
        await fetchJson(GBIF_FIXTURE);
        return { ok: true, message: 'GBIF fixture only — live API unreachable' };
      } catch (e) {
        return { ok: false, message: String(e) };
      }
    }
  },
  getAttribution() {
    return {
      organization: 'GBIF',
      dataset: 'GBIF Occurrence API + curated fixture snapshot',
      license: 'CC BY 4.0 (verify per record)',
      citation: 'GBIF.org',
      sourceUrl: 'https://www.gbif.org/',
    };
  },
  async getOccurrences(query: OccurrenceQuery) {
    const limit = query.limit ?? 5;
    const name = query.scientificName?.trim();
    if (name) {
      try {
        const live = await fetchLiveJson<{
          results?: Array<Record<string, unknown>>;
        }>(
          `https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(name)}&limit=${limit}`,
        );
        const rows = live.results ?? [];
        if (rows.length) {
          return rows.map((row, i) =>
            wrapRecord(
              'gbif',
              String(row.key ?? row.gbifID ?? i),
              row,
              'GBIF Occurrence API',
              String(row.license ?? 'CC BY 4.0'),
              'live',
              'observed',
              {
                scientificName: strOrUndefined(row.scientificName),
                acceptedName: strOrUndefined(row.acceptedScientificName),
                taxonomicRank: strOrUndefined(row.taxonRank),
                eventDate: strOrUndefined(row.eventDate),
                latitude: numOrUndefined(row.decimalLatitude),
                longitude: numOrUndefined(row.decimalLongitude),
                sourceUrl: row.key
                  ? `https://www.gbif.org/occurrence/${row.key}`
                  : 'https://www.gbif.org/',
                geographicPrecision: row.coordinateUncertaintyInMeters
                  ? `${row.coordinateUncertaintyInMeters}m`
                  : row.decimalLatitude != null
                    ? 'point'
                    : 'unknown',
                temporalPrecision: row.eventDate ? 'eventDate' : 'unknown',
                qualityFlag: Array.isArray(row.issues) && row.issues.length
                  ? `gbif_issues:${(row.issues as unknown[]).slice(0, 3).join('|')}`
                  : strOrUndefined(row.basisOfRecord) ?? 'gbif_live',
              },
            ),
          );
        }
      } catch {
        /* fall through to fixture */
      }
    }

    const bundle = await fetchJson<{ records: Array<Record<string, unknown>> }>(GBIF_FIXTURE);
    const filtered = bundle.records.filter((row) => matchesSpecies(row, query));
    const rows = (filtered.length ? filtered : bundle.records).slice(0, limit);
    return rows.map((row, i) =>
      wrapFixture(
        'gbif',
        String(row.gbifTaxonKey ?? row.speciesId ?? i),
        row,
        'GBIF occurrence fixture',
        'CC BY 4.0',
        'observed',
        {
          scientificName: strOrUndefined(row.scientificName),
          acceptedName: strOrUndefined(row.acceptedScientificName),
          latitude: numOrUndefined(row.decimalLatitude ?? row.latitude),
          longitude: numOrUndefined(row.decimalLongitude ?? row.longitude),
          eventDate: strOrUndefined(row.eventDate),
          qualityFlag: 'gbif_fixture',
        },
      ),
    );
  },
};

export const pbdbProvider: DataProvider = {
  id: 'pbdb',
  organization: 'Paleobiology Database',
  domains: ['paleontology', 'fossil_occurrence'],
  async healthCheck() {
    try {
      await fetchLiveJson('https://paleobiodb.org/data1.2/config.json');
      return { ok: true, message: 'PBDB live API reachable (fixture fallback available)' };
    } catch {
      try {
        await fetchJson(PBDB_FIXTURE);
        return { ok: true, message: 'PBDB fixture only — live API unreachable' };
      } catch (e) {
        return { ok: false, message: String(e) };
      }
    }
  },
  getAttribution() {
    return {
      organization: 'Paleobiology Database',
      dataset: 'PBDB Data Service 1.2 + curated fossil fixture',
      license: 'CC BY 4.0',
      citation: 'Paleobiology Database',
      sourceUrl: 'https://paleobiodb.org/',
    };
  },
  async getFossilOccurrences(query: OccurrenceQuery) {
    const limit = query.limit ?? 5;
    const name = query.scientificName?.trim();
    if (name) {
      try {
        const live = await fetchLiveJson<{
          records?: Array<Record<string, unknown>>;
        }>(
          `https://paleobiodb.org/data1.2/occs/list.json?taxon_name=${encodeURIComponent(name)}&limit=${limit}&show=coords,attr,class,time`,
        );
        const rows = live.records ?? [];
        if (rows.length) {
          return rows.map((row, i) =>
            wrapRecord(
              'pbdb',
              String(row.occurrence_no ?? row.oid ?? i),
              row,
              'Paleobiology Database API',
              'CC BY 4.0',
              'live',
              'observed',
              {
                scientificName: strOrUndefined(row.identified_name ?? row.accepted_name ?? row.taxon_name),
                acceptedName: strOrUndefined(row.accepted_name),
                taxonomicRank: strOrUndefined(row.taxon_rank ?? row.rank),
                eventDate: [row.early_interval, row.late_interval]
                  .filter(Boolean)
                  .map(String)
                  .join('–') || undefined,
                latitude: numOrUndefined(row.lat),
                longitude: numOrUndefined(row.lng),
                sourceUrl: row.occurrence_no
                  ? `https://paleobiodb.org/classic/basicOccurrenceInfo?occurrence_no=${row.occurrence_no}`
                  : 'https://paleobiodb.org/',
                geographicPrecision: row.lat != null ? 'point' : 'unknown',
                temporalPrecision: row.early_interval || row.late_interval ? 'interval' : 'unknown',
                qualityFlag: 'pbdb_live',
              },
            ),
          );
        }
      } catch {
        /* fall through */
      }
    }

    const bundle = await fetchJson<{ records: Array<Record<string, unknown>> }>(PBDB_FIXTURE);
    const filtered = bundle.records.filter((row) => matchesSpecies(row, query));
    const rows = (filtered.length ? filtered : bundle.records).slice(0, limit);
    return rows.map((row, i) =>
      wrapFixture(
        'pbdb',
        String(row.paleobiodbTaxonNo ?? row.speciesId ?? i),
        row,
        'PBDB fossil fixture',
        'CC BY 4.0',
        'observed',
        {
          scientificName: strOrUndefined(row.scientificName),
          latitude: numOrUndefined(row.latitude ?? row.lat),
          longitude: numOrUndefined(row.longitude ?? row.lng),
          qualityFlag: 'pbdb_fixture',
        },
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
      const name = encodeURIComponent('Anax junius');
      await fetchLiveJson(`https://api.checklistbank.org/dataset/3LR/nameusage/search?q=${name}&limit=1`);
      return { ok: true, message: 'Catalogue of Life ChecklistBank API reachable' };
    } catch {
      try {
        await fetchJson(COL_FIXTURE);
        return { ok: true, message: 'COL search-index fixture only — live API unreachable' };
      } catch (e) {
        return { ok: false, message: String(e) };
      }
    }
  },
  getAttribution() {
    return {
      organization: 'Catalogue of Life',
      dataset: 'ChecklistBank / COL + local search-index fixture',
      license: 'COL terms of use',
      citation: 'Catalogue of Life',
      sourceUrl: 'https://www.catalogueoflife.org/',
    };
  },
  async searchTaxa(query: TaxonQuery) {
    const q = query.scientificName?.trim();
    if (q) {
      try {
        const live = await fetchLiveJson<{
          result?: Array<{ usage?: Record<string, unknown>; id?: string }>;
        }>(
          `https://api.checklistbank.org/dataset/3LR/nameusage/search?q=${encodeURIComponent(q)}&limit=5`,
        );
        const hits = live.result ?? [];
        if (hits.length) {
          return hits.map((hit, i) => {
            const usage = (hit.usage ?? hit) as Record<string, unknown>;
            return wrapRecord(
              'col',
              String(hit.id ?? usage.id ?? i),
              usage,
              'Catalogue of Life ChecklistBank',
              'COL terms',
              'live',
              'observed',
              {
                scientificName: strOrUndefined(usage.scientificName ?? usage.label ?? usage.name),
                acceptedName: strOrUndefined(
                  (usage.accepted as Record<string, unknown> | undefined)?.name ??
                    usage.acceptedName,
                ),
                taxonomicRank: strOrUndefined(usage.rank ?? usage.status),
                sourceUrl: 'https://www.catalogueoflife.org/',
                qualityFlag: 'col_live',
              },
            );
          });
        }
      } catch {
        /* fall through */
      }
    }

    const index = await fetchJson<{ entries: Array<Record<string, unknown>> }>(COL_FIXTURE);
    const needle = q?.toLowerCase();
    const hits = index.entries
      .filter((e) => !needle || String(e.scientificName ?? '').toLowerCase().includes(needle))
      .slice(0, 5);
    return hits.map((row, i) =>
      wrapFixture(
        'col',
        String(row.id ?? i),
        row,
        'Catalogue of Life via search index fixture',
        'COL terms',
        'observed',
        {
          scientificName: strOrUndefined(row.scientificName),
          taxonomicRank: strOrUndefined(row.rank),
          qualityFlag: 'col_fixture',
        },
      ),
    );
  },
};

export const wormsProvider: DataProvider = {
  id: 'worms',
  organization: 'WoRMS',
  domains: ['marine_biodiversity', 'taxonomy'],
  async healthCheck() {
    try {
      await fetchLiveJson(
        'https://www.marinespecies.org/rest/AphiaRecordsByName/Phoca%20vitulina?like=false&marine_only=true&offset=1',
      );
      return { ok: true, message: 'WoRMS REST API reachable' };
    } catch (e) {
      return { ok: false, message: `WoRMS unavailable: ${String(e)}` };
    }
  },
  getAttribution() {
    return {
      organization: 'World Register of Marine Species',
      dataset: 'WoRMS REST web services',
      license: 'CC BY 4.0',
      citation: 'WoRMS Editorial Board',
      sourceUrl: 'https://www.marinespecies.org/',
    };
  },
  async searchTaxa(query: TaxonQuery) {
    const q = query.scientificName?.trim();
    if (!q) return [];
    try {
      const rows = await fetchLiveJson<Array<Record<string, unknown>>>(
        `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(q)}?like=true&marine_only=false&offset=1`,
      );
      return (rows ?? []).slice(0, 5).map((row, i) =>
        wrapRecord(
          'worms',
          String(row.AphiaID ?? i),
          row,
          'World Register of Marine Species',
          'CC BY 4.0',
          'live',
          'observed',
          {
            scientificName: strOrUndefined(row.scientificname ?? row.scientificName),
            acceptedName: strOrUndefined(row.valid_name),
            taxonomicRank: strOrUndefined(row.rank),
            sourceUrl: row.AphiaID
              ? `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${row.AphiaID}`
              : 'https://www.marinespecies.org/',
            qualityFlag: row.status ? `worms_status:${row.status}` : 'worms_live',
          },
        ),
      );
    } catch {
      return [];
    }
  },
  async getMarineOccurrences(query: OccurrenceQuery) {
    if (!query.scientificName) return [];
    return this.searchTaxa!({ scientificName: query.scientificName });
  },
};

/**
 * OBIS Ocean Biodiversity Information System — live occurrence API.
 * No API key required for basic occurrence search.
 */
export const obisProvider: DataProvider = {
  id: 'obis',
  organization: 'OBIS',
  domains: ['marine_biodiversity', 'occurrence'],
  async healthCheck() {
    try {
      await fetchLiveJson('https://api.obis.org/v3/occurrence?size=1');
      return { ok: true, message: 'OBIS live occurrence API reachable' };
    } catch (e) {
      return { ok: false, message: `OBIS unavailable: ${String(e)}` };
    }
  },
  getAttribution() {
    return {
      organization: 'OBIS',
      dataset: 'Ocean Biodiversity Information System occurrence API',
      license: 'OBIS data policy (verify per record)',
      citation: 'OBIS',
      sourceUrl: 'https://obis.org/',
    };
  },
  async getMarineOccurrences(query: OccurrenceQuery) {
    const limit = query.limit ?? 5;
    const name = query.scientificName?.trim();
    if (!name) return [];
    try {
      const live = await fetchLiveJson<{
        results?: Array<Record<string, unknown>>;
      }>(
        `https://api.obis.org/v3/occurrence?scientificname=${encodeURIComponent(name)}&size=${limit}`,
      );
      return (live.results ?? []).map((row, i) =>
        wrapRecord(
          'obis',
          String(row.id ?? row.occurrenceID ?? i),
          row,
          'OBIS Occurrence API',
          'OBIS data policy',
          'live',
          'observed',
          {
            scientificName: strOrUndefined(row.scientificName ?? row.species),
            acceptedName: strOrUndefined(row.acceptedNameUsage ?? row.acceptedScientificName),
            taxonomicRank: strOrUndefined(row.taxonRank),
            eventDate: strOrUndefined(row.eventDate ?? row.date_year),
            latitude: numOrUndefined(row.decimalLatitude ?? row.decimallatitude),
            longitude: numOrUndefined(row.decimalLongitude ?? row.decimallongitude),
            sourceUrl: row.id ? `https://obis.org/taxon/${row.id}` : 'https://obis.org/',
            qualityFlag: 'obis_live',
            geographicPrecision: row.decimalLatitude != null ? 'point' : 'unknown',
            temporalPrecision: row.eventDate ? 'eventDate' : 'unknown',
          },
        ),
      );
    } catch {
      return [];
    }
  },
  async getOccurrences(query: OccurrenceQuery) {
    return this.getMarineOccurrences!(query);
  },
};

/**
 * iNaturalist — public read API, no auth required for observation search.
 */
export const inaturalistProvider: DataProvider = {
  id: 'inaturalist',
  organization: 'iNaturalist',
  domains: ['biodiversity', 'occurrence', 'citizen_science'],
  async healthCheck() {
    try {
      await fetchLiveJson('https://api.inaturalist.org/v1/observations?per_page=1');
      return {
        ok: true,
        message: 'iNaturalist API reachable (no auth required for read observations)',
      };
    } catch (e) {
      return { ok: false, message: `iNaturalist unavailable: ${String(e)}` };
    }
  },
  getAttribution() {
    return {
      organization: 'iNaturalist',
      dataset: 'iNaturalist Observations API',
      license: 'Verify per observation license',
      citation: 'iNaturalist',
      sourceUrl: 'https://www.inaturalist.org/',
    };
  },
  async getOccurrences(query: OccurrenceQuery) {
    const limit = query.limit ?? 5;
    const name = query.scientificName?.trim();
    if (!name) return [];
    try {
      const live = await fetchLiveJson<{
        results?: Array<Record<string, unknown>>;
      }>(
        `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(name)}&per_page=${limit}`,
      );
      return (live.results ?? []).map((row, i) => {
        const taxon = (row.taxon as Record<string, unknown> | undefined) ?? {};
        const loc = strOrUndefined(row.location);
        let latitude: number | undefined;
        let longitude: number | undefined;
        if (loc?.includes(',')) {
          const [lat, lng] = loc.split(',').map((p) => Number(p.trim()));
          latitude = Number.isFinite(lat) ? lat : undefined;
          longitude = Number.isFinite(lng) ? lng : undefined;
        }
        latitude ??= numOrUndefined(row.latitude);
        longitude ??= numOrUndefined(row.longitude);
        return wrapRecord(
          'inaturalist',
          String(row.id ?? i),
          row,
          'iNaturalist Observations API',
          strOrUndefined(row.license_code) ?? 'iNaturalist terms',
          'live',
          'observed',
          {
            scientificName: strOrUndefined(taxon.name ?? row.species_guess),
            taxonomicRank: strOrUndefined(taxon.rank),
            eventDate: strOrUndefined(row.observed_on ?? row.time_observed_at),
            latitude,
            longitude,
            sourceUrl: strOrUndefined(row.uri) ?? 'https://www.inaturalist.org/',
            qualityFlag: strOrUndefined(row.quality_grade) ?? 'inaturalist_live',
            geographicPrecision: latitude != null ? 'point' : 'unknown',
            temporalPrecision: row.observed_on ? 'eventDate' : 'unknown',
          },
        );
      });
    } catch {
      // Optional fixture fallback: empty array on failure (no local fixture bundled).
      return [];
    }
  },
};

/**
 * Neotoma Paleoecology Database — live health probe; fossil results fall back to
 * a clearly labeled reconstructed paleo-site proxy when live fetch fails.
 */
export const neotomaProvider: DataProvider = {
  id: 'neotoma',
  organization: 'Neotoma Paleoecology Database',
  domains: ['paleontology', 'paleoecology', 'fossil_occurrence'],
  async healthCheck() {
    try {
      await fetchLiveJson('https://api.neotomadb.org/v2.0/data/datasets?limit=1');
      return { ok: true, message: 'Neotoma DB live API reachable' };
    } catch (e) {
      return {
        ok: false,
        message: `Neotoma unavailable (fixture paleo-site proxy available): ${String(e)}`,
      };
    }
  },
  getAttribution() {
    return {
      organization: 'Neotoma Paleoecology Database',
      dataset: 'Neotoma API v2.0 (+ fixture paleo-site proxy)',
      license: 'CC BY 4.0',
      citation: 'Neotoma Paleoecology Database',
      sourceUrl: 'https://www.neotomadb.org/',
    };
  },
  async getFossilOccurrences(query: OccurrenceQuery) {
    const limit = query.limit ?? 1;
    const name = query.scientificName?.trim();
    if (name) {
      try {
        const live = await fetchLiveJson<{
          data?: Array<Record<string, unknown>>;
        }>(
          `https://api.neotomadb.org/v2.0/data/datasets?taxonname=${encodeURIComponent(name)}&limit=${limit}`,
        );
        const rows = live.data ?? [];
        if (rows.length) {
          return rows.slice(0, limit).map((row, i) =>
            wrapRecord(
              'neotoma',
              String(row.datasetid ?? row.DatasetID ?? i),
              row,
              'Neotoma Paleoecology Database API',
              'CC BY 4.0',
              'live',
              'observed',
              {
                scientificName: name,
                eventDate: strOrUndefined(row.agerange ?? row.AgeOldest ?? row.AgeYoungest),
                latitude: numOrUndefined(row.latitude ?? row.Latitude),
                longitude: numOrUndefined(row.longitude ?? row.Longitude),
                sourceUrl: 'https://www.neotomadb.org/',
                qualityFlag: 'neotoma_live',
                geographicPrecision: 'site',
                temporalPrecision: 'agerange',
              },
            ),
          );
        }
      } catch {
        /* fall through to reconstructed proxy */
      }
    }

    return [
      wrapFixture(
        'neotoma',
        `proxy:${name ?? query.taxonId ?? 'unknown'}`,
        {
          note: 'Fixture-backed reconstructed paleo site proxy — live Neotoma fetch failed or returned no rows',
          query: { scientificName: name, taxonId: query.taxonId },
          proxyType: 'scientific_paleo_site',
        },
        'Neotoma Paleoecology Database (fixture paleo-site proxy)',
        'CC BY 4.0',
        'reconstructed',
        {
          scientificName: name,
          sourceUrl: 'https://www.neotomadb.org/',
          qualityFlag: 'neotoma_fixture_paleo_site_proxy',
          geographicPrecision: 'unknown',
          temporalPrecision: 'unknown',
        },
      ),
    ].slice(0, limit);
  },
};

/** NOAA — fixture/stub; endpoint scope not finalized. */
export const noaaProvider: DataProvider = {
  id: 'noaa',
  organization: 'NOAA',
  domains: ['oceanography', 'climate', 'environmental_change'],
  async healthCheck() {
    return { ok: false, message: 'endpoint scope not finalized' };
  },
  getAttribution() {
    return {
      organization: 'NOAA',
      dataset: 'NOAA environmental layers (fixture placeholder)',
      license: 'US Government work / verify per dataset',
      citation: 'NOAA',
      sourceUrl: 'https://www.noaa.gov/',
    };
  },
  async getEnvironmentalLayer(query: EnvironmentalLayerQuery) {
    const entry = await loadBlockedProvider('noaa');
    const payload = entry ?? {
      id: 'noaa',
      message: 'endpoint scope not finalized',
      layerId: query.layerId,
      regionId: query.regionId,
    };
    return wrapFixture(
      'noaa',
      `${query.regionId}:${query.layerId}`,
      payload,
      'NOAA fixture placeholder',
      'US Government work',
      'inferred',
      {
        sourceUrl: 'https://www.noaa.gov/',
        qualityFlag: 'noaa_fixture_scope_not_finalized',
      },
    );
  },
};

/** USGS — fixture/stub; endpoint scope not finalized. */
export const usgsProvider: DataProvider = {
  id: 'usgs',
  organization: 'USGS',
  domains: ['geology', 'hydrology', 'earth_observation'],
  async healthCheck() {
    return { ok: false, message: 'endpoint scope not finalized' };
  },
  getAttribution() {
    return {
      organization: 'USGS',
      dataset: 'USGS layers (fixture placeholder)',
      license: 'US Government work / verify per dataset',
      citation: 'U.S. Geological Survey',
      sourceUrl: 'https://www.usgs.gov/',
    };
  },
  async getEnvironmentalLayer(query: EnvironmentalLayerQuery) {
    const entry = await loadBlockedProvider('usgs');
    const payload = entry ?? {
      id: 'usgs',
      message: 'endpoint scope not finalized',
      layerId: query.layerId,
      regionId: query.regionId,
    };
    return wrapFixture(
      'usgs',
      `${query.regionId}:${query.layerId}`,
      payload,
      'USGS fixture placeholder',
      'US Government work',
      'inferred',
      {
        sourceUrl: 'https://www.usgs.gov/',
        qualityFlag: 'usgs_fixture_scope_not_finalized',
      },
    );
  },
};

/** Smithsonian — fixture/unavailable with attribution URL. */
export const smithsonianProvider: DataProvider = {
  id: 'smithsonian',
  organization: 'Smithsonian Institution',
  domains: ['museum', 'taxonomy', 'collections'],
  async healthCheck() {
    return {
      ok: false,
      message: 'endpoint scope not finalized — see https://www.si.edu/',
    };
  },
  getAttribution() {
    return {
      organization: 'Smithsonian Institution',
      dataset: 'Smithsonian collections (fixture placeholder)',
      license: 'Verify per collection',
      citation: 'Smithsonian Institution',
      sourceUrl: 'https://www.si.edu/',
    };
  },
  async searchTaxa(query: TaxonQuery) {
    const entry = await loadBlockedProvider('smithsonian');
    const payload = {
      ...(entry ?? { id: 'smithsonian', message: 'endpoint scope not finalized' }),
      query,
    };
    return [
      wrapFixture(
        'smithsonian',
        'si_placeholder',
        payload,
        'Smithsonian Institution (fixture unavailable)',
        'Verify per collection',
        'unknown',
        {
          scientificName: query.scientificName,
          sourceUrl: 'https://www.si.edu/',
          qualityFlag: 'smithsonian_fixture_unavailable',
        },
      ),
    ];
  },
};

/**
 * Encyclopedia of Life — try public search API; otherwise empty fixture + health message.
 */
export const eolProvider: DataProvider = {
  id: 'eol',
  organization: 'Encyclopedia of Life',
  domains: ['taxonomy', 'media'],
  async healthCheck() {
    try {
      await fetchLiveJson(
        'https://eol.org/api/search/1.0.json?q=Anax%20junius&page=1',
      );
      return { ok: true, message: 'EOL search API reachable' };
    } catch (e) {
      return {
        ok: false,
        message: `EOL unavailable (fixture empty on search fail): ${String(e)}`,
      };
    }
  },
  getAttribution() {
    return {
      organization: 'Encyclopedia of Life',
      dataset: 'EOL Search API 1.0',
      license: 'EOL terms of use',
      citation: 'Encyclopedia of Life',
      sourceUrl: 'https://eol.org/',
    };
  },
  async searchTaxa(query: TaxonQuery) {
    const q = query.scientificName?.trim();
    if (!q) return [];
    try {
      const live = await fetchLiveJson<{
        results?: Array<Record<string, unknown>>;
      }>(`https://eol.org/api/search/1.0.json?q=${encodeURIComponent(q)}&page=1`);
      const rows = live.results ?? [];
      if (!rows.length) return [];
      return rows.slice(0, 5).map((row, i) =>
        wrapRecord(
          'eol',
          String(row.id ?? i),
          row,
          'Encyclopedia of Life Search API',
          'EOL terms',
          'live',
          'observed',
          {
            scientificName: strOrUndefined(row.title ?? row.scientificName),
            sourceUrl: strOrUndefined(row.link) ?? 'https://eol.org/',
            qualityFlag: 'eol_live',
          },
        ),
      );
    } catch {
      // Fixture empty on fail — healthCheck documents unavailability.
      return [];
    }
  },
};

export const PROVIDER_REGISTRY: DataProvider[] = [
  nasaProvider,
  gbifProvider,
  pbdbProvider,
  colProvider,
  wormsProvider,
  obisProvider,
  inaturalistProvider,
  neotomaProvider,
  noaaProvider,
  usgsProvider,
  smithsonianProvider,
  eolProvider,
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
