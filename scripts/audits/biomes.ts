import type { AuditContext, AuditResult } from './shared';

export function auditBiomes(ctx: AuditContext): AuditResult[] {
  const results: AuditResult[] = [];
  const playableRegions = ctx.regions.filter((r) => r.type === 'explore');
  const heroById = new Map(ctx.hero.species.map((s) => [s.id, s]));

  for (const region of playableRegions) {
    const hasSpecies = (region.speciesIds?.length ?? 0) > 0;
    const hasLearning = region.speciesIds?.some((id: string) => {
      const sp = heroById.get(id);
      return (sp?.gameplay?.learningTopics?.length ?? 0) > 0;
    });
    const hasArtifacts = region.speciesIds?.some(
      (id: string) => (heroById.get(id)?.artifactTemplates?.length ?? 0) > 0
    );
    results.push({
      name: `playable_biome_${region.id}_requirements`,
      passed: hasSpecies && hasLearning && hasArtifacts,
      message: `${region.name}: species=${hasSpecies}, learning=${hasLearning}, artifacts=${hasArtifacts}`,
      category: 'biome',
      blocking: true,
    });
  }

  const realms = new Set(ctx.biomeRegistry.biomes.map((b) => b.realm));
  const requiredRealms = [
    'terrestrial',
    'freshwater',
    'marine',
    'subterranean',
    'atmospheric',
    'polar',
    'human_modified',
    'microbial',
    'paleoenvironment',
  ];
  const missingRealms = requiredRealms.filter((r) => !realms.has(r));
  results.push({
    name: 'biome_registry_major_realms',
    passed: missingRealms.length === 0,
    message: missingRealms.length
      ? `Missing realm categories: ${missingRealms.join(', ')}`
      : 'Biome registry covers all major realms',
    category: 'biome',
  });

  return results;
}
