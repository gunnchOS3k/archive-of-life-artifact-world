import { loadAuditContext, printResults } from './audits/shared';
import { auditBiomes } from './audits/biomes';

const failed = printResults(auditBiomes(loadAuditContext()), 'Biome Coverage Audit');
process.exit(failed > 0 ? 1 : 0);
