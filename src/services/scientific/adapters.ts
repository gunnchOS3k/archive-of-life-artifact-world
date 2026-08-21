import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  IntegrationStatus,
  ScientificRecordSnapshot,
  SourceSnapshotRef,
} from '@/schema/scientificRecord';
import { getSourceOrganization } from '@/schema/sourceRegistry';
import type { SourceName } from '@/schema/provenance';

export interface ScientificSourceAdapter {
  source_id: SourceName;
  integration_status(): IntegrationStatus;
  fetch_or_load(): unknown;
  normalize(raw: unknown): ScientificRecordSnapshot[];
  validate(records: ScientificRecordSnapshot[]): boolean;
  snapshot_manifest(): SourceSnapshotRef;
}

export function sha256Text(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function buildSnapshotManifest(opts: {
  source: SourceName;
  snapshot_id: string;
  retrieved_at: string;
  raw: string;
  normalized: string;
  upstream_version?: string;
  record_count: number;
  transform_version?: string;
  generator_commit?: string;
  force_integration?: IntegrationStatus;
}): SourceSnapshotRef {
  const org = getSourceOrganization(opts.source);
  const integration =
    opts.force_integration ??
    (org.integration_status === 'LIVE_VERIFIED' ? 'LIVE_VERIFIED' : org.integration_status);
  return {
    source: opts.source,
    organization_name: org.organization_name,
    upstream_version: opts.upstream_version ?? 'fixture-v1',
    snapshot_id: opts.snapshot_id,
    retrieved_at: opts.retrieved_at,
    raw_manifest_hash: sha256Text(opts.raw),
    normalized_hash: sha256Text(opts.normalized),
    transform_version: opts.transform_version ?? 'aol-scientific-transform-v1',
    record_count: opts.record_count,
    integration_status: integration,
    generator_commit: opts.generator_commit,
    license: {
      license_spdx_or_label: 'FIXTURE',
      attribution_required: true,
      redistribution_allowed: true,
      terms_status: 'mock_sample',
    },
  };
}

export class FixtureSourceAdapter implements ScientificSourceAdapter {
  constructor(
    public source_id: SourceName,
    private fixturesDir: string,
    private snapshotId: string,
  ) {}

  integration_status(): IntegrationStatus {
    const org = getSourceOrganization(this.source_id);
    // Fixture adapters are never LIVE_VERIFIED
    if (org.integration_status === 'LIVE_VERIFIED') return 'FIXTURE_ONLY';
    return org.integration_status === 'NOT_IMPLEMENTED' ? 'FIXTURE_ONLY' : org.integration_status;
  }

  fetch_or_load(): unknown {
    const path = join(this.fixturesDir, `${this.snapshotId}.json`);
    if (!existsSync(path)) throw new Error(`missing fixture ${this.snapshotId}`);
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  normalize(raw: unknown): ScientificRecordSnapshot[] {
    const doc = raw as { records: ScientificRecordSnapshot[] };
    return doc.records ?? [];
  }

  validate(records: ScientificRecordSnapshot[]): boolean {
    return records.every((r) => Boolean(r.identity?.canonical_id));
  }

  snapshot_manifest(): SourceSnapshotRef {
    const rawPath = join(this.fixturesDir, `${this.snapshotId}.json`);
    const raw = readFileSync(rawPath, 'utf8');
    const records = this.normalize(JSON.parse(raw));
    return buildSnapshotManifest({
      source: this.source_id,
      snapshot_id: this.snapshotId,
      retrieved_at: (JSON.parse(raw) as { retrieved_at?: string }).retrieved_at ?? '2024-01-15T00:00:00.000Z',
      raw,
      normalized: JSON.stringify(records),
      record_count: records.length,
      force_integration: this.integration_status(),
    });
  }
}

export function listFixtureFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json'));
}

/** HTTP adapter stub — presence of code does NOT imply LIVE_VERIFIED. */
export class HttpSourceAdapterStub implements ScientificSourceAdapter {
  constructor(public source_id: SourceName) {}
  integration_status(): IntegrationStatus {
    return 'CONTRACT_ONLY';
  }
  fetch_or_load(): unknown {
    throw new Error('live fetch not executed in Wave008 CI');
  }
  normalize(): ScientificRecordSnapshot[] {
    return [];
  }
  validate(): boolean {
    return false;
  }
  snapshot_manifest(): SourceSnapshotRef {
    return buildSnapshotManifest({
      source: this.source_id,
      snapshot_id: 'unexecuted-live',
      retrieved_at: '1970-01-01T00:00:00.000Z',
      raw: '',
      normalized: '[]',
      record_count: 0,
      force_integration: 'CONTRACT_ONLY',
    });
  }
}
