import type { AuditContext, AuditResult } from './shared';
import type { SpeciesIndexEntry } from '../../src/schema';

export function auditTime(ctx: AuditContext): AuditResult[] {
  const results: AuditResult[] = [];
  const unitIds = new Set(ctx.timeUnits.units.map((u) => u.id));
  const rangeIds = new Set(ctx.taxonRanges.ranges.map((r) => r.taxonId));
  const heroById = new Map(ctx.hero.species.map((s) => [s.id, s]));

  const missingUnits = ctx.icsScope.unitIds.filter((id) => !unitIds.has(id));
  results.push({
    name: 'ics_time_units_present',
    passed: missingUnits.length === 0,
    message: missingUnits.length
      ? `Missing ICS units: ${missingUnits.join(', ')}`
      : `All ${ctx.icsScope.unitIds.length} scoped ICS units present`,
    category: 'time',
  });

  const unitsNoProv = ctx.timeUnits.units.filter((u) => !u.sourceProvenance?.length);
  results.push({
    name: 'time_units_have_provenance',
    passed: unitsNoProv.length === 0,
    message: unitsNoProv.length
      ? `${unitsNoProv.length} time units missing provenance`
      : 'All time units have source provenance',
    category: 'time',
    blocking: true,
  });

  const invalidGateUnits = ctx.timeGates.gates.flatMap((g) =>
    g.timeUnitIds.filter((id) => !unitIds.has(id)).map((id) => `${g.id}:${id}`)
  );
  results.push({
    name: 'playable_gates_valid_time_units',
    passed: invalidGateUnits.length === 0,
    message: invalidGateUnits.length
      ? `Invalid gate time refs: ${invalidGateUnits.join(', ')}`
      : `All ${ctx.timeGates.gates.length} time gates reference valid units`,
    category: 'time',
  });

  const playableGates = ctx.timeGates.gates.filter((g) => g.isPlayable);
  const gatesWithoutTaxa = playableGates.filter(
    (g) => !g.representativeTaxa?.length && !g.uncertaintyNotes
  );
  results.push({
    name: 'playable_gates_have_taxa_or_justification',
    passed: gatesWithoutTaxa.length === 0,
    message: gatesWithoutTaxa.length
      ? `${gatesWithoutTaxa.length} playable gates lack taxa/evidence`
      : 'Playable time gates have taxa or pre-life justification',
    category: 'time',
    blocking: true,
  });

  const missingPbdb = ctx.pbdbScope.taxonIds.filter((id) => !rangeIds.has(id));
  results.push({
    name: 'pbdb_taxa_have_time_ranges',
    passed: missingPbdb.length === 0,
    message: missingPbdb.length
      ? `Missing PBDB time ranges: ${missingPbdb.join(', ')}`
      : `All ${ctx.pbdbScope.taxonIds.length} PBDB-scoped taxa have time ranges`,
    category: 'time',
  });

  const extantNoHolocene = ctx.index.entries.filter((e: SpeciesIndexEntry) => {
    if (e.lifeStatus !== 'extant' || e.isExtinct) return false;
    if (!e.isPlayable && e.representationTier < 6) return false;
    const hero = heroById.get(e.id);
    const timeIds = e.timeUnitIds ?? hero?.timeUnitIds ?? [];
    return !timeIds.some((id: string) => id.includes('holocene') || id.includes('quaternary'));
  });
  results.push({
    name: 'extant_taxa_holocene_mapping',
    passed: extantNoHolocene.length === 0,
    message: extantNoHolocene.length
      ? `${extantNoHolocene.length} extant taxa missing Holocene/Quaternary mapping`
      : 'Extant taxa mapped to present/Holocene minimum',
    category: 'time',
  });

  return results;
}
