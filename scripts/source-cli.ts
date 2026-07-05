/**
 * Source import CLI wrappers — npm run source:*
 * Delegates to Python archive-pipeline where applicable.
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STATUS_DIR = join(ROOT, 'public/data/status');
const PIPELINE = join(ROOT, 'data-pipeline');

function runPython(args: string, allowFail = false): string {
  try {
    return execSync(`cd "${PIPELINE}" && uv run archive-pipeline ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (allowFail && err instanceof Error && 'stdout' in err) {
      return String((err as { stdout?: string }).stdout ?? '');
    }
    throw err;
  }
}

function writeRealDataCompletionReport(): void {
  mkdirSync(STATUS_DIR, { recursive: true });
  const planPath = join(STATUS_DIR, 'real_data_completion_plan.json');
  const plan = existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf-8')) : { systems: [] };
  const importStatus = existsSync(join(STATUS_DIR, 'source_import_status.json'))
    ? JSON.parse(readFileSync(join(STATUS_DIR, 'source_import_status.json'), 'utf-8'))
    : { sources: [] };
  const implStatus = existsSync(join(STATUS_DIR, 'implementation_status.json'))
    ? JSON.parse(readFileSync(join(STATUS_DIR, 'implementation_status.json'), 'utf-8'))
    : { systems: [] };

  const report = {
    generatedAt: new Date().toISOString(),
    localSystemsFullyImplemented: implStatus.systems?.filter(
      (s: { status: string }) => s.status === 'FULLY_IMPLEMENTED'
    ).length ?? 0,
    partialSystems: implStatus.systems?.filter(
      (s: { status: string }) => s.status === 'PARTIAL_IMPLEMENTATION'
    ).length ?? 0,
    blockedSources: importStatus.sources?.filter((s: { imported: boolean }) => !s.imported).length ?? 0,
    importedSources: importStatus.importedCount ?? 0,
    planSystemCount: plan.systems?.length ?? 0,
    nextActions: (importStatus.sources ?? [])
      .filter((s: { imported: boolean }) => !s.imported)
      .map((s: { source: string; next_action?: string }) => `${s.source}: ${s.next_action ?? 'configure snapshot'}`),
  };
  writeFileSync(join(STATUS_DIR, 'real_data_completion_report.json'), JSON.stringify(report, null, 2));
}

const command = process.argv[2] ?? 'list';

switch (command) {
  case 'list': {
    console.log(runPython('source-list'));
    break;
  }
  case 'validate': {
    console.log(runPython('source-validate'));
    break;
  }
  case 'audit': {
    runPython('source-audit');
    writeRealDataCompletionReport();
    console.log('Wrote source_import_status.json, source_readiness_report.json, real_data_completion_report.json');
    break;
  }
  case 'import': {
    const source = process.argv[3] ?? 'all';
    try {
      console.log(runPython(`import ${source}`, source !== 'all'));
    } catch (e) {
      console.error(String(e));
      process.exit(1);
    }
    writeRealDataCompletionReport();
    break;
  }
  default:
    console.error(`Unknown source command: ${command}`);
    process.exit(1);
}

process.exit(0);
