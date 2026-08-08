/**
 * Run Cont VI Digital RC suite and write evidence artifacts.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { runDigitalRcSuite } from '../src/systems/digitalRcSuite';

const root = process.cwd();
mkdirSync(join(root, 'public/data/status'), { recursive: true });
const result = runDigitalRcSuite(root);
writeFileSync(
  join(root, 'public/data/status/digital_rc_suite.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log('digitalRcSuiteAllOk=', result.allOk);
for (const [id, c] of Object.entries(result.checks)) {
  console.log(`  ${c.ok ? '✓' : '✗'} ${id}: ${c.detail}`);
}
process.exit(result.allOk ? 0 : 1);
