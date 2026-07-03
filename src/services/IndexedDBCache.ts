const DB_NAME = 'archive_of_life_cache';
const DB_VERSION = 1;
const STORE_BUNDLES = 'bundles';
const STORE_SPECIES = 'species';
const STORE_META = 'meta';

export interface CacheMeta {
  snapshotId: string;
  manifestVersion: string;
  cachedAt: number;
}

interface CacheRecord {
  key: string;
  snapshotId: string;
  data: unknown;
  cachedAt: number;
}

export class IndexedDBCache {
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    if (this.db) return;
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_BUNDLES)) {
          db.createObjectStore(STORE_BUNDLES, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SPECIES)) {
          db.createObjectStore(STORE_SPECIES, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getMeta(): Promise<CacheMeta | null> {
    await this.open();
    return this.get<CacheMeta>(STORE_META, 'manifest');
  }

  async setMeta(meta: CacheMeta): Promise<void> {
    await this.open();
    await this.put(STORE_META, { key: 'manifest', ...meta });
  }

  async isStale(snapshotId: string, manifestVersion: string): Promise<boolean> {
    const meta = await this.getMeta();
    if (!meta) return true;
    return meta.snapshotId !== snapshotId || meta.manifestVersion !== manifestVersion;
  }

  async invalidate(): Promise<void> {
    await this.open();
    await Promise.all([
      this.clearStore(STORE_BUNDLES),
      this.clearStore(STORE_SPECIES),
      this.clearStore(STORE_META),
    ]);
  }

  async getBundle<T>(key: string): Promise<T | null> {
    await this.open();
    const rec = await this.get<CacheRecord>(STORE_BUNDLES, key);
    return rec ? (rec.data as T) : null;
  }

  async setBundle(key: string, snapshotId: string, data: unknown): Promise<void> {
    await this.open();
    await this.put(STORE_BUNDLES, {
      key,
      snapshotId,
      data,
      cachedAt: Date.now(),
    } satisfies CacheRecord);
  }

  async getSpecies<T>(id: string): Promise<T | null> {
    await this.open();
    const rec = await this.get<CacheRecord>(STORE_SPECIES, id);
    return rec ? (rec.data as T) : null;
  }

  async setSpecies(id: string, snapshotId: string, data: unknown): Promise<void> {
    await this.open();
    await this.put(STORE_SPECIES, {
      key: id,
      snapshotId,
      data,
      cachedAt: Date.now(),
    } satisfies CacheRecord);
  }

  private get<T>(store: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private put(store: string, value: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private clearStore(store: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const speciesCache = new IndexedDBCache();
