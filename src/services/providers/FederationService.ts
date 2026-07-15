import type { FederatedRecord, ProviderConflict, SpeciesEvidenceResult } from './types';
import { federationHealthSummary, getProvider, PROVIDER_REGISTRY } from './registry';
import {
  PROVIDER_TIMEOUT_MS,
  isTimeoutError,
  withBoundedTimeout,
} from './boundedPromise';

export type ProviderTaskFailure = {
  providerId: string;
  reason: string;
  timedOut: boolean;
};

function classifyEvidenceStatus(result: {
  records: FederatedRecord[];
  failures: ProviderTaskFailure[];
  offline: boolean;
}): SpeciesEvidenceResult['status'] {
  const { records, failures, offline } = result;
  if (offline && records.length === 0) return 'offline';
  if (records.length === 0) {
    if (failures.length && failures.every((f) => f.timedOut)) return 'timed_out';
    if (failures.length) return 'error';
    return 'empty';
  }
  const statuses = new Set(records.map((r) => r.cacheStatus));
  const hasLive = statuses.has('live');
  const hasCached = statuses.has('cached');
  const hasFixture = statuses.has('fixture');
  if (failures.length) return 'partial';
  if (hasLive) return 'live';
  if (hasCached && !hasFixture) return 'cached';
  if (hasFixture) return 'fixture';
  return 'live';
}

export class FederationService {
  /** Last name conflicts detected during getSpeciesEvidence (both values retained). */
  lastNameConflicts: ProviderConflict[] = [];
  /** Last provider failures from the most recent evidence lookup. */
  lastProviderFailures: ProviderTaskFailure[] = [];

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
          selectionReason:
            'Unresolved — scientificName and acceptedName disagree across providers; both kept',
        });
      }
    }

    return conflicts;
  }

  /**
   * Gather federated evidence with hard per-provider bounds.
   * One hanging or failing provider must not block others or leave the UI loading forever.
   */
  async getSpeciesEvidenceResult(
    speciesId: string,
    scientificName?: string,
    options: { timeoutMs?: number; signal?: AbortSignal } = {},
  ): Promise<SpeciesEvidenceResult> {
    const timeoutMs = options.timeoutMs ?? PROVIDER_TIMEOUT_MS;
    const name = scientificName ?? speciesId.replace(/_/g, ' ');
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

    type Task = { providerId: string; run: () => Promise<FederatedRecord[]> };
    const tasks: Task[] = [];

    const col = getProvider('col');
    if (col?.searchTaxa) {
      tasks.push({
        providerId: 'col',
        run: () => col.searchTaxa!({ scientificName: name }).then((r) => r.slice(0, 2)),
      });
    }
    const gbif = getProvider('gbif');
    if (gbif?.getOccurrences) {
      tasks.push({
        providerId: 'gbif',
        run: () =>
          gbif.getOccurrences!({ taxonId: speciesId, scientificName: name, limit: 3 }),
      });
    }
    const pbdb = getProvider('pbdb');
    if (pbdb?.getFossilOccurrences) {
      tasks.push({
        providerId: 'pbdb',
        run: () =>
          pbdb.getFossilOccurrences!({ taxonId: speciesId, scientificName: name, limit: 3 }),
      });
    }
    const worms = getProvider('worms');
    if (worms?.searchTaxa) {
      tasks.push({
        providerId: 'worms',
        run: () => worms.searchTaxa!({ scientificName: name }).then((r) => r.slice(0, 2)),
      });
    }
    const inat = getProvider('inaturalist');
    if (inat?.getOccurrences) {
      tasks.push({
        providerId: 'inaturalist',
        run: () =>
          inat.getOccurrences!({ taxonId: speciesId, scientificName: name, limit: 2 }),
      });
    }
    const obis = getProvider('obis');
    if (obis?.getMarineOccurrences) {
      tasks.push({
        providerId: 'obis',
        run: () =>
          obis.getMarineOccurrences!({ taxonId: speciesId, scientificName: name, limit: 2 }),
      });
    }
    const neotoma = getProvider('neotoma');
    if (neotoma?.getFossilOccurrences) {
      tasks.push({
        providerId: 'neotoma',
        run: () =>
          neotoma.getFossilOccurrences!({ taxonId: speciesId, scientificName: name, limit: 1 }),
      });
    }
    const nasa = getProvider('nasa');
    if (nasa?.getEnvironmentalLayer) {
      tasks.push({
        providerId: 'nasa',
        run: () =>
          nasa
            .getEnvironmentalLayer!({ regionId: 'global', layerId: 'vegetation' })
            .then((layer) => (layer ? [layer] : [])),
      });
    }

    if (options.signal?.aborted) {
      return {
        records: [],
        failures: [{ providerId: '*', reason: 'aborted', timedOut: false }],
        offline,
        status: 'empty',
        conflicts: [],
      };
    }

    const settled = await Promise.allSettled(
      tasks.map((task) =>
        withBoundedTimeout(task.run(), timeoutMs, `provider ${task.providerId}`).then(
          (records) => ({ providerId: task.providerId, records }),
        ),
      ),
    );

    if (options.signal?.aborted) {
      return {
        records: [],
        failures: [{ providerId: '*', reason: 'aborted', timedOut: false }],
        offline,
        status: 'empty',
        conflicts: [],
      };
    }

    const records: FederatedRecord[] = [];
    const failures: ProviderTaskFailure[] = [];

    settled.forEach((result, index) => {
      const providerId = tasks[index]?.providerId ?? `provider_${index}`;
      if (result.status === 'fulfilled') {
        records.push(...result.value.records);
        return;
      }
      const reason =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      failures.push({
        providerId,
        reason,
        timedOut: isTimeoutError(result.reason),
      });
    });

    this.lastProviderFailures = failures;
    this.lastNameConflicts = this.detectNameConflicts(records);
    if (this.lastNameConflicts.length) {
      console.info(
        '[federation] scientific name conflicts across providers (both retained)',
        this.lastNameConflicts,
      );
    }
    if (failures.length) {
      console.info('[federation] provider failures (partial results retained)', failures);
    }

    const status = classifyEvidenceStatus({ records, failures, offline });
    return {
      records,
      failures,
      offline,
      status,
      conflicts: this.lastNameConflicts,
    };
  }

  /** Convenience: records only (legacy callers). Always settles when providers are bounded. */
  async getSpeciesEvidence(speciesId: string, scientificName?: string) {
    const result = await this.getSpeciesEvidenceResult(speciesId, scientificName);
    return result.records;
  }

  buildConflictNotice(conflicts: ProviderConflict[]): string | null {
    if (!conflicts.length) return null;
    return `${conflicts.length} field(s) have conflicting provider assertions. See Sources and Evidence for all values.`;
  }
}

export const federationService = new FederationService();
