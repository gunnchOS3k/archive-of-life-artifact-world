/**
 * Shared HTTP client for scientific ingestion:
 * rate-limit (token window) + exponential backoff retry + page/offset loop.
 */

import type {
  IngestionClientConfig,
  PaginationConfig,
  RateLimitConfig,
  RetryConfig,
} from './types';
import { DEFAULT_INGESTION_CONFIG } from './types';

export class RateLimiter {
  private timestamps: number[] = [];
  private lastRequestAt = 0;

  constructor(private readonly config: RateLimitConfig) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.config.windowMs);

    if (this.timestamps.length >= this.config.maxRequests) {
      const wait = this.config.windowMs - (now - this.timestamps[0]) + 1;
      await sleep(Math.max(wait, this.config.minIntervalMs));
      return this.acquire();
    }

    const sinceLast = now - this.lastRequestAt;
    if (sinceLast < this.config.minIntervalMs) {
      await sleep(this.config.minIntervalMs - sinceLast);
    }

    this.lastRequestAt = Date.now();
    this.timestamps.push(this.lastRequestAt);
  }
}

export function computeBackoff(attempt: number, retry: RetryConfig): number {
  const exp = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.min(50, retry.baseDelayMs));
  return Math.min(retry.maxDelayMs, exp + jitter);
}

export class ScientificHttpClient {
  readonly config: IngestionClientConfig;
  private readonly limiter: RateLimiter;

  constructor(config: Partial<IngestionClientConfig> = {}) {
    this.config = {
      ...DEFAULT_INGESTION_CONFIG,
      ...config,
      rateLimit: { ...DEFAULT_INGESTION_CONFIG.rateLimit, ...config.rateLimit },
      retry: { ...DEFAULT_INGESTION_CONFIG.retry, ...config.retry },
      pagination: { ...DEFAULT_INGESTION_CONFIG.pagination, ...config.pagination },
    };
    this.limiter = new RateLimiter(this.config.rateLimit);
  }

  async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    if (this.config.fixtureOnly) {
      throw new Error('fixtureOnly: live HTTP disabled');
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      await this.limiter.acquire();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
        });
        if (!res.ok) {
          if (
            this.config.retry.retryStatuses.includes(res.status) &&
            attempt < this.config.retry.maxAttempts
          ) {
            await sleep(computeBackoff(attempt, this.config.retry));
            continue;
          }
          throw new Error(`HTTP ${res.status} for ${url}`);
        }
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
        if (attempt < this.config.retry.maxAttempts) {
          await sleep(computeBackoff(attempt, this.config.retry));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Walk offset/page pagination until hasMore is false or maxPages reached.
   */
  async paginate<TPage, TItem>(opts: {
    buildUrl: (offset: number, pageSize: number, page: number) => string;
    extract: (page: TPage) => { items: TItem[]; hasMore: boolean };
    pagination?: Partial<PaginationConfig>;
  }): Promise<{ items: TItem[]; pagesFetched: number; mode: 'live' }> {
    const pagination = { ...this.config.pagination, ...opts.pagination };
    const all: TItem[] = [];
    let offset = 0;
    let pagesFetched = 0;

    for (let page = 0; page < pagination.maxPages; page++) {
      const url = opts.buildUrl(offset, pagination.pageSize, page);
      const body = await this.fetchJson<TPage>(url);
      const { items, hasMore } = opts.extract(body);
      all.push(...items);
      pagesFetched += 1;
      if (!hasMore || items.length === 0) break;
      offset += pagination.pageSize;
    }

    return { items: all, pagesFetched, mode: 'live' };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
