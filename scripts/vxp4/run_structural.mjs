#!/usr/bin/env node
/**
 * VXP-4 structural asserts — Living Archive presence without claiming Pixel/human PASS.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'artifacts/vxp4/capture');
mkdirSync(OUT, { recursive: true });

const checks = [];
function assert(id, cond, detail = '') {
  checks.push({ id, pass: !!cond, detail });
}

const iconDir = join(ROOT, 'src/assets/vxp4/icons');
const fontDir = join(ROOT, 'src/assets/vxp4/fonts');
const css = join(ROOT, 'css/living-archive.css');
const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
const main = readFileSync(join(ROOT, 'src/main.ts'), 'utf8');
const living = readFileSync(join(ROOT, 'src/ui/livingArchive.ts'), 'utf8');
const styles = readFileSync(join(ROOT, 'css/styles.css'), 'utf8');

const requiredIcons = [
  'explore', 'observe', 'collect', 'archive', 'lifeling', 'time', 'map',
  'evidence', 'journal', 'quest', 'region', 'biome', 'species', 'artifact',
  'provenance', 'uncertainty', 'settings', 'accessibility', 'pause', 'back', 'brand-seal',
];

assert('living_archive_css', existsSync(css));
assert('living_archive_module', existsSync(join(ROOT, 'src/ui/livingArchive.ts')));
assert('body_class_in_html', index.includes('vxp4-living-archive'));
assert('emotional_mode_attr', index.includes('data-emotional-mode'));
assert('primary_cta_begin', /Begin Expedition/i.test(index));
assert('css_imported', main.includes('living-archive.css'));
assert('legacy_styles_preserved', existsSync(join(ROOT, 'css/styles.css')) && styles.includes('--bg-dark'));
assert('admin_surfaces_marked', index.includes('data-admin-surface="true"'));
assert('no_game_rename', /Archive of Life/.test(index) && !/Living Archive</.test(index));

for (const icon of requiredIcons) {
  assert(`icon_${icon}`, existsSync(join(iconDir, `${icon}.svg`)));
}

const fonts = [
  'SourceSerif4-Regular.woff2',
  'SourceSerif4-SemiBold.woff2',
  'SourceSans3-Regular.woff2',
  'SourceSans3-SemiBold.woff2',
  'SourceSans3-Bold.woff2',
  'OFL-SourceFonts.txt',
];
for (const f of fonts) {
  assert(`font_${f}`, existsSync(join(fontDir, f)));
}

assert('brand_provenance_doc', existsSync(join(ROOT, 'docs/vxp4/VXP4_BRAND_PROVENANCE.md')));
assert('before_after_doc', existsSync(join(ROOT, 'docs/vxp4/VXP4_BEFORE_AFTER.md')));
assert('human_packet_doc', existsSync(join(ROOT, 'docs/vxp4/VXP4_HUMAN_VALIDATION_PACKET.md')));
assert('truth_chip_helper', living.includes('truthChipHtml'));
assert('icon_hydrate', living.includes('hydrateLivingArchiveIcons'));

// HUD should not use emoji production icons in index
const hudSection = index.split('id="hud-buttons"')[1]?.slice(0, 2500) || '';
assert('hud_no_emoji', !/[\u{1F300}-\u{1FAFF}]/u.test(hudSection));

const pass = checks.every((c) => c.pass);
const result = {
  program: 'VXP-4',
  pass,
  checked: checks.length,
  failed: checks.filter((c) => !c.pass).map((c) => c.id),
  checks,
  icon_count: readdirSync(iconDir).filter((f) => f.endsWith('.svg')).length,
};
writeFileSync(join(OUT, 'STRUCTURAL_RESULT.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!pass) process.exit(1);
