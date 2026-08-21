import { createHash } from 'node:crypto';
import { makeCanonicalId } from '@/schema/scientificRecord';

const aliasMap = new Map<string, string>();

/** Stable canonical IDs — namespaced, not display names. */
export function canonicalIdFromSourceIdentity(source: string, sourceRecordId: string): string {
  const key = `${source}:${sourceRecordId}`.toLowerCase();
  return makeCanonicalId(createHash('sha256').update(key).digest('hex').slice(0, 16));
}

export function registerAlias(fromCanonical: string, toCanonical: string): void {
  aliasMap.set(fromCanonical, toCanonical);
}

export function resolveCanonicalAlias(canonicalId: string): string {
  let cur = canonicalId;
  const seen = new Set<string>();
  while (aliasMap.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    cur = aliasMap.get(cur)!;
  }
  return cur;
}

export function detectCanonicalCollision(ids: string[]): string[] {
  const counts = new Map<string, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

export function retainCanonicalAcrossRename(
  priorCanonical: string,
  _oldName: string,
  _newName: string,
): string {
  return priorCanonical;
}
