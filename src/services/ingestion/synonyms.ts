/**
 * Synonym + conflict resolution for ingested taxa.
 */

import { normalizeScientificName } from './dedup';
import type { IngestedTaxonRecord } from './types';

export interface SynonymEdge {
  synonym: string;
  acceptedName: string;
  source: string;
  sourceRecordId: string;
}

export interface NameConflict {
  scientificName: string;
  sources: string[];
  sourceRecordIds: string[];
  reason: 'cross_source_name' | 'accepted_mismatch';
}

export interface SynonymConflictStats {
  synonymEdges: number;
  uniqueSynonyms: number;
  uniqueAcceptedViaSynonym: number;
  conflicts: number;
  conflictDetails: NameConflict[];
}

export function extractSynonyms(record: IngestedTaxonRecord): string[] {
  const fromField = record.synonyms ?? [];
  const payload = record.payload as Record<string, unknown> | null;
  const fromPayload = Array.isArray(payload?.synonyms)
    ? (payload!.synonyms as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];
  const accepted = record.acceptedName?.trim();
  const names = new Set<string>([...fromField, ...fromPayload].map((s) => s.trim()).filter(Boolean));
  if (accepted && normalizeScientificName(accepted) !== normalizeScientificName(record.scientificName)) {
    // scientificName may itself be a synonym pointing at accepted
  }
  return [...names];
}

export function buildSynonymIndex(records: IngestedTaxonRecord[]): {
  edges: SynonymEdge[];
  bySynonym: Map<string, SynonymEdge>;
  stats: SynonymConflictStats;
  conflicts: NameConflict[];
} {
  const edges: SynonymEdge[] = [];
  const bySynonym = new Map<string, SynonymEdge>();
  const byName = new Map<string, IngestedTaxonRecord[]>();

  for (const r of records) {
    const nk = normalizeScientificName(r.scientificName);
    const list = byName.get(nk) ?? [];
    list.push(r);
    byName.set(nk, list);

    const accepted =
      r.acceptedName?.trim() ||
      (typeof (r.payload as Record<string, unknown> | undefined)?.acceptedName === 'string'
        ? String((r.payload as Record<string, unknown>).acceptedName)
        : undefined);

    for (const syn of extractSynonyms(r)) {
      const edge: SynonymEdge = {
        synonym: syn,
        acceptedName: accepted ?? r.scientificName,
        source: String(r.provenance.source),
        sourceRecordId: r.provenance.sourceRecordId,
      };
      edges.push(edge);
      bySynonym.set(normalizeScientificName(syn), edge);
    }

    // Synonym-status records
    const status = String((r.payload as Record<string, unknown> | undefined)?.status ?? '');
    if (status === 'synonym' && accepted) {
      const edge: SynonymEdge = {
        synonym: r.scientificName,
        acceptedName: accepted,
        source: String(r.provenance.source),
        sourceRecordId: r.provenance.sourceRecordId,
      };
      edges.push(edge);
      bySynonym.set(normalizeScientificName(r.scientificName), edge);
    }
  }

  const conflicts: NameConflict[] = [];
  for (const [name, rows] of byName) {
    const sources = [...new Set(rows.map((r) => String(r.provenance.source)))];
    if (sources.length > 1) {
      conflicts.push({
        scientificName: name,
        sources,
        sourceRecordIds: rows.map((r) => r.provenance.sourceRecordId),
        reason: 'cross_source_name',
      });
    }
    const acceptedSet = new Set(
      rows
        .map((r) => r.acceptedName?.trim())
        .filter((a): a is string => !!a)
        .map(normalizeScientificName),
    );
    if (acceptedSet.size > 1) {
      conflicts.push({
        scientificName: name,
        sources,
        sourceRecordIds: rows.map((r) => r.provenance.sourceRecordId),
        reason: 'accepted_mismatch',
      });
    }
  }

  const uniqueAccepted = new Set(edges.map((e) => normalizeScientificName(e.acceptedName)));
  return {
    edges,
    bySynonym,
    conflicts,
    stats: {
      synonymEdges: edges.length,
      uniqueSynonyms: bySynonym.size,
      uniqueAcceptedViaSynonym: uniqueAccepted.size,
      conflicts: conflicts.length,
      conflictDetails: conflicts.slice(0, 50),
    },
  };
}

export function resolveAcceptedName(
  scientificName: string,
  bySynonym: Map<string, SynonymEdge>,
): string {
  const edge = bySynonym.get(normalizeScientificName(scientificName));
  return edge?.acceptedName ?? scientificName;
}
