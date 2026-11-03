import { describe, expect, it } from 'vitest';
import { blueWhalePlateHtml, mountBlueWhaleStudy } from './blueWhaleStudy';

describe('authored blue-whale field plate', () => {
  it('binds only to the exact species, never another whale or mammal', () => {
    expect(blueWhalePlateHtml('balaenoptera_musculus')).toContain('data-art-status="production_candidate"');
    for (const id of ['balaenoptera_physalus', 'panthera_leo', '', 'trilobita_order']) expect(blueWhalePlateHtml(id)).toBe('');
  });
  it('mounts once and moves the selected accessible anatomy state', () => {
    const doc = new DOMParser().parseFromString('<div id="organism-study-host"></div>', 'text/html');
    expect(mountBlueWhaleStudy(doc)).toBe(true);
    expect(mountBlueWhaleStudy(doc)).toBe(false);
    const fin = doc.querySelector<HTMLButtonElement>('[data-whale-feature="fin"]')!;
    fin.click();
    expect(fin.getAttribute('aria-pressed')).toBe('true');
    expect(doc.querySelector('[data-whale-feature="body"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(doc.querySelector('[data-whale-note]')?.textContent).toContain('small compared');
    expect(doc.querySelectorAll('img')).toHaveLength(1);
    expect(doc.querySelectorAll('details a')).toHaveLength(2);
  });
  it('does not invent a host or change saved progress', () => {
    const before = JSON.stringify(localStorage);
    expect(mountBlueWhaleStudy(new DOMParser().parseFromString('<main></main>', 'text/html'))).toBe(false);
    expect(JSON.stringify(localStorage)).toBe(before);
  });
});
