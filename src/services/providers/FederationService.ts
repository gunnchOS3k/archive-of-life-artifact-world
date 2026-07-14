import type { FederatedRecord, ProviderConflict } from './types';
import { federationHealthSummary, getProvider, PROVIDER_REGISTRY } from './registry';

export class FederationService {
  /** Last name conflicts detected during getSpeciesEvidence (both values retained). */
  lastNameConflicts: ProviderConflict[] = [];

  async healthCheckAll() {
    return federationHealthSummary();
  }

  listProviders() {
    return PROVIDER_REGISTRY.map((p) => ({
      id: p.id,
      organization: p.organization,
      domains: p.domains,
      attribution: p.getAttribution(),
    }));
  }

  /**
   * Detect when scientificName or acceptedName disagree across providers.
   * Both values are retained in the record set; this only surfaces the conflict.
   */
  detectNameConflicts(records: FederatedRecord[]): ProviderConflict[] {
    const conflicts: ProviderConflict[] = [];
    const fields = ['scientificName', 'acceptedName'] as const;

    for (const field of fields) {
      const byNorm = new Map<string, FederatedRecord[]>();
      for (const record of records) {
        const raw = record[field];
        if (raw == null || String(raw).trim() === '') continue;
        const key = String(raw).trim().toLowerCase();
        const list = byNorm.get(key) ?? [];
        list.push(record);
        byNorm.set(key, list);
      }
      if (byNorm.size <= 1) continue;

      const assertions: ProviderConflict['assertions'] = [];
      for (const group of byNorm.values()) {
        for (const r of group) {
          assertions.push({
            providerId: r.providerId,
            value: r[field],
            confidence: r.confidence,
            retrievedAt: r.retrievedAt,
          });
        }
      }
      conflicts.push({
        field,
        assertions,
        selectionReason: 'Unresolved — both values retained in federated evidence',
      });
    }

    // Cross-field: one provider's scientificName vs another's acceptedName
    const sciNames = new Map<string, FederatedRecord>();
    const accNames = new Map<string, FederatedRecord>();
    for (const r of records) {
      if (r.scientificName?.trim()) {
        sciNames.set(r.scientificName.trim().toLowerCase(), r);
      }
      if (r.acceptedName?.trim()) {
        accNames.set(r.acceptedName.trim().toLowerCase(), r);
      }
    }
    if (sciNames.size && accNames.size) {
      const sciKeys = [...sciNames.keys()];
      const accKeys = [...accNames.keys()];
      const shared = sciKeys.filter((k) => accNames.has(k));
      const disagree =
        shared.length === 0 &&
        sciKeys.some((sk) => !accKeys.includes(sk)) &&
        accKeys.some((ak) => !sciKeys.includes(ak));
      if (disagree) {
        conflicts.push({
          field: 'scientificName|acceptedName',
          assertions: [
            ...sciKeys.map((k) => {
              const r = sciNames.get(k)!;
              return {
                providerId: r.providerId,
                value: r.scientificName,
                confidence: r.confidence,
                retrievedAt: r.retrievedAt,
              };
            }),
            ...accKeys.map((k) => {
              const r = accNames.get(k)!;
              return {
                providerId: r.providerId,
                value: r.acceptedName,
                confidence: r.confidence,
                retrievedAt: r.retrievedAt,
              };
            }),
          ],
          selectionReason: 'Unresolved — scientificName and acceptedName disagree across providers; both kept',
        });
      }
    }

    return conflicts;
  }

  async getSpeciesEvidence(speciesId: string, scientificName?: string) {
    const name = scientificName ?? speciesId.replace(/_/g, ' ');
    const tasks: Array<Promise<FederatedRecord[]>> = [];

    const col = getProvider('col');
    if (col?.searchTaxa) {
      tasks.push(col.searchTaxa({ scientificName: name }).then((r) => r.slice(0, 2)));
    }
    const gbif = getProvider('gbif');
    if (gbif?.getOccurrences) {
      tasks.push(
        gbif.getOccurrences({ taxonId: speciesId, scientificName: name, limit: 3 }),
      );
    }
    const pbdb = getProvider('pbdb');
    if (pbdb?.getFossilOccurrences) {
      tasks.push(
        pbdb.getFossilOccurrences({ taxonId: speciesId, scientificName: name, limit: 3 }),
      );
    }
    const worms = getProvider('worms');
    if (worms?.searchTaxa) {
      tasks.push(worms.searchTaxa({ scientificName: name }).then((r) => r.slice(0, 2)));
    }
    const inat = getProvider('inaturalist');
    if (inat?.getOccurrences) {
      tasks.push(
        inat.getOccurrences({ taxonId: speciesId, scientificName: name, limit: 2 }),
      );
    }
    const obis = getProvider('obis');
    if (obis?.getMarineOccurrences) {
      tasks.push(
        obis.getMarineOccurrences({ taxonId: speciesId, scientificName: name, limit: 2 }),
      );
    }
    const neotoma = getProvider('neotoma');
    if (neotoma?.getFossilOccurrences) {
      tasks.push(
        neotoma.getFossilOccurrences({ taxonId: speciesId, scientificName: name, limit: 1 }),
      );
    }
    const nasa = getProvider('nasa');
    if (nasa?.getEnvironmentalLayer) {
      tasks.push(
        nasa
          .getEnvironmentalLayer({ regionId: 'global', layerId: 'vegetation' })
          .then((layer) => (layer ? [layer] : [])),
      );
    }

    const settled = await Promise.allSettled(tasks);
    const records: FederatedRecord[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') records.push(...result.value);
    }

    this.lastNameConflicts = this.detectNameConflicts(records);
    if (this.lastNameConflicts.length) {
      console.info(
        '[federation] scientific name conflicts across providers (both retained)',
        this.lastNameConflicts,
      );
    }

    return records;
  }

  buildConflictNotice(conflicts: ProviderConflict[]): string | null {
    if (!conflicts.length) return null;
    return `${conflicts.length} field(s) have conflicting provider assertions. See Sources and Evidence for all values.`;
  }
}

export const federationService = new FederationService();
