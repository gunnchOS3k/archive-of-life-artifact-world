import { loadAuditContext, printResults } from './audits/shared';
import { auditTime } from './audits/time';

const failed = printResults(auditTime(loadAuditContext()), 'Time Coverage Audit');
process.exit(failed > 0 ? 1 : 0);
