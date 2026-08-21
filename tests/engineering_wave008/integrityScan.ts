/**
 * Computed evaluator integrity — TypeScript AST / source scan (not hand-assigned constants).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const EVALUATOR_FILE = join(process.cwd(), 'tests/engineering_wave008/evaluators.ts');

const REQUIRED = [
  'evaluate_game_aol_001',
  'evaluate_game_aol_002',
  'evaluate_game_aol_003',
  'evaluate_game_aol_004',
  'evaluate_game_aol_005',
  'evaluate_game_aol_006',
  'evaluate_game_aol_007',
  'evaluate_game_aol_008',
  'evaluate_game_aol_009',
  'evaluate_game_aol_010',
  'evaluate_game_aol_011',
  'evaluate_game_aol_012',
  'evaluate_game_aol_013',
  'evaluate_game_aol_014',
  'evaluate_game_aol_015',
] as const;

export interface IntegrityFinding {
  evaluator_name: string;
  requirement_id: string;
  unconditional: boolean;
  literal_success_findings: string[];
  integrity_ok: boolean;
  source_hash: string;
}

function fnBodyText(source: string, fnName: string): string | null {
  const sf = ts.createSourceFile(EVALUATOR_FILE, source, ts.ScriptTarget.Latest, true);
  let body: string | null = null;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === fnName && node.body) {
      body = node.body.getText(sf);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return body;
}

function detectUnconditional(body: string): string[] {
  const findings: string[] = [];
  if (
    /classification:\s*'IMPLEMENTED_AND_VALIDATED'/.test(body) &&
    !/classification:\s*ok\s*\?/.test(body)
  ) {
    findings.push('unconditional_implemented_and_validated');
  }
  return findings;
}

export function scanEvaluatorIntegrity() {
  const source = readFileSync(EVALUATOR_FILE, 'utf8');
  const requirements: IntegrityFinding[] = [];
  let unconditional = 0;

  for (const fn of REQUIRED) {
    const body = fnBodyText(source, fn);
    const num = fn.slice(-3);
    const reqId = `GAME-AOL-${num}`;
    const hash = createHash('sha256').update(body ?? `missing:${fn}`).digest('hex');
    if (!body) {
      requirements.push({
        evaluator_name: fn,
        requirement_id: reqId,
        unconditional: true,
        literal_success_findings: ['missing_function_body'],
        integrity_ok: false,
        source_hash: hash,
      });
      unconditional += 1;
      continue;
    }
    const findings = detectUnconditional(body);
    const isUncond = findings.includes('unconditional_implemented_and_validated');
    if (isUncond) unconditional += 1;
    requirements.push({
      evaluator_name: fn,
      requirement_id: reqId,
      unconditional: isUncond,
      literal_success_findings: findings,
      integrity_ok: findings.length === 0,
      source_hash: hash,
    });
  }

  return {
    UNCONDITIONAL_TRUE_CLASSIFIERS: unconditional,
    UNCONDITIONAL_TRUE_CLASSIFIERS_COMPUTED: true,
    evaluators_inspected: REQUIRED.length,
    ok: unconditional === 0 && requirements.every((r) => r.integrity_ok),
    requirements,
    scanner: 'typescript-ast+source-body',
  };
}
