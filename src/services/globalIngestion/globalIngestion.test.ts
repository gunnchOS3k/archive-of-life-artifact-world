import { describe, expect, it } from 'vitest';
import {
  ApiCache,
  buildApiCacheKey,
  buildPartitionedIndex,
  generateSyntheticScaleEntries,
  searchScaleIndex,
} from '@/services/globalIngestion';

describe('global ingestion api cache', () => {
  it('never lets fixture claim live', () => {
    const cache = new ApiCache();
    const key = buildApiCacheKey({
      provider: 'col',
      endpoint: '/nameusage',
      parameters: { q: 'Ursus' },
      sourceVersion: 'v1',
      schemaVersion: 's1',
      transformVersion: 't1',
    });
    expect(() =>
      cache.set(key, 'col', 'fixture', { ok: true }, { liveClaim: true }),
    ).toThrow(/fixture_fallback_never_claims_live/);
  });

  it('supports negative cache and version invalidation', () => {
    const cache = new ApiCache({ ttlMs: 60_000, negativeTtlMs: 60_000 });
    const key = buildApiCacheKey({
      provider: 'gbif',
      endpoint: '/species',
      parameters: { name: 'x' },
      transformVersion: 't1',
    });
    cache.set(key, 'gbif', 'negative', null, { liveClaim: false, transformVersion: 't1' });
    expect(cache.get(key).state).toBe('negative');
    expect(cache.invalidateByVersion({ transformVersion: 't1' })).toBe(1);
    expect(cache.get(key).state).toBe('miss');
  });
});

describe('archivedex scale search', () => {
  it('paginates and resolves synonyms without huge DOM windows', async () => {
    const entries = generateSyntheticScaleEntries(5_000);
    entries[0].synonyms = ['Ancient nameus'];
    const index = buildPartitionedIndex(entries);
    const exact = await searchScaleIndex(index, { exact: 'Ancient nameus', pageSize: 24 });
    expect(exact.synonymResolvedFrom).toBe('Ancient nameus');
    expect(exact.entries.length).toBeLessThanOrEqual(24);
    const page = await searchScaleIndex(index, { prefix: 'synthgenus', page: 2, pageSize: 24 });
    expect(page.entries.length).toBeLessThanOrEqual(24);
    expect(page.page).toBe(2);
  });

  it('aborts stale searches', async () => {
    const index = buildPartitionedIndex(generateSyntheticScaleEntries(100));
    const controller = new AbortController();
    controller.abort();
    const result = await searchScaleIndex(index, { prefix: 's', signal: controller.signal });
    expect(result.error).toBe('aborted');
    expect(result.degraded).toBe(true);
  });
});
