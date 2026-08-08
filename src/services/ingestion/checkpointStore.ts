/**
 * Resume checkpoints for batch/snapshot ingest — offset/page per source+query.
 * In-memory by default; optional JSON file persistence for CLI runs.
 */

export interface IngestCheckpoint {
  source: string;
  queryKey: string;
  snapshotVersion: string;
  offset: number;
  page: number;
  recordsImported: number;
  lastSuccessAt: string;
  /** True only when last successful page was live HTTP */
  liveClaim: boolean;
  errors: string[];
}

export class CheckpointStore {
  private map = new Map<string, IngestCheckpoint>();

  static key(source: string, queryKey: string, snapshotVersion: string): string {
    return `${source}|${queryKey}|${snapshotVersion}`;
  }

  get(source: string, queryKey: string, snapshotVersion: string): IngestCheckpoint | undefined {
    return this.map.get(CheckpointStore.key(source, queryKey, snapshotVersion));
  }

  set(cp: IngestCheckpoint): void {
    this.map.set(CheckpointStore.key(cp.source, cp.queryKey, cp.snapshotVersion), cp);
  }

  list(): IngestCheckpoint[] {
    return [...this.map.values()];
  }

  clear(): void {
    this.map.clear();
  }

  /** Serialize for disk resume. */
  toJSON(): IngestCheckpoint[] {
    return this.list();
  }

  loadJSON(rows: IngestCheckpoint[]): void {
    this.clear();
    for (const row of rows) this.set(row);
  }
}
