/**
 * Scientific operations — ingest audit, provenance check, count export readiness.
 */

import type { ActualCountsReport } from '@/coverage/ActualCountsReport';
import type { SourceRegistryEntry } from '@/services/ingestion/sourceRegistry';
import { mayCallLiveHttp } from '@/services/ingestion/sourceRegistry';

export interface ScientificOpsCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface ScientificOpsReport {
  generatedAt: string;
  checks: ScientificOpsCheck[];
  allCriticalOk: boolean;
  sourceStates: Array<{ id: string; state: string; mayLive: boolean }>;
  gaps: string[];
}

export function evaluateScientificOps(input: {
  registry: SourceRegistryEntry[];
  actualCounts: ActualCountsReport | null;
  batchReportPresent: boolean;
  provenancePolicyPresent: boolean;
  offlinePackReady: boolean;
  fixtureNeverCalledLive: boolean;
}): ScientificOpsReport {
  const checks: ScientificOpsCheck[] = [
    {
      id: 'source_registry',
      ok: input.registry.length >= 3,
      detail: `${input.registry.length} registered sources`,
    },
    {
      id: 'actual_counts',
      ok: !!input.actualCounts && input.actualCounts.globalCompleteClaim === false,
      detail: input.actualCounts
        ? `unique_taxa=${input.actualCounts.unique_taxa} synonyms=${input.actualCounts.synonyms} conflicts=${input.actualCounts.conflicts}`
        : 'missing actual counts',
    },
    {
      id: 'batch_ingest_report',
      ok: input.batchReportPresent,
      detail: input.batchReportPresent ? 'batch ingest report present' : 'missing batch report',
    },
    {
      id: 'provenance_policy',
      ok: input.provenancePolicyPresent,
      detail: input.provenancePolicyPresent ? 'provenance policy present' : 'missing provenance policy',
    },
    {
      id: 'offline_pack',
      ok: input.offlinePackReady,
      detail: input.offlinePackReady ? 'offline pack ready' : 'offline pack not ready',
    },
    {
      id: 'fixture_honesty',
      ok: input.fixtureNeverCalledLive,
      detail: input.fixtureNeverCalledLive
        ? 'fixtures never called live'
        : 'fixture honesty violated',
    },
    {
      id: 'no_global_complete_fabrication',
      ok: !input.actualCounts || input.actualCounts.globalCompleteClaim === false,
      detail: 'globalCompleteClaim must remain false',
    },
  ];

  const gaps = checks.filter((c) => !c.ok).map((c) => c.detail);
  const critical = ['source_registry', 'actual_counts', 'batch_ingest_report', 'fixture_honesty'];
  const allCriticalOk = critical.every((id) => checks.find((c) => c.id === id)?.ok);

  return {
    generatedAt: new Date().toISOString(),
    checks,
    allCriticalOk,
    sourceStates: input.registry.map((e) => ({
      id: e.id,
      state: e.state,
      mayLive: mayCallLiveHttp(e),
    })),
    gaps,
  };
}
