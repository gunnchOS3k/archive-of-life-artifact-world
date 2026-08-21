import { createHash } from 'node:crypto';
import type { SourceSnapshotRef } from '@/schema/scientificRecord';
import { sha256Text } from './adapters';

export interface SnapshotManifestValidation {
  ok: boolean;
  issues: string[];
  raw_hash_match: boolean;
  normalized_hash_match: boolean;
  tamper_rejected: boolean;
}

export function validateSnapshotManifest(
  manifest: SourceSnapshotRef,
  raw: string,
  normalized: string,
): SnapshotManifestValidation {
  const issues: string[] = [];
  if (!manifest.snapshot_id) issues.push('missing_snapshot_id');
  if (!manifest.source) issues.push('missing_source');
  if (!manifest.retrieved_at) issues.push('missing_retrieved_at');
  if (!manifest.transform_version) issues.push('missing_transform_version');
  if (!manifest.raw_manifest_hash) issues.push('missing_raw_hash');
  if (!manifest.normalized_hash) issues.push('missing_normalized_hash');
  if (!manifest.integration_status) issues.push('missing_integration_status');

  const rawExpected = sha256Text(raw);
  const normExpected = sha256Text(normalized);
  const raw_hash_match = manifest.raw_manifest_hash === rawExpected;
  const normalized_hash_match = manifest.normalized_hash === normExpected;
  if (!raw_hash_match) issues.push('raw_hash_mismatch');
  if (!normalized_hash_match) issues.push('normalized_hash_mismatch');

  return {
    ok: issues.length === 0,
    issues,
    raw_hash_match,
    normalized_hash_match,
    tamper_rejected: !raw_hash_match || !normalized_hash_match,
  };
}

export interface ReproductionRun {
  run_id: 'A' | 'B';
  raw_hash: string;
  normalized_hash: string;
  record_count: number;
  manifest_ok: boolean;
}

export function independentReproductionAB(
  raw: string,
  normalize: (rawText: string) => { normalized: string; record_count: number },
  buildManifest: (rawText: string, normalized: string, count: number) => SourceSnapshotRef,
): {
  run_a: ReproductionRun;
  run_b: ReproductionRun;
  hashes_equal: boolean;
  counts_equal: boolean;
  tamper_rejected: boolean;
  ok: boolean;
} {
  const runOnce = (run_id: 'A' | 'B'): ReproductionRun => {
    const { normalized, record_count } = normalize(raw);
    const manifest = buildManifest(raw, normalized, record_count);
    const validation = validateSnapshotManifest(manifest, raw, normalized);
    return {
      run_id,
      raw_hash: sha256Text(raw),
      normalized_hash: sha256Text(normalized),
      record_count,
      manifest_ok: validation.ok,
    };
  };

  const run_a = runOnce('A');
  const run_b = runOnce('B');

  const goodNormalized = normalize(raw).normalized;
  const goodManifest = buildManifest(raw, goodNormalized, run_a.record_count);
  // Tamper raw bytes without requiring normalize(tampered) to succeed
  const tampered = `${raw}\nTAMPER`;
  const tamperCheck = validateSnapshotManifest(goodManifest, tampered, goodNormalized);

  const hashes_equal = run_a.raw_hash === run_b.raw_hash && run_a.normalized_hash === run_b.normalized_hash;
  const counts_equal = run_a.record_count === run_b.record_count;

  return {
    run_a,
    run_b,
    hashes_equal,
    counts_equal,
    tamper_rejected: tamperCheck.tamper_rejected === true,
    ok:
      hashes_equal &&
      counts_equal &&
      run_a.manifest_ok &&
      run_b.manifest_ok &&
      tamperCheck.tamper_rejected === true,
  };
}

export function fingerprintReproduction(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
