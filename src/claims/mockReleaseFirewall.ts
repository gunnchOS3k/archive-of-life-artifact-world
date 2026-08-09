/**
 * Cont VII — MOCK firewall for release runtime.
 * Mock/sample provenance may exist for demos, but MUST NOT satisfy release completeness.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface MockFirewallReport {
  generatedAt: string;
  continuation: 'VII';
  ok: boolean;
  releaseRuntimeAllowsMockClaims: false;
  mockIndexEntries: number;
  totalIndexEntries: number;
  releaseEligibleEntries: number;
  violations: string[];
  honesty: {
    engineDigitalRcScope: 'launch_tier_engine_runtime';
    globalCatalogComplete: false;
    mockCannotSatisfyReleaseGates: true;
  };
}

function isMockSource(sources: unknown): boolean {
  if (!Array.isArray(sources)) return false;
  return sources.some((s) => {
    const v = String(s).toLowerCase();
    return v.includes('mock') || v === 'mock_sample' || v.includes('sample');
  });
}

export function runMockReleaseFirewall(root = process.cwd()): MockFirewallReport {
  const violations: string[] = [];
  const indexPath = join(root, 'public/data/bundles/search-index.json');
  const claimsPath = join(root, 'public/data/claims/claim_ledger.json');
  const rcPath = join(root, 'public/data/status/digital_rc_report.json');

  let totalIndexEntries = 0;
  let mockIndexEntries = 0;
  let releaseEligibleEntries = 0;

  if (existsSync(indexPath)) {
    const idx = JSON.parse(readFileSync(indexPath, 'utf8')) as {
      entries?: Array<{ sources?: string[]; programTier?: string }>;
    };
    const entries = idx.entries ?? [];
    totalIndexEntries = entries.length;
    for (const e of entries) {
      const mock = isMockSource(e.sources);
      if (mock) mockIndexEntries += 1;
      else releaseEligibleEntries += 1;
    }
  } else {
    violations.push('missing search-index.json');
  }

  if (existsSync(claimsPath)) {
    const ledger = JSON.parse(readFileSync(claimsPath, 'utf8')) as {
      earned?: Array<{ token?: string; earned?: boolean }>;
      forbiddenRejected?: Array<{ token?: string }>;
    };
    const forbiddenOk = (ledger.forbiddenRejected ?? []).some(
      (f) => String(f.token).includes('GLOBAL') || String(f.token).includes('ALL_SPECIES'),
    );
    if (!forbiddenOk) {
      // soft: ledger should reject global complete
      violations.push('claim_ledger missing GLOBAL/ALL_SPECIES forbiddenRejected entries');
    }
    for (const e of ledger.earned ?? []) {
      if (!e.earned) continue;
      const t = String(e.token ?? '');
      if (t.includes('GLOBAL_DATA_COMPLETE') || t.includes('ALL_SPECIES_INGESTED')) {
        violations.push(`earned forbidden token: ${t}`);
      }
    }
  }

  if (existsSync(rcPath)) {
    const rc = JSON.parse(readFileSync(rcPath, 'utf8')) as {
      statusToken?: string;
      claimLevel?: string;
      doesNotClaim?: string[];
    };
    if (rc.statusToken && /GLOBAL|ALL_SPECIES/.test(rc.statusToken)) {
      violations.push(`digital_rc_report statusToken forbidden: ${rc.statusToken}`);
    }
    const denies = (rc.doesNotClaim ?? []).join(' ');
    if (denies && !/GLOBAL|ALL_SPECIES|mock/i.test(denies)) {
      // optional honesty — not a hard violation
    }
  }

  // Release runtime policy: mock may exist, but releaseEligible must be non-zero for engine RC.
  if (releaseEligibleEntries === 0 && totalIndexEntries > 0) {
    violations.push('all index entries appear mock — cannot satisfy release runtime');
  }

  return {
    generatedAt: new Date().toISOString(),
    continuation: 'VII',
    ok: violations.length === 0,
    releaseRuntimeAllowsMockClaims: false,
    mockIndexEntries,
    totalIndexEntries,
    releaseEligibleEntries,
    violations,
    honesty: {
      engineDigitalRcScope: 'launch_tier_engine_runtime',
      globalCatalogComplete: false,
      mockCannotSatisfyReleaseGates: true,
    },
  };
}
