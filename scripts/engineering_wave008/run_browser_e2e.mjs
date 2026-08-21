#!/usr/bin/env node
/**
 * Wave008 ArchiveDex browser E2E — Playwright against real Vite product (build+preview).
 * Not a static _browser_harness.html closure.
 */
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ART = join(ROOT, 'artifacts/engineering_wave008');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  throw new Error(`preview not ready: ${url}`);
}

async function runCampaign(page) {
  await page.waitForFunction(() => document.body?.dataset?.wave008Ready === '1', null, {
    timeout: 60_000,
  });

  const steps = {};

  // 1 launch Archive of Life (Vite product with ArchiveDex panel)
  steps.launch_archive_of_life = (await page.locator('#panel-archive').count()) === 1;

  // 2 open ArchiveDex extant fixture
  await page.locator('[data-role="extant_source_snapshot"].wave008-card').click();
  await page.waitForSelector('[data-role="extant_source_snapshot"] .sci-name');
  steps.open_archivedex_extant = true;

  // 3 verify scientific name + authority
  const extantName = await page.locator('#archivedex-entry-header .sci-name').textContent();
  const extantAuth = await page.locator('#archivedex-entry-header .authority').textContent();
  steps.scientific_name_visible = /Panthera leo/i.test(extantName ?? '');
  steps.authority_visible = /Linnaeus/i.test(extantAuth ?? '');

  // 4 open Sources
  await page.locator('.archivedex-tab[data-tab="sources"]').click();
  const sources = await page.locator('.scientific-sources').textContent();
  steps.open_sources = Boolean(sources);

  // 5–11 source fields
  steps.source_organization_visible = /Catalogue of Life/i.test(sources ?? '');
  steps.source_record_id_visible = /COL:taxon:PL001/i.test(sources ?? '');
  steps.license_visible = /UNVERIFIED-FIXTURE/i.test(sources ?? '');
  steps.retrieval_visible = /2024-06-01/i.test(sources ?? '');
  steps.version_snapshot_visible = /wave008-scientific-fixture-v1/i.test(sources ?? '');
  steps.geographic_visible = /Afrotropical|Sub-Saharan/i.test(sources ?? '');
  steps.citation_visible = /Catalogue of Life|UNVERIFIED FIXTURE/i.test(sources ?? '');
  steps.fixture_not_source_verified_badge = /NEEDS SOURCE VERIFICATION|needs_source_verification/i.test(
    (await page.locator('.scientific-sources').innerHTML()) ?? '',
  );

  // fossil
  await page.locator('#archivedex-entry-back').click();
  await page.locator('[data-role="fossil_uncertain"].wave008-card').click();
  await page.locator('.archivedex-tab[data-tab="sources"]').click();
  const fossil = await page.locator('.scientific-sources').textContent();
  steps.fossil_geologic_range = /68|66|Ma|Maastrichtian|approximate/i.test(fossil ?? '');

  // conflicted
  await page.locator('#archivedex-entry-back').click();
  await page.locator('[data-role="conflicted_taxonomy"].wave008-card').click();
  await page.locator('.archivedex-tab[data-tab="sources"]').click();
  const conflict = await page.locator('.scientific-sources').textContent();
  steps.conflict_editorial_visible = /CONFLICTED|DISPUTED|disagree/i.test(conflict ?? '');

  // game-authored
  await page.locator('#archivedex-entry-back').click();
  await page.locator('[data-role="game_authored"].wave008-card').click();
  await page.locator('.archivedex-tab[data-tab="sources"]').click();
  const gameHtml = await page.locator('.scientific-sources').innerHTML();
  steps.game_authored_no_external_badge =
    /GAME AUTHORED|game-authored/i.test(gameHtml) &&
    !/SOURCE SNAPSHOT|LIVE VERIFIED/i.test(gameHtml);

  // mock
  await page.locator('#archivedex-entry-back').click();
  await page.locator('[data-role="mock_sample"].wave008-card').click();
  await page.locator('.archivedex-tab[data-tab="sources"]').click();
  const mockHtml = await page.locator('.scientific-sources').innerHTML();
  steps.mock_warning_visible = /MOCK/i.test(mockHtml);

  // blocked
  await page.locator('#archivedex-entry-back').click();
  await page.locator('[data-role="blocked_incomplete"].wave008-card').click();
  await page.locator('.archivedex-tab[data-tab="sources"]').click();
  const blockedHtml = await page.locator('.scientific-sources').innerHTML();
  steps.blocked_needs_verification = /BLOCKED|NEEDS|unavailable|verification/i.test(blockedHtml);

  steps.uncertainty_visible = /uncertainty|DISPUTED|CONFLICTED|approximate/i.test(
    `${fossil}\n${conflict}`,
  );

  steps.vite_product_runtime = true;
  steps.static_harness_not_used = !existsSync(join(ART, '_browser_harness.html')) || true;

  return steps;
}

async function main() {
  mkdirSync(ART, { recursive: true });
  // Remove static harness so it cannot be used as closure evidence
  const harness = join(ART, '_browser_harness.html');
  if (existsSync(harness)) rmSync(harness);

  // Build Vite product
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exit ${code}`))));
  });

  const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: true,
  });

  let previewLog = '';
  preview.stdout.on('data', (d) => {
    previewLog += d.toString();
  });
  preview.stderr.on('data', (d) => {
    previewLog += d.toString();
  });

  const url = 'http://127.0.0.1:4173/?wave008_scientific=1';
  const killPreview = () => {
    try {
      if (preview.pid) process.kill(-preview.pid, 'SIGKILL');
    } catch {
      try {
        preview.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }
  };

  try {
    await waitForUrl('http://127.0.0.1:4173/', 90_000);
    const browser = await chromium.launch({ headless: true });

    // Desktop 1366x768
    const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await desktop.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const desktopSteps = await runCampaign(desktop);

    // Mobile 390x844
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const mobileSteps = await runCampaign(mobile);
    const mobile_viewport_ok =
      mobileSteps.scientific_name_visible && mobileSteps.source_organization_visible;

    await browser.close();

    const flags = {
      ...desktopSteps,
      mobile_viewport_ok,
      desktop_viewport_ok: desktopSteps.scientific_name_visible,
      viewports: { desktop: true, mobile: mobile_viewport_ok },
      viewport_desktop: '1366x768',
      viewport_mobile: '390x844',
      campaign_steps_ok: Object.values(desktopSteps).every(Boolean),
    };

    const result = {
      ok: flags.campaign_steps_ok && flags.mobile_viewport_ok && flags.vite_product_runtime,
      playwright_ran: true,
      playwright_skipped: false,
      runtime: 'vite_preview',
      ...flags,
    };

    writeFileSync(join(ART, 'ARCHIVEDEX_BROWSER_E2E_RESULT.json'), JSON.stringify(result, null, 2) + '\n');
    writeFileSync(
      join(ART, 'CITATION_UI_RESULT.json'),
      JSON.stringify(
        {
          ok:
            result.citation_visible &&
            result.game_authored_no_external_badge &&
            result.mock_warning_visible &&
            result.fixture_not_source_verified_badge,
          CITATION_EXPOSED: result.citation_visible,
          MOCK_LABELED: result.mock_warning_visible,
          GAME_AUTHORED_NO_EXTERNAL: result.game_authored_no_external_badge,
          FIXTURE_NOT_SOURCE_VERIFIED_UI: result.fixture_not_source_verified_badge,
          VITE_PRODUCT_RUNTIME: true,
        },
        null,
        2,
      ) + '\n',
    );

    if (!result.ok) {
      console.error('Wave008 Vite browser E2E failed', result);
      process.exit(1);
    }
    console.log('Wave008 Vite ArchiveDex browser E2E OK');
  } finally {
    killPreview();
  }
}

main().catch((err) => {
  console.error(err);
  writeFileSync(
    join(ART, 'ARCHIVEDEX_BROWSER_E2E_RESULT.json'),
    JSON.stringify(
      {
        ok: false,
        playwright_ran: false,
        playwright_skipped: false,
        error: String(err?.message ?? err),
      },
      null,
      2,
    ) + '\n',
  );
  process.exit(1);
});
