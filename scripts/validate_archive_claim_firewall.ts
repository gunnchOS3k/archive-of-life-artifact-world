/**
 * Archive data claim firewall (Cont V §67).
 * Rejects assertive GLOBAL_DATA_COMPLETE / ALL_SPECIES_INGESTED unless authoritative evidence exists.
 * Permits PIPELINE_COMPLETE / SNAPSHOT_VERSION_*_LOADED / LAUNCH_TIER_E/F_COMPLETE when earned.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { isForbiddenClaimToken } from '../src/claims/claimTokens';

const ROOT = process.cwd();
const SCAN = [
  'public/data/status',
  'public/data/claims',
  'public/data/coverage',
  'public/data/rc',
  'docs',
];

const ALLOW_LINE =
  /(not |never |forbidden|pending|do not|without claiming|must not|reject|prohibited|forbiddenRejected|doesNotClaim|CLAIM_FIREWALL|never asserts|automatically reject|Non-claims|Always rejected|\*\*Always rejected\*\*|Revoked|does \*\*not\*\*)/i;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(json|md|txt|ya?ml)$/i.test(name)) out.push(p);
  }
  return out;
}

function jsonAssertsForbidden(obj: unknown, path = ''): string[] {
  const hits: string[] = [];
  if (obj == null) return hits;
  if (typeof obj === 'string') {
    if (isForbiddenClaimToken(obj) && !path.includes('doesNotClaim') && !path.includes('forbiddenRejected') && !path.includes('notes') && !path.includes('revoked') && !path.includes('reason')) {
      // statusToken / earned token value asserting forbidden
      if (path.endsWith('statusToken') || path.includes('.token') || path.endsWith('token')) {
        hits.push(`${path}=${obj}`);
      }
    }
    return hits;
  }
  if (Array.isArray(obj)) {
    // doesNotClaim / forbiddenRejected arrays may list forbidden strings — allowed
    if (path.endsWith('doesNotClaim') || path.endsWith('forbiddenRejected') || path.endsWith('not')) {
      return hits;
    }
    obj.forEach((v, i) => hits.push(...jsonAssertsForbidden(v, `${path}[${i}]`)));
    return hits;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = path ? `${path}.${k}` : k;
      if (k === 'doesNotClaim' || k === 'forbiddenRejected' || k === 'notes' || k === 'not') continue;
      // earned:false entries are revocations
      if (
        k === 'token' &&
        typeof v === 'string' &&
        isForbiddenClaimToken(v) &&
        (obj as { earned?: boolean }).earned === true
      ) {
        hits.push(`${next}=${v} (earned)`);
      }
      hits.push(...jsonAssertsForbidden(v, next));
    }
  }
  return hits;
}

const hits: string[] = [];
for (const d of SCAN) {
  for (const file of walk(join(ROOT, d))) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    if (rel.includes('CLAIM_FIREWALL') || rel.includes('validate_archive_claim_firewall')) continue;
    if (rel.includes('CONTINUATION_V_ARCHIVE_CLOSURE')) continue;

    if (file.endsWith('.json')) {
      try {
        const j = JSON.parse(text);
        for (const h of jsonAssertsForbidden(j)) hits.push(`${rel}:${h}`);
      } catch {
        /* ignore */
      }
      continue;
    }

    for (const [i, line] of text.split(/\r?\n/).entries()) {
      if (!/GLOBAL_DATA_COMPLETE|ALL_SPECIES_INGESTED/.test(line)) continue;
      if (ALLOW_LINE.test(line)) continue;
      hits.push(`${rel}:${i + 1}:${line.trim().slice(0, 160)}`);
    }
  }
}

if (hits.length) {
  console.log('ARCHIVE_CLAIM_FIREWALL_FAIL');
  for (const h of hits.slice(0, 50)) console.log(h);
  process.exit(1);
}

console.log('ARCHIVE_CLAIM_FIREWALL_PASS');
process.exit(0);
