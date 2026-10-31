import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertSilhouetteSvgPackageHonesty,
  buildSilhouetteSvgPackageManifest,
  listSilhouetteSvgAssets,
  renderSilhouetteSvgPackageHtml,
  renderSilhouetteSvgPreviewHtml,
  SILHOUETTE_SVG_MODES,
} from '@/systems/silhouetteSvgPackage';

const ROOT = process.cwd();

describe('silhouetteSvgPackage', () => {
  it('packages all locomotion modes as procedural ≠ finished SVG stubs', () => {
    const assets = listSilhouetteSvgAssets();
    expect(assets).toHaveLength(SILHOUETTE_SVG_MODES.length);
    for (const a of assets) {
      expect(a.finishedModel).toBe(false);
      expect(a.humanApproved).toBe(false);
      expect(a.assetKind).toBe('procedural_silhouette_svg');
      expect(a.svg).toContain('data-finished-model="false"');
      expect(a.svg).toContain(`data-mode="${a.mode}"`);
    }

    const manifest = buildSilhouetteSvgPackageManifest('2026-10-30T21:00:00.000Z');
    assertSilhouetteSvgPackageHonesty(manifest);
    expect(manifest.finishedModelsClaimed).toBe(false);
    expect(manifest.sourceVerifiedRelease).toBe(false);
    expect(manifest.iucnAssessed).toBe(false);
    expect(manifest.mapsUnlocked).toBe(false);
    expect(manifest.flagshipBindings).toBe(24);
    expect(manifest.flagshipModeMap.danaus_plexippus).toBe('flutter');

    const html = renderSilhouetteSvgPackageHtml(manifest);
    expect(html).toContain('data-silhouette-svg-package');
    expect(html).toContain('finishedModelsClaimed=false');
    expect(renderSilhouetteSvgPreviewHtml('equus_caballus_ferus')).toContain('data-silhouette-svg-preview');
  });

  it('ships public SVG files with honesty attributes', () => {
    for (const mode of SILHOUETTE_SVG_MODES) {
      const path = join(ROOT, 'public/assets/silhouettes', `silhouette-${mode}.svg`);
      expect(existsSync(path)).toBe(true);
      const svg = readFileSync(path, 'utf8');
      expect(svg).toContain('data-finished-model="false"');
      expect(svg).toContain(`data-mode="${mode}"`);
    }
    const manifestPath = join(ROOT, 'public/assets/silhouettes/MANIFEST.json');
    expect(existsSync(manifestPath)).toBe(true);
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(m.finishedModelsClaimed).toBe(false);
    expect(m.sourceVerifiedRelease).toBe(false);
    expect(m.modeCount).toBe(10);
  });
});
