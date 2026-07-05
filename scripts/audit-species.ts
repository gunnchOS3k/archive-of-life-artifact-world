import { loadAuditContext, printResults } from './audits/shared';
import { auditSpecies } from './audits/species';

const failed = printResults(auditSpecies(loadAuditContext()), 'Species Coverage Audit');
process.exit(failed > 0 ? 1 : 0);
