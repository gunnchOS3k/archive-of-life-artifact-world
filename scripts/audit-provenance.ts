import { loadAuditContext, printResults } from './audits/shared';
import { auditProvenance } from './audits/provenance';

const failed = printResults(auditProvenance(loadAuditContext()), 'Provenance Audit');
process.exit(failed > 0 ? 1 : 0);
