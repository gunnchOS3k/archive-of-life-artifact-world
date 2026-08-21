import type {
  ArchiveCoverageSnapshot,
  CoverageSemantics,
  ScientificRecordSnapshot,
} from '@/schema/scientificRecord';

export interface CoverageMetrics {
  documented_records: number;
  source_verified_records: number;
  needs_verification: number;
  conflicted: number;
  by_source: Record<string, number>;
  by_life_status: Record<string, number>;
  by_time_scope: Record<string, number>;
  by_geography_scope: Record<string, number>;
  /** Explicit scope size used as coverage denominator (may exceed documented). */
  scope_total: number;
  denominator: number;
  denominator_label: string;
  denominator_explicit: boolean;
  percent_documented: number | null;
  completeness_overclaim: boolean;
  user_facing_summary: string;
}

export function computeCoverageMetrics(
  records: ScientificRecordSnapshot[],
  opts: {
    coverage_semantics: CoverageSemantics;
    denominator_label: string;
    snapshot_id: string;
    included_source_snapshots: string[];
    /** Explicit scoped denominator. Defaults to documented count only when label is scoped. */
    scope_total?: number;
  },
): { metrics: CoverageMetrics; snapshot: ArchiveCoverageSnapshot } {
  const documented = records.length;
  const denominator_explicit = Boolean(opts.denominator_label?.trim()) && opts.scope_total != null;
  const scope_total = opts.scope_total ?? documented;
  const denominator = scope_total;

  const by_source: Record<string, number> = {};
  const by_life_status: Record<string, number> = {};
  const by_time_scope: Record<string, number> = {};
  const by_geography_scope: Record<string, number> = {};
  let source_verified = 0;
  let needs_verification = 0;
  let conflicted = 0;

  for (const r of records) {
    by_source[r.source_organization_id] = (by_source[r.source_organization_id] ?? 0) + 1;
    const life = r.life_status ?? 'unknown';
    by_life_status[life] = (by_life_status[life] ?? 0) + 1;
    const timeKind = r.time_range?.kind ?? 'unknown';
    by_time_scope[timeKind] = (by_time_scope[timeKind] ?? 0) + 1;
    const geo = r.geographic_provenance?.source_basis ?? 'unknown';
    by_geography_scope[geo] = (by_geography_scope[geo] ?? 0) + 1;
    if (r.verification_status === 'source_verified') source_verified += 1;
    if (r.verification_status === 'needs_source_verification') needs_verification += 1;
    if (r.editorial.editorial_status === 'CONFLICTED' || r.editorial.editorial_status === 'REVIEW_NEEDED') {
      conflicted += 1;
    }
  }

  const percent =
    denominator_explicit && denominator > 0
      ? Math.round((documented / denominator) * 10000) / 100
      : null;

  const completeness_overclaim =
    percent === 100 &&
    (!opts.denominator_label ||
      /all (known )?life|every species|complete fossil|100% of Earth/i.test(opts.denominator_label));

  const user_facing_summary = denominator_explicit
    ? `${documented.toLocaleString()} of ${denominator.toLocaleString()} records documented in the current Archive snapshot scope. Coverage is not a claim of all species known to science.`
    : 'No explicit denominator — percentage coverage claim withheld.';

  const metrics: CoverageMetrics = {
    documented_records: documented,
    source_verified_records: source_verified,
    needs_verification,
    conflicted,
    by_source,
    by_life_status,
    by_time_scope,
    by_geography_scope,
    scope_total,
    denominator,
    denominator_label: opts.denominator_label,
    denominator_explicit,
    percent_documented: percent,
    completeness_overclaim,
    user_facing_summary,
  };

  const snapshot: ArchiveCoverageSnapshot = {
    snapshot_id: opts.snapshot_id,
    generated_at: new Date().toISOString(),
    included_source_snapshots: opts.included_source_snapshots,
    documented_record_count: documented,
    source_record_count: source_verified,
    scope_filters: {
      semantics: opts.coverage_semantics,
      scope_total,
      denominator_explicit,
    },
    coverage_semantics: opts.coverage_semantics,
    known_limitations: [
      'Does not claim all species ever',
      'Does not claim complete fossil record',
      'Absent records mean not present in this snapshot, not does-not-exist',
    ],
    denominator_label: opts.denominator_label,
    completeness_claim_forbidden: true,
    user_facing_summary,
  };

  return { metrics, snapshot };
}

/**
 * Adding an undocumented record to the scope increases denominator while documented stays fixed,
 * so percent decreases (or stays null without explicit denominator).
 */
export function coveragePercentAfterAddingUndocumented(
  documented: number,
  priorScopeTotal: number,
): number | null {
  const newDenom = priorScopeTotal + 1;
  if (newDenom <= 0) return null;
  return Math.round((documented / newDenom) * 10000) / 100;
}
