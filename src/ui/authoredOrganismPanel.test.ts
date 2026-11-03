/**
 * ArchiveDex field-study mount for the four original Canvas2D studies.
 * Species identity, accessible disclosure, and missing-art clearing.
 * Discovery in this test is a DOM fixture — not earned save progress.
 * 2D studies are not 3D models. IUCN and paleomaps are not invented here.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mountAuthoredOrganismPanel } from '@/ui/authoredOrganismPanel';
import { buildHabitatExhibit } from '@/systems/habitatGeologyExhibit';
import type { ArchiveDexEntry } from '@/schema/archivedex';

const STUDIES = [
  {
    id: 'balaenoptera_musculus',
    commonName: 'Blue Whale',
    scientificName: 'Balaenoptera musculus',
    accessibleName:
      'Blue Whale (Balaenoptera musculus). Long blue-gray whale with invented mottling, narrow flippers, a small rear dorsal fin and broad flukes, in an illustrated ocean.',
  },
  {
    id: 'panthera_leo',
    commonName: 'Lion',
    scientificName: 'Panthera leo',
    accessibleName:
      'Lion (Panthera leo). Adult male lion with a dark mane, yellow-gold body, paws and tufted tail, in an illustrated savanna.',
  },
  {
    id: 'loxodonta_africana',
    commonName: 'African Elephant',
    scientificName: 'Loxodonta africana',
    accessibleName:
      'African Elephant (Loxodonta africana). African savanna elephant with large ears, tusks, a flexible trunk, columnar feet and wrinkled gray skin beside an illustrated waterhole.',
  },
  {
    id: 'danaus_plexippus',
    commonName: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    accessibleName:
      'Monarch Butterfly (Danaus plexippus). Adult monarch butterfly with orange wings, black veins and borders, and white spotting, above illustrated milkweed.',
  },
] as const;

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

beforeAll(() => {
  vi.stubGlobal('Path2D', class { constructor(readonly source: string) {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    const target: Record<string, unknown> = {};
    for (const name of ['save','restore','scale','translate','rotate','fill','stroke','beginPath','closePath','ellipse','arc','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fillRect','strokeRect','clip','setLineDash','clearRect','fillText','setTransform']) {
      target[name] = () => undefined;
    }
    target.createLinearGradient = () => ({ addColorStop: () => undefined });
    return target as unknown as CanvasRenderingContext2D;
  });
});

describe('authored organism field studies', () => {
  it('mounts each original study under its own species identity and accessible name', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    for (const study of STUDIES) {
      const root = host();
      expect(mountAuthoredOrganismPanel(root, study)).toBe(true);
      const figure = root.querySelector<HTMLElement>('[data-authored-organism-panel]');
      expect(figure?.dataset.authoredOrganismPanel).toBe(study.id);
      expect(figure?.dataset.artMedium).toBe('original_canvas2d');
      expect(figure?.dataset.motion).toBe('static');
      expect(figure?.dataset.artStatus).toBe('production_candidate');
      const canvas = figure?.querySelector('canvas');
      expect(canvas?.getAttribute('aria-label')).toBe(study.accessibleName);
      expect(canvas?.getAttribute('role')).toBe('img');
      const summary = figure?.querySelector('summary');
      expect(summary?.textContent).toBe('About this field study');
      expect(figure?.textContent).toContain(`${study.commonName} · ${study.scientificName}`);
      expect(figure?.textContent).toContain('Original 2D art · work in progress');
      expect(figure?.textContent).toContain('setting rather than a recorded location');
      expect(figure?.textContent).not.toMatch(/source_verified|paleomap|IUCN|3D model/i);
      expect(figure?.dataset.renderStatus).toBe('rendered');
      expect(figure?.querySelector('.dex-authored-study__fallback')?.hasAttribute('hidden')).toBe(true);
      root.remove();
    }
    expect(raf).not.toHaveBeenCalled();
    raf.mockRestore();
  });

  it('clears a mounted study when the next identity has no original art', () => {
    const root = host();
    expect(mountAuthoredOrganismPanel(root, STUDIES[0])).toBe(true);
    expect(root.querySelector('[data-authored-organism-panel="balaenoptera_musculus"]')).toBeTruthy();
    expect(
      mountAuthoredOrganismPanel(root, {
        id: 'balaenoptera_physalus',
        commonName: 'Fin Whale',
        scientificName: 'Balaenoptera physalus',
      }),
    ).toBe(false);
    expect(root.querySelector('[data-authored-organism-panel]')).toBeNull();
    expect(
      mountAuthoredOrganismPanel(root, {
        id: 'loxodonta_cyclotis',
        commonName: 'African Forest Elephant',
        scientificName: 'Loxodonta cyclotis',
      }),
    ).toBe(false);
    expect(root.querySelector('canvas')).toBeNull();
    root.remove();
  });

  it('does not leave the previous species canvas in place when the identity changes', () => {
    const root = host();
    mountAuthoredOrganismPanel(root, STUDIES[0]);
    mountAuthoredOrganismPanel(root, STUDIES[1]);
    const panels = root.querySelectorAll('[data-authored-organism-panel]');
    expect(panels).toHaveLength(1);
    expect((panels[0] as HTMLElement).dataset.authoredOrganismPanel).toBe('panthera_leo');
    expect(panels[0].querySelector('canvas')?.getAttribute('aria-label')).toBe(STUDIES[1].accessibleName);
    root.remove();
  });

  it('keeps a mock whale range as sample_fallback and not source_verified', () => {
    const entry = {
      id: 'balaenoptera_musculus',
      habitatRange: { rangeDataMode: 'mock_sample', rangeSourceVersion: 'mock-launch-floor' },
    } as ArchiveDexEntry;
    const exhibit = buildHabitatExhibit(entry);
    expect(exhibit.rangeClaim).toBe('sample_fallback');
    expect(exhibit.rangeClaim).not.toBe('source_verified');
  });
});
