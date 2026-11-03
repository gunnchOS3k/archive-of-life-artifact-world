/**
 * Earned field-study discovery.
 * A representation-tier shortcut (tier <= 3) used to reveal a species without play.
 * These tests fail if that shortcut counts as earned.
 * Fixture-labeled notebook rows are not player progress.
 * The study panel itself does not write a save.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mountAuthoredOrganismPanel } from '@/ui/authoredOrganismPanel';
import {
  commitFieldStudyEarned,
  fieldStudyDiscovered,
  isFieldStudyEarned,
  labelFieldStudyFixture,
  mountFieldStudyDiscoveryCard,
  revealAuthoredFieldStudy,
  FIELD_STUDY_DOCUMENTED_PREFIX,
  FIELD_STUDY_OBSERVED_PREFIX,
} from '@/systems/fieldStudyEarned';
import { createDefaultSave, deleteSave, loadSave } from '@/systems/saveSystem';

const MONARCH = {
  id: 'danaus_plexippus',
  commonName: 'Monarch Butterfly',
  scientificName: 'Danaus plexippus',
  representationTier: 3,
} as const;

beforeAll(() => {
  vi.stubGlobal('Path2D', class { constructor(readonly source: string) {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

describe('earned field study discovery', () => {
  it('does not earn a field study from the representation-tier shortcut', () => {
    deleteSave();
    const state = createDefaultSave();
    // The old shortcut treated every tier <= 3 as discovered. These tiers would pass that check.
    for (const tier of [0, 1, 2, 3]) {
      expect(tier <= 3).toBe(true);
      expect(fieldStudyDiscovered('panthera_leo', tier, state)).toBe(false);
      expect(revealAuthoredFieldStudy('loxodonta_africana', tier, state)).toBe('hidden');
    }

    const host = document.createElement('div');
    document.body.append(host);
    mountFieldStudyDiscoveryCard(host, MONARCH, state);
    const card = host.querySelector<HTMLElement>('[data-field-study-card]');
    expect(card?.dataset.representationTier).toBe('3');
    expect(card?.dataset.tierShortcut).toBe('ignored');
    expect(card?.dataset.discovered).toBe('false');
    expect(card?.dataset.earned).toBe('false');
    expect(card?.textContent).toContain('Undocumented');
    expect(card?.textContent).not.toContain('Monarch Butterfly');
    expect(card?.querySelector('[data-document-field-study]')).toBeTruthy();
    expect(localStorage.getItem('archive_of_life_save')).toBeNull();
    host.remove();
    deleteSave();
  });

  it('documents a field study into a save that reload restores', () => {
    deleteSave();
    const state = createDefaultSave();
    const host = document.createElement('div');
    document.body.append(host);
    mountFieldStudyDiscoveryCard(host, MONARCH, state, (identity) => {
      expect(commitFieldStudyEarned(state, identity, 'document', 1_700_000_000_000)).toBe(true);
    });
    const button = host.querySelector<HTMLButtonElement>('[data-document-field-study]');
    button?.click();

    const restored = loadSave();
    expect(restored?.notebook.some((note) => note.text.startsWith(FIELD_STUDY_DOCUMENTED_PREFIX))).toBe(true);
    expect(restored?.notebook.some((note) => note.speciesId === 'danaus_plexippus')).toBe(true);
    expect(isFieldStudyEarned(restored, 'danaus_plexippus')).toBe(true);
    expect(restored?.stats.speciesDocumented).toBe(1);

    host.replaceChildren();
    mountFieldStudyDiscoveryCard(host, MONARCH, restored!);
    const card = host.querySelector<HTMLElement>('[data-field-study-card]');
    expect(card?.dataset.earned).toBe('true');
    expect(card?.dataset.discovered).toBe('true');
    expect(card?.textContent).toContain('Monarch Butterfly');
    expect(card?.querySelector('[data-document-field-study]')).toBeNull();
    expect(revealAuthoredFieldStudy('danaus_plexippus', 3, restored)).toBe('studied');
    host.remove();
    deleteSave();
  });

  it('observes a field study into a save that reload restores', () => {
    deleteSave();
    const state = createDefaultSave();
    expect(fieldStudyDiscovered('balaenoptera_musculus', 6, state)).toBe(false);
    expect(
      commitFieldStudyEarned(
        state,
        {
          id: 'balaenoptera_musculus',
          commonName: 'Blue Whale',
          scientificName: 'Balaenoptera musculus',
        },
        'observe',
        1_700_000_000_001,
      ),
    ).toBe(true);
    const restored = loadSave();
    expect(restored?.notebook.some((note) => note.text.startsWith(FIELD_STUDY_OBSERVED_PREFIX))).toBe(true);
    expect(isFieldStudyEarned(restored, 'balaenoptera_musculus')).toBe(true);
    expect(fieldStudyDiscovered('balaenoptera_musculus', 1, restored)).toBe(true);
    deleteSave();
  });

  it('does not treat a fixture-labeled notebook row as player progress', () => {
    const state = createDefaultSave();
    state.notebook.push(
      labelFieldStudyFixture({
        time: 1,
        text: 'Field study observed: Lion (Panthera leo)',
        speciesId: 'panthera_leo',
        scientificName: 'Panthera leo',
        regionId: 'savanna',
      }),
    );
    expect(state.notebook[0]?.text.startsWith('Fixture:')).toBe(true);
    expect(isFieldStudyEarned(state, 'panthera_leo')).toBe(false);
    expect(fieldStudyDiscovered('panthera_leo', 1, state)).toBe(false);
  });

  it('does not write a save when the field study panel is only mounted', () => {
    deleteSave();
    const host = document.createElement('div');
    document.body.append(host);
    mountAuthoredOrganismPanel(host, {
      id: 'panthera_leo',
      commonName: 'Lion',
      scientificName: 'Panthera leo',
    });
    expect(localStorage.getItem('archive_of_life_save')).toBeNull();
    host.remove();
  });

  it('wires the running dex and observation completion through earned discovery', () => {
    const root = process.cwd();
    const dex = readFileSync(join(root, 'src/ui/archiveDexUI.ts'), 'utf8');
    const game = readFileSync(join(root, 'src/game/Game.ts'), 'utf8');
    expect(dex).toContain('fieldStudyDiscovered');
    expect(dex).toContain('commitFieldStudyEarned');
    expect(dex).toContain('data-document-field-study');
    expect(game).toContain("noteFieldStudyEarned");
    expect(game).toContain("'observe'");
  });
});
