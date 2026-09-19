import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { truthChipHtml } from '@/ui/livingArchive';

const ROOT = process.cwd();

describe('VXP-4 Living Archive structural', () => {
  it('ships Living Archive CSS and preserves legacy styles', () => {
    expect(existsSync(join(ROOT, 'css/living-archive.css'))).toBe(true);
    expect(existsSync(join(ROOT, 'css/styles.css'))).toBe(true);
  });

  it('keeps player-facing title Archive of Life', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    expect(html).toMatch(/<h1>Archive of Life<\/h1>/);
    expect(html).toMatch(/vxp4-living-archive/);
    expect(html).toMatch(/Begin Expedition/);
    expect(html).toMatch(/data-admin-surface="true"/);
  });

  it('provides required original icons', () => {
    const icons = readdirSync(join(ROOT, 'src/assets/vxp4/icons')).filter((f) => f.endsWith('.svg'));
    for (const name of [
      'explore',
      'observe',
      'collect',
      'archive',
      'lifeling',
      'time',
      'map',
      'evidence',
      'journal',
      'quest',
      'provenance',
      'uncertainty',
      'brand-seal',
    ]) {
      expect(icons).toContain(`${name}.svg`);
    }
  });

  it('does not inflate truth chips', () => {
    expect(truthChipHtml('mock_sample')).toMatch(/Mock \/ sample/);
    expect(truthChipHtml('source_verified')).toMatch(/Source verified/);
    expect(truthChipHtml('game_authored_verified')).toMatch(/Game-authored/);
    expect(truthChipHtml('mock_sample')).not.toMatch(/Source verified/);
  });
});
