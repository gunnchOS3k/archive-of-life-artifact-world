#!/usr/bin/env node
/**
 * VXP-4 Living Archive — authentic Playwright runtime capture.
 * Digital/desktop only. Never claims Pixel/physical validation.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const OUT = join(ROOT, 'artifacts/vxp4');
const AFTER = join(OUT, 'after');
const CAPTURE = join(OUT, 'capture');
const MANIFESTS = join(OUT, 'manifests');

mkdirSync(AFTER, { recursive: true });
mkdirSync(CAPTURE, { recursive: true });
mkdirSync(MANIFESTS, { recursive: true });

const VIEWPORTS = [
  { id: 'desktop-1440x900', width: 1440, height: 900 },
  { id: 'laptop-1366x768', width: 1366, height: 768 },
  { id: 'tablet-768x1024', width: 768, height: 1024 },
  { id: 'phone-390x844', width: 390, height: 844 },
];

const A11Y_MODES = [
  { id: 'default', apply: async () => {} },
  {
    id: 'high-contrast',
    apply: async (page) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('a11y-high-contrast');
      });
    },
  },
  {
    id: 'reduce-motion',
    apply: async (page) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('a11y-reduced-motion');
      });
    },
  },
  {
    id: 'large-text',
    apply: async (page) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('a11y-large-text');
      });
    },
  },
];

const shots = [];
const logLines = [];

function log(msg) {
  logLines.push(`[${new Date().toISOString()}] ${msg}`);
  console.log(msg);
}

async function shot(page, name, meta = {}) {
  const file = `after_${name}.png`;
  const path = join(AFTER, file);
  await page.screenshot({ path, fullPage: false });
  const entry = { name, file, ok: existsSync(path), ...meta };
  shots.push(entry);
  log(`captured ${file}`);
  return entry;
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`vite server not ready: ${url}`);
}

async function main() {
  const PORT = 5194;
  const server = await createServer({
    root: ROOT,
    configFile: join(ROOT, 'vite.config.ts'),
    server: { port: PORT, strictPort: true, host: '127.0.0.1' },
    logLevel: 'error',
  });
  await server.listen();
  const url = `http://127.0.0.1:${PORT}/`;
  await waitForUrl(url);
  log(`vite preview-like server at ${url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  try {
    mkdirSync(join(OUT, 'before'), { recursive: true });
    // Before baseline note (title structure at first paint of Living Archive)
    writeFileSync(
      join(OUT, 'before/BASELINE_NOTE.txt'),
      [
        'VXP-4 before baseline was dark-olive console (css/styles.css :root --bg-dark #1a1f16).',
        'Live origin/main SHA recorded in VXP4_GATES.json.',
        'After captures are authentic Playwright screenshots of the Living Archive recomposition.',
        '',
      ].join('\n'),
    );

    // Journey: home → begin → map → archive → time → companion → journal
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('#title-screen.active', { timeout: 60000 });
      await page.waitForTimeout(400);
      await shot(page, `home_${vp.id}`, { surface: 'museum-hub', viewport: vp.id });

      // Primary CTA present
      const cta = page.locator('#btn-new-game');
      await cta.waitFor({ state: 'visible' });

      await cta.click();
      await page.waitForSelector('#game-screen.active', { timeout: 120000 });
      await page.waitForTimeout(800);
      await shot(page, `explore_hud_${vp.id}`, { surface: 'explore', viewport: vp.id });

      // Onboarding if visible
      const onboard = page.locator('#onboarding-overlay:not(.hidden)');
      if (await onboard.count()) {
        await shot(page, `onboarding_${vp.id}`, { surface: 'onboarding', viewport: vp.id });
        await page.locator('#onboarding-complete').click();
        await page.waitForTimeout(400);
      }

      await page.locator('#btn-map').click();
      await page.waitForSelector('#panel-map:not(.hidden)', { timeout: 30000 });
      await page.waitForTimeout(500);
      await shot(page, `expedition_map_${vp.id}`, { surface: 'choose-expedition', viewport: vp.id });
      await page.locator('#panel-map .panel-close').click();

      await page.locator('#btn-archive').click();
      await page.waitForSelector('#panel-archive:not(.hidden)', { timeout: 30000 });
      await page.waitForTimeout(500);
      await shot(page, `archivedex_${vp.id}`, { surface: 'remember', viewport: vp.id });
      await page.locator('#panel-archive .panel-close').click();

      await page.locator('#btn-time').click();
      await page.waitForSelector('#panel-time:not(.hidden)', { timeout: 30000 });
      await page.waitForTimeout(500);
      await shot(page, `time_atlas_${vp.id}`, { surface: 'understand', viewport: vp.id });
      await page.locator('#panel-time .panel-close').click();

      await page.locator('#btn-companion').click();
      await page.waitForSelector('#panel-companion:not(.hidden)', { timeout: 30000 });
      await page.waitForTimeout(400);
      await shot(page, `lifeling_${vp.id}`, { surface: 'discover', viewport: vp.id });
      await page.locator('#panel-companion .panel-close').click();

      await page.locator('#btn-notebook').click();
      await page.waitForSelector('#panel-notebook:not(.hidden)', { timeout: 30000 });
      await page.waitForTimeout(300);
      await shot(page, `journal_${vp.id}`, { surface: 'remember', viewport: vp.id });
      await page.locator('#panel-notebook .panel-close').click();
    }

    // A11y modes on desktop home + explore
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const mode of A11Y_MODES) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('#title-screen.active', { timeout: 60000 });
      await mode.apply(page);
      await page.waitForTimeout(300);
      await shot(page, `home_a11y_${mode.id}`, { surface: 'museum-hub', a11y: mode.id });
      await page.locator('#btn-new-game').click();
      await page.waitForSelector('#game-screen.active', { timeout: 120000 });
      await page.waitForTimeout(600);
      const onboard2 = page.locator('#onboarding-overlay:not(.hidden)');
      if (await onboard2.count()) {
        await page.locator('#onboarding-complete').click();
        await page.waitForTimeout(300);
      }
      await shot(page, `explore_a11y_${mode.id}`, { surface: 'explore', a11y: mode.id });
    }

    // Dev admin surface separation (?dev=1)
    await page.goto(`${url}?dev=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#title-screen.active', { timeout: 60000 });
    await page.locator('#btn-new-game').click();
    await page.waitForSelector('#game-screen.active', { timeout: 120000 });
    await page.waitForTimeout(600);
    const onboard3 = page.locator('#onboarding-overlay:not(.hidden)');
    if (await onboard3.count()) {
      await page.locator('#onboarding-complete').click();
      await page.waitForTimeout(300);
    }
    await page.keyboard.press('g');
    await page.waitForTimeout(800);
    const covVisible = await page.locator('#panel-coverage:not(.hidden)').count();
    if (covVisible) {
      await shot(page, 'admin_coverage_dev', { surface: 'admin', viewport: 'desktop-1440x900' });
    } else {
      // Still capture game screen with ?dev=1 for admin-path evidence; do not invent PASS.
      await shot(page, 'admin_coverage_dev', {
        surface: 'admin',
        viewport: 'desktop-1440x900',
        note: 'coverage panel not auto-visible after g; captured explore under ?dev=1',
      });
    }

    const living = await page.evaluate(() => ({
      bodyClass: document.body.classList.contains('vxp4-living-archive'),
      brand: !!document.querySelector('.la-brand-seal, [data-vxp4="living-archive"]'),
      cta: !!document.querySelector('[data-cta="begin-expedition"], #btn-new-game'),
      adminAttr: !!document.querySelector('[data-admin-surface="true"]'),
      emojiHud: /[\u{1F300}-\u{1FAFF}]/u.test(document.querySelector('#hud-buttons')?.textContent || ''),
    }));

    const manifest = {
      program: 'VXP-4',
      title: 'Archive of Life Living Archive runtime capture',
      capture_class: 'playwright_vite_runtime',
      pixel_physical: false,
      human_visual_validation: false,
      human_fun_validation: false,
      url,
      living_archive_checks: living,
      shot_count: shots.filter((s) => s.ok).length,
      shots,
      captured_at: new Date().toISOString(),
    };
    writeFileSync(join(MANIFESTS, 'VXP4_RUNTIME_CAPTURE_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(join(CAPTURE, 'capture.log'), logLines.join('\n') + '\n');
    writeFileSync(
      join(CAPTURE, 'COMMAND_RESULTS.json'),
      JSON.stringify(
        {
          ok: shots.filter((s) => s.ok).length >= 12,
          playwright_ran: true,
          vite_runtime: true,
          shot_ok: shots.filter((s) => s.ok).length,
          shot_total: shots.length,
          living,
        },
        null,
        2,
      ) + '\n',
    );
    log(`done shots_ok=${manifest.shot_count}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  writeFileSync(
    join(CAPTURE, 'COMMAND_RESULTS.json'),
    JSON.stringify({ ok: false, error: String(err), playwright_ran: true }, null, 2) + '\n',
  );
  process.exit(1);
});
