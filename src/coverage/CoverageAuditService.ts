import type { AuditResult } from './CoverageDashboardService';

export class CoverageAuditService {
  runChecks(checks: AuditResult[]): { passed: number; failed: number; blocking: AuditResult[] } {
    const failed = checks.filter((c) => !c.passed);
    const blocking = failed.filter((c) => c.blocking);
    return { passed: checks.length - failed.length, failed: failed.length, blocking };
  }
}

export const coverageAuditService = new CoverageAuditService();
