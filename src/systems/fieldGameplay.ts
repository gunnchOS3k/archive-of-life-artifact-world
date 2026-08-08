/**
 * Field gameplay loop — observe → scan → document → expedition objective glue.
 */

import type { SaveState } from '@/schema';
import { recordObservation, type ObservationEvent } from '@/systems/observationSystem';
import { scanTaxon, type ScanTarget, type SaveWithScans } from '@/systems/scanningSystem';
import { markCodexDocumented } from '@/systems/codexSystem';
import {
  evaluateExpedition,
  type ExpeditionDef,
} from '@/systems/expeditionSystem';
import type { TierRRecordIndex } from '@/coverage/TierRRecordIndex';

export interface FieldSessionResult {
  observed: boolean;
  scanned: boolean;
  documented: boolean;
  expeditionComplete: boolean;
  messages: string[];
}

export function runFieldLoop(
  state: SaveState,
  opts: {
    observation?: ObservationEvent;
    scanQuery?: string;
    catalog: ScanTarget[];
    tierR?: TierRRecordIndex | null;
    expedition?: ExpeditionDef;
    documentSpeciesId?: string;
    documentScientificName?: string;
  },
): FieldSessionResult {
  const messages: string[] = [];
  let observed = false;
  let scanned = false;
  let documented = false;

  if (opts.observation) {
    const r = recordObservation(state, opts.observation);
    observed = true;
    messages.push(r.notebookEntry.text);
  }

  if (opts.scanQuery) {
    const scan = scanTaxon(opts.scanQuery, opts.catalog, opts.tierR, state as SaveWithScans);
    scanned = scan.matched;
    messages.push(scan.message);
  }

  if (opts.documentSpeciesId && opts.documentScientificName) {
    markCodexDocumented(state, opts.documentSpeciesId, opts.documentScientificName);
    documented = true;
    messages.push(`Documented ${opts.documentScientificName}`);
  }

  let expeditionComplete = false;
  if (opts.expedition) {
    const ev = evaluateExpedition(state, opts.expedition);
    expeditionComplete = ev.complete;
    messages.push(
      expeditionComplete
        ? `Expedition ${opts.expedition.id} complete`
        : `Expedition progress ${ev.objectivesDone.length}/${opts.expedition.objectives.length}`,
    );
  }

  return { observed, scanned, documented, expeditionComplete, messages };
}

export function fieldGameplayReady(input: {
  hasObservation: boolean;
  hasScanning: boolean;
  hasCodex: boolean;
  hasExpedition: boolean;
}): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.hasObservation) missing.push('observation');
  if (!input.hasScanning) missing.push('scanning');
  if (!input.hasCodex) missing.push('codex');
  if (!input.hasExpedition) missing.push('expedition');
  return { ready: missing.length === 0, missing };
}
