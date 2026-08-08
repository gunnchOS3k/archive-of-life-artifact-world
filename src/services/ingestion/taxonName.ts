/**
 * Normalize provider scientific names for honesty filters.
 * Strips authorship / sensu / cf. noise without inventing taxa.
 */

const BLOCKED = /^(unknown|n\/a|tbd|placeholder|invented|fake|lorem|\?+)$/i;

/** Extract a bare taxon string from common authorship forms. */
export function canonicalizeTaxonName(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  let n = String(raw).trim();
  if (!n) return undefined;

  // Drop leading uncertainty markers
  n = n.replace(/^[?\s]+/, '').trim();
  // Drop trailing "sp." / "spp." for genus-level records — keep genus token
  n = n.replace(/\s+spp?\.?\s*$/i, '').trim();

  // Strip authorship: "Ursus arctos Linnaeus, 1758" → "Ursus arctos"
  n = n.replace(/\s+\([^)]*\)\s*,?\s*\d{4}.*$/, '').trim();
  n = n.replace(/\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ\-\.]+(?:\s+&\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ\-\.]+)?(?:,?\s*\d{4}).*$/, '').trim();
  n = n.replace(/,?\s*\d{4}.*$/, '').trim();

  // Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();
  if (!n || BLOCKED.test(n)) return undefined;
  return n;
}

export function isAcceptableTaxonName(name: string | undefined | null): name is string {
  const n = canonicalizeTaxonName(name);
  if (!n || n.length < 3) return false;
  if (BLOCKED.test(n)) return false;
  // Latinized tokens; allow hybrid × and subsp. markers already stripped
  return /^[A-Za-z][A-Za-z\-]+(?:\s+[A-Za-z][A-Za-z\-]+)*$/.test(n);
}
