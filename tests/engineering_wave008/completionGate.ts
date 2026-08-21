import { createHash } from 'node:crypto';
import type { EvalResult, Classification } from './evaluators';

export interface GateEvaluatorBinding {
  requirement_id: string;
  evaluator_name: string;
  source_hash: string;
  evidence_generated_at: string;
  stale: boolean;
}

const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;

export function runCompletionGate(
  results: EvalResult[],
  bindings?: GateEvaluatorBinding[],
) {
  const target = 15;
  const validated = results.filter((r) => r.classification === 'IMPLEMENTED_AND_VALIDATED').length;
  const ids = results.map((r) => r.requirement_id);
  const unique = new Set(ids).size === ids.length;
  const unexpected = ids.filter((id) => !/^GAME-AOL-0(0[1-9]|1[0-5])$/.test(id));
  const emptyEvidence = results.filter((r) => !r.evidence || Object.keys(r.evidence).length === 0);

  let binding_ok = true;
  const binding_issues: string[] = [];
  if (bindings) {
    if (bindings.length !== results.length) {
      binding_ok = false;
      binding_issues.push('BINDING_COUNT_MISMATCH');
    }
    const nameSet = new Set<string>();
    for (const b of bindings) {
      if (nameSet.has(b.evaluator_name)) {
        binding_ok = false;
        binding_issues.push('DUPLICATE_ID');
      }
      nameSet.add(b.evaluator_name);
      if (!b.source_hash || b.source_hash.length < 16) {
        binding_ok = false;
        binding_issues.push('WRONG_SOURCE_HASH');
      }
      if (b.stale) {
        binding_ok = false;
        binding_issues.push('STALE_EVIDENCE');
      }
      const ts = Date.parse(b.evidence_generated_at);
      if (Number.isNaN(ts) || Date.now() - ts > MAX_EVIDENCE_AGE_MS) {
        binding_ok = false;
        binding_issues.push('STALE_EVIDENCE');
      }
      const match = results.find((r) => r.requirement_id === b.requirement_id);
      if (!match || match.evaluator_name !== b.evaluator_name) {
        binding_ok = false;
        binding_issues.push('EVALUATOR_IDENTITY_MISMATCH');
      }
    }
  }

  return {
    TARGET_REQUIREMENTS: target,
    TARGET_IDS_UNIQUE: unique,
    IMPLEMENTED_AND_VALIDATED: validated,
    COMPLETE_GATE_REQUIRES_15_OF_15: true,
    gate_ok:
      validated === target &&
      unique &&
      unexpected.length === 0 &&
      emptyEvidence.length === 0 &&
      binding_ok,
    unexpected_ids: unexpected,
    empty_evidence_count: emptyEvidence.length,
    binding_ok,
    binding_issues: [...new Set(binding_issues)],
  };
}

export function buildEvaluatorBindings(
  results: EvalResult[],
  sourceHashes: Record<string, string>,
  generatedAt = new Date().toISOString(),
): GateEvaluatorBinding[] {
  return results.map((r) => ({
    requirement_id: r.requirement_id,
    evaluator_name: r.evaluator_name,
    source_hash: sourceHashes[r.requirement_id] ?? '',
    evidence_generated_at: generatedAt,
    stale: false,
  }));
}

export function runBrokenEvaluatorNegatives(runEval: () => EvalResult[]) {
  const base = runEval();
  const hashes: Record<string, string> = {};
  for (const r of base) {
    hashes[r.requirement_id] = createHash('sha256').update(r.evaluator_name).digest('hex');
  }
  const goodBindings = buildEvaluatorBindings(base, hashes);

  const broken: EvalResult = {
    requirement_id: 'GAME-AOL-999',
    evaluator_name: 'broken_always_true',
    classification: 'IMPLEMENTED_AND_VALIDATED' as Classification,
    evidence: {},
  };
  const missing: EvalResult = {
    requirement_id: 'GAME-AOL-001',
    evaluator_name: 'missing_evidence',
    classification: 'IMPLEMENTED_AND_VALIDATED',
    evidence: {},
  };
  const falseEval: EvalResult = {
    requirement_id: 'GAME-AOL-002',
    evaluator_name: 'false_evaluator',
    classification: 'FAIL',
    evidence: { deliberate_false: true },
  };

  const withBroken = runCompletionGate([...base, broken], goodBindings);
  const withEmpty = runCompletionGate([missing], [
    {
      requirement_id: 'GAME-AOL-001',
      evaluator_name: 'missing_evidence',
      source_hash: 'abcd'.repeat(8),
      evidence_generated_at: new Date().toISOString(),
      stale: false,
    },
  ]);
  const withFalse = runCompletionGate([falseEval, ...base.slice(1)], goodBindings);

  // DUPLICATE_ID
  const dupBindings = [...goodBindings, { ...goodBindings[0] }];
  const withDup = runCompletionGate(base, dupBindings);

  // WRONG_SOURCE_HASH
  const wrongHash = buildEvaluatorBindings(base, Object.fromEntries(base.map((r) => [r.requirement_id, 'bad'])));
  const withWrongHash = runCompletionGate(base, wrongHash);

  // STALE_EVIDENCE
  const stale = buildEvaluatorBindings(base, hashes, '2020-01-01T00:00:00.000Z').map((b) => ({
    ...b,
    stale: true,
  }));
  const withStale = runCompletionGate(base, stale);

  return {
    BROKEN_EVALUATOR_GATE_RESULT: withBroken.gate_ok ? 'ACCEPTED' : 'REJECTED',
    MISSING_EVALUATOR_REJECTED: withEmpty.gate_ok === false,
    FALSE_EVALUATOR_REJECTED: withFalse.gate_ok === false,
    UNEXPECTED_ID_REJECTED: withBroken.unexpected_ids.includes('GAME-AOL-999'),
    EMPTY_EVIDENCE_REJECTED: withEmpty.empty_evidence_count > 0,
    DUPLICATE_ID_REJECTED: withDup.gate_ok === false && withDup.binding_issues.includes('DUPLICATE_ID'),
    WRONG_SOURCE_HASH_REJECTED:
      withWrongHash.gate_ok === false && withWrongHash.binding_issues.includes('WRONG_SOURCE_HASH'),
    STALE_EVIDENCE_REJECTED:
      withStale.gate_ok === false && withStale.binding_issues.includes('STALE_EVIDENCE'),
    ok:
      withBroken.gate_ok === false &&
      withEmpty.gate_ok === false &&
      withFalse.gate_ok === false &&
      withDup.gate_ok === false &&
      withWrongHash.gate_ok === false &&
      withStale.gate_ok === false,
  };
}
