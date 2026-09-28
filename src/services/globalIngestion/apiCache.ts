/**
 * Hardened API response cache for bounded live federation.
 * Fixture fallback never claims live. Supports TTL, SWR, negative cache, version invalidation.
 */

export type CacheMode = 'live' | 'fixture' | 'cached' | 'snapshot' | 'negative';

export interface ApiCacheKeyParts {
  provider: string;
  endpoint: string;
  parameters: Record<string, string | number | boolean | undefined | null>;
  sourceVersion?: string;
  schemaVersion?: string;
  transformVersion?: string;
}

export interface ApiCacheEntry<T = unknown> {
  key: string;
  storedAt: string;
  expiresAt: string;
  staleAt: string;
  mode: CacheMode;
  provider: string;
  provenance: {
    cacheOrigin: 'memory' | 'disk';
    liveClaim: boolean;
    sourceVersion?: string;
    schemaVersion?: string;
    transformVersion?: string;
  };
  payload: T | null;
  etag?: string;
  corrupted?: boolean;
}

export interface ApiCacheOptions {
  ttlMs?: number;
  swrMs?: number;
  negativeTtlMs?: number;
}

function stableParams(params: ApiCacheKeyParts['parameters']): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k] == null ? '' : String(params[k])}`)
    .join('&');
}

export function buildApiCacheKey(parts: ApiCacheKeyParts): string {
  return [
    parts.provider,
    parts.endpoint,
    stableParams(parts.parameters),
    parts.sourceVersion ?? '',
    parts.schemaVersion ?? '',
    parts.transformVersion ?? '',
  ].join('|');
}

export class ApiCache {
  private map = new Map<string, ApiCacheEntry>();

  constructor(private readonly opts: ApiCacheOptions = {}) {}

  get<T>(key: string, now = Date.now()): {
    entry: ApiCacheEntry<T> | undefined;
    state: 'miss' | 'hit' | 'stale' | 'negative' | 'corrupted';
  } {
    const entry = this.map.get(key) as ApiCacheEntry<T> | undefined;
    if (!entry) return { entry: undefined, state: 'miss' };
    if (entry.corrupted) return { entry, state: 'corrupted' };
    if (entry.mode === 'negative') {
      if (Date.parse(entry.expiresAt) < now) {
        this.map.delete(key);
        return { entry: undefined, state: 'miss' };
      }
      return { entry, state: 'negative' };
    }
    const expires = Date.parse(entry.expiresAt);
    const stale = Date.parse(entry.staleAt);
    if (expires < now && stale < now) {
      this.map.delete(key);
      return { entry: undefined, state: 'miss' };
    }
    if (expires < now && stale >= now) return { entry, state: 'stale' };
    return { entry, state: 'hit' };
  }

  set<T>(
    key: string,
    provider: string,
    mode: CacheMode,
    payload: T | null,
    meta: {
      liveClaim: boolean;
      sourceVersion?: string;
      schemaVersion?: string;
      transformVersion?: string;
      etag?: string;
    },
  ): ApiCacheEntry<T> {
    if (mode === 'fixture' && meta.liveClaim) {
      throw new Error('fixture_fallback_never_claims_live');
    }
    const ttl =
      mode === 'negative'
        ? this.opts.negativeTtlMs ?? 60_000
        : this.opts.ttlMs ?? 15 * 60_000;
    const swr = this.opts.swrMs ?? 5 * 60_000;
    const now = Date.now();
    const entry: ApiCacheEntry<T> = {
      key,
      provider,
      mode,
      payload,
      storedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl).toISOString(),
      staleAt: new Date(now + ttl + swr).toISOString(),
      provenance: {
        cacheOrigin: 'memory',
        liveClaim: mode === 'live' ? meta.liveClaim : false,
        sourceVersion: meta.sourceVersion,
        schemaVersion: meta.schemaVersion,
        transformVersion: meta.transformVersion,
      },
      etag: meta.etag,
    };
    this.map.set(key, entry as ApiCacheEntry);
    return entry;
  }

  invalidateByVersion(opts: {
    sourceVersion?: string;
    schemaVersion?: string;
    transformVersion?: string;
  }): number {
    let n = 0;
    for (const [key, entry] of this.map) {
      const p = entry.provenance;
      if (
        (opts.sourceVersion && p.sourceVersion === opts.sourceVersion) ||
        (opts.schemaVersion && p.schemaVersion === opts.schemaVersion) ||
        (opts.transformVersion && p.transformVersion === opts.transformVersion)
      ) {
        this.map.delete(key);
        n += 1;
      }
    }
    return n;
  }

  markCorrupted(key: string): void {
    const entry = this.map.get(key);
    if (entry) {
      entry.corrupted = true;
      entry.payload = null;
    }
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

/** Simple retry/backoff helper for bounded live calls. */
export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; rateLimited?: () => boolean } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 250;
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    if (opts.rateLimited?.()) {
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw lastErr;
}
