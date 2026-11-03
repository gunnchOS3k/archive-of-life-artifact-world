/**
 * Earned discovery for the four original field studies.
 * Mounting the study panel does not write a save.
 * A representation-tier shortcut is not play and does not earn.
 * Notebook rows labeled "Fixture:" are not player progress.
 */
import type { NotebookEntry, SaveState } from '@/schema';
import { hasAuthoredStudy } from '@/art/organismStudies';
import { saveGame } from '@/systems/saveSystem';

export const FIELD_STUDY_OBSERVED_PREFIX = 'Field study observed:';
export const FIELD_STUDY_DOCUMENTED_PREFIX = 'Field study documented:';
export const FIELD_STUDY_FIXTURE_PREFIX = 'Fixture:';

export type FieldStudyIdentity = {
  id: string;
  commonName: string;
  scientificName: string;
};

export type FieldStudyEarnMode = 'observe' | 'document';

export function isFixtureNotebookEntry(entry: NotebookEntry): boolean {
  return entry.text.startsWith(FIELD_STUDY_FIXTURE_PREFIX);
}

/** Label a seeded row so it cannot be read as player progress. */
export function labelFieldStudyFixture(entry: NotebookEntry): NotebookEntry {
  if (isFixtureNotebookEntry(entry)) return entry;
  return { ...entry, text: `${FIELD_STUDY_FIXTURE_PREFIX} ${entry.text}` };
}

function playerEarnNote(entry: NotebookEntry, taxonId: string): boolean {
  if (entry.speciesId !== taxonId || isFixtureNotebookEntry(entry)) return false;
  return (
    entry.text.startsWith(FIELD_STUDY_OBSERVED_PREFIX) ||
    entry.text.startsWith(FIELD_STUDY_DOCUMENTED_PREFIX)
  );
}

export function isFieldStudyEarned(state: SaveState | null | undefined, taxonId: string): boolean {
  if (!state || !hasAuthoredStudy(taxonId)) return false;
  return state.notebook.some((entry) => playerEarnNote(entry, taxonId));
}

/**
 * Old dex behavior treated `representationTier <= 3` as discovered without play.
 * That shortcut is ignored for the four field studies.
 */
export function fieldStudyDiscovered(
  taxonId: string,
  representationTier: number,
  state: SaveState | null | undefined,
): boolean {
  void representationTier;
  return isFieldStudyEarned(state, taxonId);
}

/** Hidden until the player observes or documents. Tier never opens the study. */
export function revealAuthoredFieldStudy(
  taxonId: string,
  representationTier: number,
  state: SaveState | null | undefined,
): 'hidden' | 'studied' {
  void representationTier;
  if (!hasAuthoredStudy(taxonId)) return 'hidden';
  return isFieldStudyEarned(state, taxonId) ? 'studied' : 'hidden';
}

export function noteFieldStudyEarned(
  state: SaveState,
  identity: FieldStudyIdentity,
  mode: FieldStudyEarnMode,
  now = Date.now(),
): boolean {
  if (!hasAuthoredStudy(identity.id)) return false;
  if (isFieldStudyEarned(state, identity.id)) return false;
  const prefix = mode === 'observe' ? FIELD_STUDY_OBSERVED_PREFIX : FIELD_STUDY_DOCUMENTED_PREFIX;
  state.notebook.push({
    time: now,
    text: `${prefix} ${identity.commonName} (${identity.scientificName})`,
    speciesId: identity.id,
    scientificName: identity.scientificName,
    regionId: state.player.currentRegion,
  });
  if (mode === 'document') state.stats.speciesDocumented += 1;
  return true;
}

/** Writes the running-app save. Returns false when the taxon is not one of the four studies. */
export function commitFieldStudyEarned(
  state: SaveState,
  identity: FieldStudyIdentity,
  mode: FieldStudyEarnMode,
  now = Date.now(),
): boolean {
  if (!hasAuthoredStudy(identity.id)) return false;
  noteFieldStudyEarned(state, identity, mode, now);
  if (!isFieldStudyEarned(state, identity.id)) return false;
  saveGame(state);
  return true;
}

/**
 * Card used by the dex and by the DOM test.
 * `representationTier` is shown and then ignored: tier <= 3 stays undocumented.
 */
export function mountFieldStudyDiscoveryCard(
  host: HTMLElement,
  entry: FieldStudyIdentity & { representationTier: number },
  state: SaveState,
  onDocument?: (identity: FieldStudyIdentity) => void,
): HTMLElement {
  host.querySelector('[data-field-study-card]')?.remove();
  const earned = fieldStudyDiscovered(entry.id, entry.representationTier, state);
  const doc = host.ownerDocument;
  const card = doc.createElement('div');
  card.className = earned ? 'archive-card' : 'archive-card locked';
  card.dataset.fieldStudyCard = entry.id;
  card.dataset.id = entry.id;
  card.dataset.discovered = earned ? 'true' : 'false';
  card.dataset.earned = earned ? 'true' : 'false';
  card.dataset.representationTier = String(entry.representationTier);
  card.dataset.tierShortcut = 'ignored';
  const name = doc.createElement('div');
  name.className = 'species-name';
  name.textContent = earned ? entry.commonName : 'Undocumented';
  card.append(name);
  if (!earned) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.dataset.documentFieldStudy = entry.id;
    button.textContent = 'Document this field study';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onDocument?.({
        id: entry.id,
        commonName: entry.commonName,
        scientificName: entry.scientificName,
      });
    });
    card.append(button);
  }
  host.append(card);
  return card;
}
