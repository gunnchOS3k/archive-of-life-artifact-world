import { loadAuditContext, printResults } from './audits/shared';
import { auditBias } from './audits/bias';

const failed = printResults(auditBias(loadAuditContext()), 'Bias & Balance Audit');
process.exit(failed > 0 ? 1 : 0);
