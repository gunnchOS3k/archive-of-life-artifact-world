/**
 * Durable ingest checkpoint fields required by Global Knowledge Ingestion Program.
 * Extends the existing CheckpointStore shape without breaking batch ingest.
 */

export interface GlobalIngestCheckpoint {
  source: string;
  snapshot_id: string;
  source_version: string;
  cursor_or_offset: number;
  page: number;
  records_seen: number;
  records_accepted: number;
  records_rejected: number;
  last_success_at: string | null;
  input_checksum: string | null;
  transform_version: string;
  schema_version: string;
  completed: boolean;
}

export function checkpointKey(cp: Pick<GlobalIngestCheckpoint, 'source' | 'snapshot_id' | 'source_version'>): string {
  return `${cp.source}|${cp.snapshot_id}|${cp.source_version}`;
}

export function assertCheckpointCompatible(
  existing: GlobalIngestCheckpoint,
  incoming: Pick<GlobalIngestCheckpoint, 'input_checksum' | 'transform_version' | 'schema_version'>,
): void {
  if (
    existing.input_checksum &&
    incoming.input_checksum &&
    existing.input_checksum !== incoming.input_checksum
  ) {
    throw new Error(`checksum mismatch: ${existing.input_checksum} vs ${incoming.input_checksum}`);
  }
  if (existing.transform_version && existing.transform_version !== incoming.transform_version) {
    throw new Error(
      `transform_version mismatch: ${existing.transform_version} vs ${incoming.transform_version}`,
    );
  }
  if (existing.schema_version && existing.schema_version !== incoming.schema_version) {
    throw new Error(
      `schema_version mismatch: ${existing.schema_version} vs ${incoming.schema_version}`,
    );
  }
}
