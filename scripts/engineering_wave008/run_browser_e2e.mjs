#!/usr/bin/env node
/**
 * Wave008 ArchiveDex browser E2E — Playwright against rendered scientific fixtures.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ART = join(ROOT, 'artifacts/engineering_wave008');

async function main() {
  mkdirSync(ART, { recursive: true });

  // Pre-rendered HTML produced by wave008 vitest unit stage, or generate inline via dynamic import fallback
  const harnessPath = join(ART, '_browser_harness.html');
  if (!existsSync(harnessPath)) {
    writeFileSync(
      join(ART, 'ARCHIVEDEX_BROWSER_E2E_RESULT.json'),
      JSON.stringify(
        {
          ok: false,
          playwright_ran: false,
          playwright_skipped: false,
          error: 'missing_browser_harness_html',
        },
        null,
        2,
      ) + '\n',
    );
    process.exit(1);
  }

  const html = readFileSync(harnessPath, 'utf8');
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const checks = {
    extant_name: await page.locator('[data-role="extant_source_snapshot"] .sci-name').textContent(),
    extant_authority: await page.locator('[data-role="extant_source_snapshot"] .authority').textContent(),
    extant_sources_org: await page.locator('[data-role="extant_source_snapshot"] .scientific-sources').textContent(),
    fossil_time: await page.locator('[data-role="fossil_uncertain"] .scientific-sources').textContent(),
    conflict_editorial: await page.locator('[data-role="conflicted_taxonomy"] .scientific-sources').textContent(),
    game_html: await page.locator('[data-role="game_authored"]').innerHTML(),
    mock_html: await page.locator('[data-role="mock_sample"]').innerHTML(),
    blocked_html: await page.locator('[data-role="blocked_incomplete"]').innerHTML(),
  };

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(url, { waitUntil: 'domcontentloaded' });
  const mobileOk = (await mobile.locator('[data-role="extant_source_snapshot"]').count()) === 1;

  await browser.close();
  server.close();

  const flags = {
    scientific_name_visible: /Panthera leo/i.test(checks.extant_name ?? ''),
    authority_visible: /Linnaeus/i.test(checks.extant_authority ?? ''),
    source_organization_visible: /Catalogue of Life/i.test(checks.extant_sources_org ?? ''),
    source_record_id_visible: /COL:taxon:PL001/i.test(checks.extant_sources_org ?? ''),
    license_visible: /CC-BY-4.0/i.test(checks.extant_sources_org ?? ''),
    retrieval_visible: /2024-06-01/i.test(checks.extant_sources_org ?? ''),
    version_snapshot_visible: /wave008-scientific-fixture-v1/i.test(checks.extant_sources_org ?? ''),
    geographic_visible: /Afrotropical|Sub-Saharan/i.test(checks.extant_sources_org ?? ''),
    citation_visible: /Catalogue of Life \(2024\)/i.test(checks.extant_sources_org ?? ''),
    fossil_geologic_range: /68|66|Ma|Maastrichtian|approximate/i.test(checks.fossil_time ?? ''),
    conflict_editorial_visible: /CONFLICTED|DISPUTED|disagree/i.test(checks.conflict_editorial ?? ''),
    game_authored_no_external_badge:
      /GAME AUTHORED|game-authored/i.test(checks.game_html) &&
      !/SOURCE SNAPSHOT|LIVE VERIFIED/i.test(checks.game_html),
    mock_warning_visible: /MOCK/i.test(checks.mock_html),
    blocked_needs_verification: /BLOCKED|NEEDS|unavailable|verification/i.test(checks.blocked_html),
    uncertainty_visible: /uncertainty|DISPUTED|CONFLICTED|approximate/i.test(
      `${checks.fossil_time}\n${checks.conflict_editorial}`,
    ),
    mobile_viewport_ok: mobileOk,
  };

  const result = {
    ok: Object.values(flags).every(Boolean),
    playwright_ran: true,
    playwright_skipped: false,
    viewports: { desktop: true, mobile: mobileOk },
    ...flags,
  };

  writeFileSync(join(ART, 'ARCHIVEDEX_BROWSER_E2E_RESULT.json'), JSON.stringify(result, null, 2) + '\n');
  writeFileSync(
    join(ART, 'CITATION_UI_RESULT.json'),
    JSON.stringify(
      {
        ok: result.citation_visible && result.game_authored_no_external_badge && result.mock_warning_visible,
        CITATION_EXPOSED: result.citation_visible,
        MOCK_LABELED: result.mock_warning_visible,
        GAME_AUTHORED_NO_EXTERNAL: result.game_authored_no_external_badge,
      },
      null,
      2,
    ) + '\n',
  );

  if (!result.ok) {
    console.error('Wave008 browser E2E failed', result);
    process.exit(1);
  }
  console.log('Wave008 browser E2E OK');
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
