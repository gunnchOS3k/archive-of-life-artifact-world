import type { AuditContext, AuditResult } from './shared';

export function auditEarth(ctx: AuditContext): AuditResult[] {
  const results: AuditResult[] = [];
  const continents = ctx.placeRegistry.places.filter((p) => p.type === 'continent');
  const oceanBasins = ctx.placeRegistry.places.filter((p) => p.type === 'ocean_basin');
  const regionIds = new Set(ctx.regions.map((r) => r.id));

  for (const continent of continents) {
    results.push({
      name: `continent_${continent.id}_registered`,
      passed: true,
      message: `${continent.name} registered in place registry (coverage audit scaffold)`,
      category: 'earth',
    });
  }

  for (const basin of oceanBasins) {
    results.push({
      name: `ocean_basin_${basin.id}_registered`,
      passed: true,
      message: `${basin.name} registered in place registry (coverage audit scaffold)`,
      category: 'earth',
    });
  }

  const unlinkedRegions = ctx.regions.filter(
    (r) => r.type === 'explore' && !ctx.placeRegistry.places.some((p) => p.id === r.biome || p.id === r.id)
  );
  results.push({
    name: 'playable_regions_link_place_registry',
    passed: unlinkedRegions.length === 0,
    message: unlinkedRegions.length
      ? `Regions not in place registry: ${unlinkedRegions.map((r) => r.id).join(', ')}`
      : 'Playable regions link to place registry records',
    category: 'earth',
  });

  results.push({
    name: 'expedition_zones_registered',
    passed: [...regionIds].every((id) => ctx.placeRegistry.places.some((p) => p.id === id || p.id.includes(id))),
    message: `${regionIds.size} expedition zones tracked`,
    category: 'earth',
  });

  return results;
}
