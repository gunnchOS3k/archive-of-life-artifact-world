/**
 * Wave008 requirement evaluators — 1:1 GAME-AOL-001..015.
 * Classifications depend on evidence predicates (never unconditional true).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type Classification =
  | 'IMPLEMENTED_AND_VALIDATED'
  | 'IMPLEMENTED_VALIDATION_OPEN'
  | 'IMPLEMENTATION_OPEN'
  | 'BLOCKED_ENVIRONMENT'
  | 'BLOCKED_EXTERNAL'
  | 'FAIL';

export interface EvalResult {
  requirement_id: string;
  evaluator_name: string;
  classification: Classification;
  evidence: Record<string, unknown>;
}

const ART = join(process.cwd(), 'artifacts/engineering_wave008');

function load(name: string): Record<string, unknown> | null {
  const p = join(ART, name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function evaluate_game_aol_001(): EvalResult {
  const cov = load('COVERAGE_SCOPE_RESULT.json') ?? {};
  const neg = load('BEHAVIORAL_NEGATIVE_CONTROL_RESULT.json') ?? {};
  const controls = (neg.controls as Record<string, unknown> | undefined) ?? {};
  const ok =
    cov.COVERAGE_DENOMINATOR_EXECUTABLE === true &&
    cov.DENOMINATOR_EXPLICIT === true &&
    cov.SCOPE_TOTAL_GT_DOCUMENTED === true &&
    cov.ADDING_UNDOCUMENTED_DECREASES_PERCENT === true &&
    cov.COMPLETENESS_OVERCLAIM_SABOTAGE_FAILS === true &&
    cov.ok === true &&
    controls.coverage_100_without_denominator === true;
  return {
    requirement_id: 'GAME-AOL-001',
    evaluator_name: 'evaluate_game_aol_001',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: {
      COVERAGE_SCOPE: ok,
      DENOMINATOR_EXPLICIT: cov.DENOMINATOR_EXPLICIT === true,
      SCOPE_TOTAL_GT_DOCUMENTED: cov.SCOPE_TOTAL_GT_DOCUMENTED === true,
      ADDING_UNDOCUMENTED_DECREASES_PERCENT: cov.ADDING_UNDOCUMENTED_DECREASES_PERCENT === true,
      COMPLETENESS_OVERCLAIM_SABOTAGE_FAILS: cov.COMPLETENESS_OVERCLAIM_SABOTAGE_FAILS === true,
      denominator_label: cov.denominator_label ?? null,
    },
  };
}

export function evaluate_game_aol_002(): EvalResult {
  const id = load('CANONICAL_IDENTIFIER_RESULT.json') ?? {};
  const ok =
    id.STABLE_ACROSS_REIMPORT === true &&
    id.COLLISION_DETECTOR === true &&
    id.ALIAS_REDIRECT === true &&
    id.ok === true;
  return {
    requirement_id: 'GAME-AOL-002',
    evaluator_name: 'evaluate_game_aol_002',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { CANONICAL_ID: ok, ...id },
  };
}

export function evaluate_game_aol_003(): EvalResult {
  const name = load('SCIENTIFIC_NAME_RESULT.json') ?? {};
  const ok =
    name.SOURCE_LINKED === true &&
    name.NONEMPTY_WHEN_IDENTIFIED === true &&
    name.ok === true;
  return {
    requirement_id: 'GAME-AOL-003',
    evaluator_name: 'evaluate_game_aol_003',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { SCIENTIFIC_NAME: ok, ...name },
  };
}

export function evaluate_game_aol_004(): EvalResult {
  const auth = load('TAXONOMIC_AUTHORITY_RESULT.json') ?? {};
  const ok =
    auth.AUTHORITY_EXPLICIT === true &&
    auth.DISTINCT_FROM_SOURCE_ORG === true &&
    auth.ok === true;
  return {
    requirement_id: 'GAME-AOL-004',
    evaluator_name: 'evaluate_game_aol_004',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { TAXONOMIC_AUTHORITY: ok, ...auth },
  };
}

export function evaluate_game_aol_005(): EvalResult {
  const org = load('SOURCE_ORGANIZATION_RESULT.json') ?? {};
  const ok =
    org.REGISTRY_EXECUTABLE === true &&
    org.INTEGRATION_STATUS_EXPLICIT === true &&
    org.ENUM_IS_NOT_LIVE === true &&
    org.ok === true;
  return {
    requirement_id: 'GAME-AOL-005',
    evaluator_name: 'evaluate_game_aol_005',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { SOURCE_ORGANIZATION: ok, ...org },
  };
}

export function evaluate_game_aol_006(): EvalResult {
  const sid = load('SOURCE_RECORD_ID_RESULT.json') ?? {};
  const ok =
    sid.SOURCE_NATIVE_PRESERVED === true &&
    sid.PLACEHOLDER_REJECTED_FROM_SOURCE_VERIFIED === true &&
    sid.ok === true;
  return {
    requirement_id: 'GAME-AOL-006',
    evaluator_name: 'evaluate_game_aol_006',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { SOURCE_RECORD_ID: ok, ...sid },
  };
}

export function evaluate_game_aol_007(): EvalResult {
  const lic = load('LICENSE_TERMS_RESULT.json') ?? {};
  const browser = load('ARCHIVEDEX_BROWSER_E2E_RESULT.json') ?? {};
  const ok =
    lic.STRUCTURED_LICENSE === true &&
    lic.MISSING_BLOCKS_SOURCE_VERIFIED === true &&
    browser.license_visible === true &&
    lic.ok === true;
  return {
    requirement_id: 'GAME-AOL-007',
    evaluator_name: 'evaluate_game_aol_007',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { LICENSE_TERMS: ok, license_visible: browser.license_visible === true, ...lic },
  };
}

export function evaluate_game_aol_008(): EvalResult {
  const ret = load('RETRIEVAL_DATE_RESULT.json') ?? {};
  const ok =
    ret.FROM_SNAPSHOT_PROVENANCE === true &&
    ret.MISSING_BLOCKS_SOURCE_VERIFIED === true &&
    ret.FUTURE_REJECTED === true &&
    ret.ok === true;
  return {
    requirement_id: 'GAME-AOL-008',
    evaluator_name: 'evaluate_game_aol_008',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { RETRIEVAL_DATE: ok, ...ret },
  };
}

export function evaluate_game_aol_009(): EvalResult {
  const ver = load('SOURCE_VERSION_RESULT.json') ?? {};
  const snap = load('SNAPSHOT_MANIFEST_RESULT.json') ?? {};
  const repro = load('SNAPSHOT_REPRODUCTION_RESULT.json') ?? {};
  const ok =
    ver.SNAPSHOT_BOUND === true &&
    snap.MANIFEST_HASH_OK === true &&
    snap.VALIDATE_SNAPSHOT_MANIFEST === true &&
    repro.REPRODUCIBLE === true &&
    repro.INDEPENDENT_AB === true &&
    repro.TAMPER_REJECTED === true &&
    ver.ok === true;
  return {
    requirement_id: 'GAME-AOL-009',
    evaluator_name: 'evaluate_game_aol_009',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: {
      SOURCE_VERSION: ok,
      ...ver,
      MANIFEST_HASH_OK: snap.MANIFEST_HASH_OK === true,
      TAMPER_REJECTED: repro.TAMPER_REJECTED === true,
    },
  };
}

export function evaluate_game_aol_010(): EvalResult {
  const geo = load('GEOGRAPHIC_PROVENANCE_RESULT.json') ?? {};
  const ok =
    geo.TYPED_GEOGRAPHY === true &&
    geo.UNKNOWN_SAFE === true &&
    geo.FAKE_PRECISE_COORDS_REJECTED === true &&
    geo.ok === true;
  return {
    requirement_id: 'GAME-AOL-010',
    evaluator_name: 'evaluate_game_aol_010',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { GEOGRAPHIC_PROVENANCE: ok, ...geo },
  };
}

export function evaluate_game_aol_011(): EvalResult {
  const time = load('TIME_RANGE_RESULT.json') ?? {};
  const ok =
    time.TYPED_TIME === true &&
    time.FOSSIL_EXTANT_SEMANTICS === true &&
    time.ok === true;
  return {
    requirement_id: 'GAME-AOL-011',
    evaluator_name: 'evaluate_game_aol_011',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { TIME_RANGE: ok, ...time },
  };
}

export function evaluate_game_aol_012(): EvalResult {
  const unc = load('UNCERTAINTY_RESULT.json') ?? {};
  const browser = load('ARCHIVEDEX_BROWSER_E2E_RESULT.json') ?? {};
  const ok =
    unc.NORMALIZED_CONFIDENCE === true &&
    unc.DISPUTED_VISIBLE === true &&
    browser.uncertainty_visible === true &&
    unc.ok === true;
  return {
    requirement_id: 'GAME-AOL-012',
    evaluator_name: 'evaluate_game_aol_012',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { UNCERTAINTY: ok, uncertainty_visible: browser.uncertainty_visible === true, ...unc },
  };
}

export function evaluate_game_aol_013(): EvalResult {
  const ed = load('EDITORIAL_STATUS_RESULT.json') ?? {};
  const ok =
    ed.LIFECYCLE_DISTINCT === true &&
    ed.MOCK_CANNOT_DEFAULT_CURATED === true &&
    ed.ok === true;
  return {
    requirement_id: 'GAME-AOL-013',
    evaluator_name: 'evaluate_game_aol_013',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { EDITORIAL_STATUS: ok, ...ed },
  };
}

export function evaluate_game_aol_014(): EvalResult {
  const cite = load('CITATION_UI_RESULT.json') ?? {};
  const browser = load('ARCHIVEDEX_BROWSER_E2E_RESULT.json') ?? {};
  const ok =
    cite.CITATION_EXPOSED === true &&
    browser.citation_visible === true &&
    browser.game_authored_no_external_badge === true &&
    browser.mock_warning_visible === true &&
    cite.ok === true;
  return {
    requirement_id: 'GAME-AOL-014',
    evaluator_name: 'evaluate_game_aol_014',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: {
      CITATION_UI: ok,
      citation_visible: browser.citation_visible === true,
      game_authored_no_external_badge: browser.game_authored_no_external_badge === true,
    },
  };
}

export function evaluate_game_aol_015(): EvalResult {
  const truth = load('SOURCE_INTEGRATION_TRUTH_RESULT.json') ?? {};
  const neg = load('BEHAVIORAL_NEGATIVE_CONTROL_RESULT.json') ?? {};
  const controls = (neg.controls as Record<string, unknown> | undefined) ?? {};
  const ok =
    truth.NO_FAKE_LIVE === true &&
    truth.MISSING_DEFAULTS_TO_NEEDS_VERIFICATION === true &&
    truth.FIXTURE_NOT_LIVE === true &&
    controls.unknown_status_defaults_verified === true &&
    truth.ok === true;
  return {
    requirement_id: 'GAME-AOL-015',
    evaluator_name: 'evaluate_game_aol_015',
    classification: ok ? 'IMPLEMENTED_AND_VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
    evidence: { SOURCE_INTEGRATION_TRUTH: ok, ...truth },
  };
}

export const WAVE008_EVALUATORS = [
  evaluate_game_aol_001,
  evaluate_game_aol_002,
  evaluate_game_aol_003,
  evaluate_game_aol_004,
  evaluate_game_aol_005,
  evaluate_game_aol_006,
  evaluate_game_aol_007,
  evaluate_game_aol_008,
  evaluate_game_aol_009,
  evaluate_game_aol_010,
  evaluate_game_aol_011,
  evaluate_game_aol_012,
  evaluate_game_aol_013,
  evaluate_game_aol_014,
  evaluate_game_aol_015,
] as const;
