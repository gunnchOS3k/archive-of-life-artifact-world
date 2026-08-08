/**
 * In-memory + optional disk-backed response cache for ingest pages.
 * Cached live responses keep mode=live provenance; fixture never upgrades to live.
 */

export interface CacheEntry<T = unknown> {
  key: string;
  storedAt: string;
  expiresAt: string;
  source: string;
  mode: 'live' | 'fixture' | 'cached' | 'snapshot';
  payload: T;
}

export class IngestCache {
  private map = new Map<string, CacheEntry>();

  constructor(private readonly defaultTtlMs = 15 * 60_000) {}

  static key(parts: Array<string | number | undefined>): string {
    return parts.map((p) => (p == null ? '' : String(p))).join('|');
  }

  get<T>(key: string): CacheEntry<T> | undefined {
    const hit = this.map.get(key) as CacheEntry<T> | undefined;
    if (!hit) return undefined;
    if (Date.parse(hit.expiresAt) < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit;
  }

  set<T>(
    key: string,
    source: string,
    mode: CacheEntry['mode'],
    payload: T,
    ttlMs = this.defaultTtlMs,
  ): CacheEntry<T> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      source,
      mode,
      payload,
      storedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    };
    this.map.set(key, entry as CacheEntry);
    return entry;
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }

  toJSON(): CacheEntry[] {
    return [...this.map.values()];
  }

  loadJSON(rows: CacheEntry[]): void {
    this.clear();
    for (const row of rows) {
      if (Date.parse(row.expiresAt) >= Date.now()) this.map.set(row.key, row);
    }
  }
}
