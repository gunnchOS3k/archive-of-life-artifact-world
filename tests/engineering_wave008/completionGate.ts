import type { EvalResult, Classification } from './evaluators';

export function runCompletionGate(results: EvalResult[]) {
  const target = 15;
  const validated = results.filter((r) => r.classification === 'IMPLEMENTED_AND_VALIDATED').length;
  const ids = results.map((r) => r.requirement_id);
  const unique = new Set(ids).size === ids.length;
  const unexpected = ids.filter((id) => !/^GAME-AOL-0(0[1-9]|1[0-5])$/.test(id));
  const emptyEvidence = results.filter((r) => !r.evidence || Object.keys(r.evidence).length === 0);

  return {
    TARGET_REQUIREMENTS: target,
    TARGET_IDS_UNIQUE: unique,
    IMPLEMENTED_AND_VALIDATED: validated,
    COMPLETE_GATE_REQUIRES_15_OF_15: true,
    gate_ok: validated === target && unique && unexpected.length === 0 && emptyEvidence.length === 0,
    unexpected_ids: unexpected,
    empty_evidence_count: emptyEvidence.length,
  };
}

export function runBrokenEvaluatorNegatives(runEval: () => EvalResult[]) {
  // Broken evaluator: always VALIDATED without ok predicate — must be rejected by integrity scan,
  // and a false/missing evaluator must not close the gate.
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

  const withBroken = runCompletionGate([...runEval(), broken]);
  const withEmpty = runCompletionGate([missing]);
  const withFalse = runCompletionGate([falseEval, ...runEval().slice(1)]);

  return {
    BROKEN_EVALUATOR_GATE_RESULT: withBroken.gate_ok ? 'ACCEPTED' : 'REJECTED',
    MISSING_EVALUATOR_REJECTED: withEmpty.gate_ok === false,
    FALSE_EVALUATOR_REJECTED: withFalse.gate_ok === false,
    UNEXPECTED_ID_REJECTED: withBroken.unexpected_ids.includes('GAME-AOL-999'),
    EMPTY_EVIDENCE_REJECTED: withEmpty.empty_evidence_count > 0,
    ok:
      withBroken.gate_ok === false &&
      withEmpty.gate_ok === false &&
      withFalse.gate_ok === false,
  };
}
