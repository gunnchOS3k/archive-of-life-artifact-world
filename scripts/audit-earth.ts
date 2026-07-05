import { loadAuditContext, printResults } from './audits/shared';
import { auditEarth } from './audits/earth';

const failed = printResults(auditEarth(loadAuditContext()), 'Earth Place Coverage Audit');
process.exit(failed > 0 ? 1 : 0);
