import type { FederatedRecord, ProviderConflict } from './types';
import { federationHealthSummary, getProvider, PROVIDER_REGISTRY } from './registry';

export class FederationService {
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

  async getSpeciesEvidence(speciesId: string, scientificName?: string) {
    const records: FederatedRecord[] = [];
    const col = getProvider('col');
    if (col?.searchTaxa) {
      records.push(...(await col.searchTaxa({ scientificName: scientificName ?? speciesId })));
    }
    const gbif = getProvider('gbif');
    if (gbif?.getOccurrences) {
      records.push(...(await gbif.getOccurrences({ taxonId: speciesId, limit: 3 })));
    }
    const pbdb = getProvider('pbdb');
    if (pbdb?.getFossilOccurrences) {
      records.push(...(await pbdb.getFossilOccurrences({ taxonId: speciesId, limit: 3 })));
    }
    return records;
  }

  buildConflictNotice(conflicts: ProviderConflict[]): string | null {
    if (!conflicts.length) return null;
    return `${conflicts.length} field(s) have conflicting provider assertions. See Sources and Evidence for all values.`;
  }
}

export const federationService = new FederationService();
