import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AUTHORED_STUDY_TAXA, authoredStudyHalfWidth, drawAuthoredHabitat, drawAuthoredOrganism, hasAuthoredStudy, studyPose } from './organismStudies';
import { stepObservationPose } from '@/systems/observationLocomotion';
import { WildlifeObservation } from '@/minigames/wildlifeObservation';
import { Lifeling } from '@/game/companion';
import { createDefaultSave } from '@/systems/saveSystem';
import type { PlayableSpecies } from '@/services/DataCatalogService';

type Operation = [string, ...unknown[]];
function canvasRecorder() {
  const operations: Operation[] = [];
  const target: Record<string, unknown> = {};
  for (const name of ['save','restore','scale','translate','rotate','fill','stroke','beginPath','closePath','ellipse','arc','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fillRect','strokeRect','clip','setLineDash','clearRect','fillText']) {
    target[name] = (...args: unknown[]) => { operations.push([name, ...args]); };
  }
  target.createLinearGradient = (...args: unknown[]) => {
    operations.push(['gradient', ...args]);
    return { addColorStop: (offset: number, color: string) => operations.push(['colorStop', offset, color]) };
  };
  return { ctx: target as unknown as CanvasRenderingContext2D, operations };
}
beforeAll(() => {
  vi.stubGlobal('Path2D', class { constructor(readonly source: string) {} });
});
afterEach(() => document.documentElement.classList.remove('a11y-reduced-motion'));

describe('authored organism identity and observation animation contracts', () => {
  it('never substitutes its four authored species for another taxon or grouped record', () => {
    for (const id of ['balaenoptera_physalus','panthera_tigris','loxodonta_cyclotis','danaus_gilippus','trilobita_order','','BALAENOPTERA_MUSCULUS','balaenoptera_musculus ']) {
      const { ctx, operations } = canvasRecorder();
      expect(hasAuthoredStudy(id)).toBe(false);
      expect(drawAuthoredOrganism(ctx, id, { time: 1, facing: 1, reducedMotion: false })).toBe(false);
      expect(drawAuthoredHabitat(ctx, id, 400, 300, 1, false)).toBe(false);
      expect(operations).toEqual([]);
    }
  });
  it('gives each real supported taxon a distinct articulated pose and deterministic stillness', () => {
    const moving = AUTHORED_STUDY_TAXA.map(id => studyPose(id, 1.3, false));
    expect(new Set(moving.map(pose => JSON.stringify(pose))).size).toBe(4);
    for (const id of AUTHORED_STUDY_TAXA) {
      expect(studyPose(id, 3, true)).toEqual(studyPose(id, 99, true));
      expect(studyPose(id, NaN, false)).toEqual(studyPose(id, 0, false));
    }
  });
  it('draws real paths, shading and articulation with balanced transforms and no emoji marks', () => {
    for (const id of AUTHORED_STUDY_TAXA) {
      const { ctx, operations } = canvasRecorder();
      expect(drawAuthoredOrganism(ctx, id, { time: 1.3, facing: -1, reducedMotion: false })).toBe(true);
      expect(operations.filter(op => op[0] === 'save').length).toBe(operations.filter(op => op[0] === 'restore').length);
      expect(operations.some(op => op[0] === 'fill')).toBe(true);
      expect(operations.some(op => op[0] === 'rotate')).toBe(true);
      expect(operations.some(op => op[0] === 'fillText')).toBe(false);
    }
  });
  it('renders marine and terrestrial habitat studies differently and freezes their ambient motion', () => {
    const render = (id: string, time: number, reduced: boolean) => {
      const { ctx, operations } = canvasRecorder();
      expect(drawAuthoredHabitat(ctx, id, 400, 300, time, reduced)).toBe(true);
      return JSON.stringify(operations);
    };
    expect(render('balaenoptera_musculus', 0, true)).not.toBe(render('panthera_leo', 0, true));
    for (const id of AUTHORED_STUDY_TAXA) expect(render(id, 1, true)).toBe(render(id, 40, true));
  });
  it('keeps the larger authored whale inside the observation frame without changing fallback bounds', () => {
    const state = { x: 1, y: 150, facing: -1 as const, timer: 1, moveSpeedPx: 22, baseY: 150, canvasWidth: 400, canvasHeight: 300 };
    const authored = stepObservationPose('swim_undulate', { ...state, subjectHalfWidth: authoredStudyHalfWidth('balaenoptera_musculus') }, .1, false);
    expect(authored.x).toBe(150); expect(authored.facing).toBe(1);
    expect(stepObservationPose('swim_undulate', state, .1, false).x).toBe(80);
    expect(authoredStudyHalfWidth('balaenoptera_physalus')).toBeUndefined();
  });
  it('leaves the canvas untouched when Path2D is unavailable', () => {
    const previous = globalThis.Path2D;
    // jsdom has no Path2D; the game loop must keep the existing icon fallback.
    delete (globalThis as { Path2D?: unknown }).Path2D;
    try {
      const { ctx, operations } = canvasRecorder();
      expect(drawAuthoredOrganism(ctx, 'panthera_leo', { time: 0, facing: 1, reducedMotion: true })).toBe(false);
      expect(drawAuthoredHabitat(ctx, 'panthera_leo', 400, 300, 0, true)).toBe(false);
      expect(operations).toEqual([]);
    } finally {
      globalThis.Path2D = previous;
    }
  });
  it('preserves real observation completion and never completes from drawing art', () => {
    for (const id of AUTHORED_STUDY_TAXA) {
      const { ctx } = canvasRecorder();
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300;
      canvas.getContext = (() => ctx) as typeof canvas.getContext;
      const complete = vi.fn();
      const game = new WildlifeObservation(canvas, { id, commonName: id, scientificName: id } as PlayableSpecies, complete, () => undefined);
      game.draw(); game.draw();
      expect(game.getPatience()).toBe(0); expect(complete).not.toHaveBeenCalled();
      game.holding = true;
      for (let i = 0; i < 1100; i++) game.update(.01);
      expect(game.getPatience()).toBe(100); expect(complete).toHaveBeenCalledTimes(1);
      game.destroy();
    }
  });
  it('preserves Lifeling state and existing equipped traits during original visual drawing', () => {
    const state = createDefaultSave().companion;
    state.equippedTraits = ['lion_mane_small','frog_hop','owl_eye_markings','wolf_tail'];
    const before = JSON.stringify(state); const { ctx, operations } = canvasRecorder();
    const lifeling = new Lifeling(); lifeling.triggerReaction('celebrate'); lifeling.update(.2, 10, 10, state);
    lifeling.draw(ctx, state);
    expect(JSON.stringify(state)).toBe(before);
    expect(operations.some(op => op[0] === 'fillText')).toBe(false);
    expect(operations.filter(op => op[0] === 'save').length).toBe(operations.filter(op => op[0] === 'restore').length);
    document.documentElement.classList.add('a11y-reduced-motion');
    const a = canvasRecorder(); lifeling.draw(a.ctx, state);
    lifeling.bobPhase += 1; lifeling.hopPhase += 1;
    const b = canvasRecorder(); lifeling.draw(b.ctx, state);
    expect(a.operations).toEqual(b.operations);
  });
});
