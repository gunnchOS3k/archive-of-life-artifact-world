import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataProvider, FederatedRecord } from './types';

vi.mock('./registry', () => ({
  getProvider: vi.fn(),
  PROVIDER_REGISTRY: [],
  federationHealthSummary: vi.fn(async () => ({})),
}));

import { getProvider } from './registry';
import { FederationService } from './FederationService';

const getProviderMock = vi.mocked(getProvider);

function liveRecord(providerId: string, id = '1'): FederatedRecord {
  return {
    providerId,
    sourceRecordId: id,
    retrievedAt: new Date().toISOString(),
    license: 'CC0',
    attribution: `${providerId} attr`,
    scientificName: 'Panthera leo',
    confidence: 'observed',
    interpretation: 'observed',
    cacheStatus: 'live',
    payload: {},
  };
}

function fixtureRecord(providerId: string): FederatedRecord {
  return { ...liveRecord(providerId, 'fx'), cacheStatus: 'fixture', attribution: `${providerId} fixture` };
}

function cachedRecord(providerId: string): FederatedRecord {
  return { ...liveRecord(providerId, 'cache'), cacheStatus: 'cached', attribution: `${providerId} cached` };
}

function provider(
  id: string,
  methods: Partial<DataProvider>,
): DataProvider {
  return {
    id,
    organization: id,
    domains: [],
    healthCheck: async () => ({ ok: true, message: 'ok' }),
    getAttribution: () => ({
      organization: id,
      dataset: id,
      license: 'CC0',
      citation: id,
    }),
    ...methods,
  };
}

function wireProviders(map: Record<string, DataProvider | undefined>) {
  getProviderMock.mockImplementation((id: string) => map[id]);
}

describe('FederationService.getSpeciesEvidenceResult', () => {
  let service: FederationService;

  beforeEach(() => {
    service = new FederationService();
    getProviderMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates when all providers return successfully', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: async () => [liveRecord('col')],
      }),
      gbif: provider('gbif', {
        getOccurrences: async () => [liveRecord('gbif')],
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 200,
    });
    expect(result.records.map((r) => r.providerId).sort()).toEqual(['col', 'gbif']);
    expect(result.failures).toHaveLength(0);
    expect(result.status).toBe('live');
  });

  it('does not block all providers when one provider times out', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: async () => [liveRecord('col')],
      }),
      gbif: provider('gbif', {
        getOccurrences: () => new Promise(() => {}),
      }),
    });
    const started = Date.now();
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 80,
    });
    expect(Date.now() - started).toBeLessThan(1500);
    expect(result.records.some((r) => r.providerId === 'col')).toBe(true);
    expect(result.failures.some((f) => f.providerId === 'gbif' && f.timedOut)).toBe(true);
    expect(result.status).toBe('partial');
  });

  it('preserves successful records when one provider throws', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: async () => [liveRecord('col')],
      }),
      gbif: provider('gbif', {
        getOccurrences: async () => {
          throw new Error('gbif boom');
        },
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 200,
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.providerId).toBe('col');
    expect(result.failures.some((f) => f.providerId === 'gbif')).toBe(true);
    expect(result.status).toBe('partial');
  });

  it('reports error status when multiple providers fail and none succeed', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: async () => {
          throw new Error('col fail');
        },
      }),
      gbif: provider('gbif', {
        getOccurrences: async () => {
          throw new Error('gbif fail');
        },
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 100,
    });
    expect(result.records).toHaveLength(0);
    expect(result.failures.length).toBeGreaterThanOrEqual(2);
    expect(result.status).toBe('error');
  });

  it('keeps live results when a fixture-capable provider is also available', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: async () => [liveRecord('col')],
      }),
      gbif: provider('gbif', {
        getOccurrences: async () => [fixtureRecord('gbif')],
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 200,
    });
    expect(result.records.some((r) => r.cacheStatus === 'live')).toBe(true);
    expect(result.records.some((r) => r.cacheStatus === 'fixture')).toBe(true);
    expect(result.status).toBe('live');
  });

  it('surfaces cached evidence when all live providers fail but cache exists', async () => {
    wireProviders({
      gbif: provider('gbif', {
        getOccurrences: async () => [cachedRecord('gbif')],
      }),
      col: provider('col', {
        searchTaxa: async () => {
          throw new Error('live down');
        },
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 200,
    });
    expect(result.records.some((r) => r.cacheStatus === 'cached')).toBe(true);
    expect(result.status).toBe('partial');
  });

  it('surfaces fixture evidence when all live providers fail but fixture exists', async () => {
    wireProviders({
      gbif: provider('gbif', {
        getOccurrences: async () => [fixtureRecord('gbif')],
      }),
      col: provider('col', {
        searchTaxa: async () => {
          throw new Error('live down');
        },
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 200,
    });
    expect(result.records.every((r) => r.cacheStatus === 'fixture')).toBe(true);
    expect(result.status).toBe('partial');
  });

  it('returns empty when no linked evidence exists', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: async () => [],
      }),
    });
    const result = await service.getSpeciesEvidenceResult('unknown_species', 'Unknown sp.', {
      timeoutMs: 100,
    });
    expect(result.records).toHaveLength(0);
    expect(result.status).toBe('empty');
  });

  it('aborts cleanly when the panel closes before requests finish', async () => {
    const controller = new AbortController();
    wireProviders({
      gbif: provider('gbif', {
        getOccurrences: () => new Promise(() => {}),
      }),
    });
    controller.abort();
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 500,
      signal: controller.signal,
    });
    expect(result.failures.some((f) => f.reason === 'aborted')).toBe(true);
  });

  it('always resolves loading-bound aggregation (no infinite hang)', async () => {
    wireProviders({
      col: provider('col', {
        searchTaxa: () => new Promise(() => {}),
      }),
      gbif: provider('gbif', {
        getOccurrences: () => new Promise(() => {}),
      }),
      pbdb: provider('pbdb', {
        getFossilOccurrences: () => new Promise(() => {}),
      }),
    });
    const result = await service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', {
      timeoutMs: 60,
    });
    expect(result.status).toBe('timed_out');
    expect(result.failures.every((f) => f.timedOut)).toBe(true);
  });

  it('regression: Sources and Evidence infinite-loading defect — hung provider must not stall federation', async () => {
    wireProviders({
      worms: provider('worms', {
        searchTaxa: () => new Promise(() => {}),
      }),
      col: provider('col', {
        searchTaxa: async () => [liveRecord('col')],
      }),
    });
    const result = await Promise.race([
      service.getSpeciesEvidenceResult('african_lion', 'Panthera leo', { timeoutMs: 70 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('federation hung past safety bound')), 1500),
      ),
    ]);
    expect(result.records.some((r) => r.providerId === 'col')).toBe(true);
    expect(result.failures.some((f) => f.providerId === 'worms' && f.timedOut)).toBe(true);
  });
});
