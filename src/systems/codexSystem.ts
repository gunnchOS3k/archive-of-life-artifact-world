/**
 * Codex (ArchiveDex) progress helpers — document / unlock / citation surfacing.
 */

import type { SaveState } from '@/schema';

export interface CodexEntryRef {
  speciesId: string;
  scientificName: string;
  documented: boolean;
  hasProvenance: boolean;
}

export interface CodexProgress {
  documentedCount: number;
  scannedCount: number;
  withProvenance: number;
  entries: CodexEntryRef[];
}

export function buildCodexProgress(
  state: SaveState,
  catalog: Array<{ id: string; scientificName: string }>,
): CodexProgress {
  const documentedIds = new Set(
    state.notebook.filter((n) => n.speciesId).map((n) => n.speciesId),
  );
  const entries: CodexEntryRef[] = catalog.map((c) => {
    const notes = state.notebook.filter((n) => n.speciesId === c.id);
    const hasProvenance = notes.some((n) => (n.provenanceCitations?.length ?? 0) > 0);
    return {
      speciesId: c.id,
      scientificName: c.scientificName,
      documented: documentedIds.has(c.id),
      hasProvenance,
    };
  });
  return {
    documentedCount: entries.filter((e) => e.documented).length,
    scannedCount: ((state as SaveState & { scans?: unknown[] }).scans ?? []).length,
    withProvenance: entries.filter((e) => e.hasProvenance).length,
    entries,
  };
}

export function markCodexDocumented(
  state: SaveState,
  speciesId: string,
  scientificName: string,
  now = Date.now(),
): void {
  if (state.notebook.some((n) => n.speciesId === speciesId && n.text.startsWith('Codex:'))) return;
  state.notebook.push({
    time: now,
    text: `Codex: documented ${scientificName}`,
    speciesId,
    scientificName,
  });
  state.stats.speciesDocumented = Math.max(
    state.stats.speciesDocumented,
    new Set(state.notebook.map((n) => n.speciesId).filter(Boolean)).size,
  );
}
