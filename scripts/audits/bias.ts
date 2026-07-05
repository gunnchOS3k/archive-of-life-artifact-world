import type { AuditContext, AuditResult } from './shared';

export function auditBias(ctx: AuditContext): AuditResult[] {
  const results: AuditResult[] = [];
  const byGroup: Record<string, number> = {};
  for (const e of ctx.index.entries) {
    byGroup[e.group] = (byGroup[e.group] ?? 0) + 1;
  }

  const mammals = byGroup['Mammal'] ?? 0;
  const reptiles = byGroup['Reptile'] ?? 0;
  const insects = byGroup['Insect'] ?? 0;
  const microbes = byGroup['Microbe'] ?? 0;

  results.push({
    name: 'taxonomic_balance_reported',
    passed: true,
    message: `Groups: Mammal=${mammals}, Reptile=${reptiles}, Insect=${insects}, Microbe=${microbes}`,
    category: 'bias',
  });

  const dinosaurHeavy = (byGroup['Reptile'] ?? 0) >= (byGroup['Insect'] ?? 0) * 2;
  results.push({
    name: 'charismatic_dinosaur_bias_detected',
    passed: !dinosaurHeavy,
    message: dinosaurHeavy
      ? 'Reptile/dinosaur count may overrepresent charismatic extinct taxa vs insects'
      : 'No extreme dinosaur/reptile overrepresentation detected in sample scope',
    category: 'bias',
  });

  results.push({
    name: 'underrepresented_groups_flagged',
    passed: insects >= 3 && microbes >= 1,
    message: `Insects=${insects}, Microbes=${microbes} — minimum sample thresholds for balance audit`,
    category: 'bias',
  });

  return results;
}
