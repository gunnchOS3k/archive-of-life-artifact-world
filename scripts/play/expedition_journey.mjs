/**
 * Real Vite preview journey: explore, clue, collect, save, reload.
 * Drives the built app through its acceptance hooks. Not a Node fixture.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'http://127.0.0.1:4173/';
const OUT = join(ROOT, 'artifacts/play/EXPEDITION_JOURNEY.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url) {
  const stop = Date.now() + 120_000;
  while (Date.now() < stop) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* preview still starting */
    }
    await sleep(400);
  }
  throw new Error(`preview not ready: ${url}`);
}

const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: ROOT,
  stdio: 'inherit',
});

let browser;
try {
  await waitForUrl(URL);
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  await page.goto(URL);
  await page.getByRole('button', { name: 'Begin Expedition' }).click();
  await page.waitForFunction(() => document.getElementById('game-screen')?.classList.contains('active'));
  await page.waitForFunction(() => typeof window.__aolAccept === 'function');

  const explored = await page.evaluate(async () => {
    const accept = window.__aolAccept;
    const regions = ['savanna', 'forest', 'wetland', 'coastal', 'fossil_site'];
    let travel = null;
    let moved = null;
    for (const region of regions) {
      travel = await accept('travel', region);
      moved = await accept('move', 'species');
      if (moved?.target) break;
      moved = await accept('move', 'fossil');
      if (moved?.target) break;
    }
    await accept('clue');
    await accept('interact');
    await accept('hold', '1');
    for (let i = 0; i < 600; i += 1) {
      const game = window.__aolGame;
      if (game?.state?.artifacts?.length) break;
      game?.activeMinigame?.update?.(1 / 60);
    }
    await accept('hold', '0');
    if (!window.__aolGame?.state?.artifacts?.length) await accept('fossil_done');
    for (let i = 0; i < 40 && window.__aolGame?.activeMinigame; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await accept('save');
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    return {
      region: travel?.region || null,
      target: moved?.target || null,
      minigame: window.__aolGame?.activeMinigame ? 'open' : null,
      speciesId: saved?.artifacts?.[0]?.speciesId || null,
      provenance: saved?.artifacts?.[0]?.provenance || null,
      scientificVerification: saved?.artifacts?.[0]?.scientificVerification,
      clueIds: saved?.expeditions?.discoveredClueIds || [],
      returnHref: document.querySelector('#game-screen [data-portal-return]')?.getAttribute('href') || null,
    };
  });

  if (!explored.speciesId) throw new Error(`collect did not record an artifact ${JSON.stringify(explored)}`);
  if (explored.provenance !== 'game_authored') throw new Error(`provenance ${explored.provenance}`);
  if (explored.scientificVerification !== false) throw new Error('scientific verification was not false');
  if (!explored.clueIds.includes('museum-label-clue')) throw new Error('clue was not saved');
  if (explored.returnHref !== 'https://gunnchos.com') throw new Error(`return ${explored.returnHref}`);

  await page.reload();
  await page.getByRole('button', { name: 'Continue Expedition' }).click();
  await page.waitForFunction(() => document.getElementById('game-screen')?.classList.contains('active'));
  const restored = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    return {
      speciesId: saved?.artifacts?.[0]?.speciesId || null,
      scientificVerification: saved?.artifacts?.[0]?.scientificVerification,
      clueIds: saved?.expeditions?.discoveredClueIds || [],
    };
  });
  if (restored.speciesId !== explored.speciesId) throw new Error('reload lost the collected artifact');
  if (restored.scientificVerification !== false) throw new Error('reload claimed scientific verification');
  if (!restored.clueIds.includes('museum-label-clue')) throw new Error('reload lost the clue');

  const era = await page.evaluate(async () => {
    await window.__aolAccept('era', 'pleistocene');
    await window.__aolAccept('save');
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    const artifacts = saved?.artifacts || [];
    return {
      active: saved?.timeAtlas?.activeTimeUnitId || null,
      viewed: saved?.timeAtlas?.viewedTimeUnits || [],
      provenance: artifacts.map((item) => item.provenance),
      scientificVerification: artifacts.map((item) => item.scientificVerification),
    };
  });
  if (era.active !== 'pleistocene' || !era.viewed.includes('pleistocene')) {
    throw new Error(`era was not recorded ${JSON.stringify(era)}`);
  }
  if (era.provenance.some((value) => value !== 'game_authored')) throw new Error('era changed artifact provenance');
  if (era.scientificVerification.some((value) => value !== false)) throw new Error('era claimed scientific verification');

  await page.reload();
  await page.getByRole('button', { name: 'Continue Expedition' }).click();
  await page.waitForFunction(() => document.getElementById('game-screen')?.classList.contains('active'));
  const eraRestored = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    const artifacts = saved?.artifacts || [];
    return {
      active: saved?.timeAtlas?.activeTimeUnitId || null,
      viewed: saved?.timeAtlas?.viewedTimeUnits || [],
      scientificVerification: artifacts.map((item) => item.scientificVerification),
      provenance: artifacts.map((item) => item.provenance),
    };
  });
  if (eraRestored.active !== 'pleistocene' || !eraRestored.viewed.includes('pleistocene')) {
    throw new Error('reload lost the viewed era');
  }
  if (eraRestored.provenance.some((value) => value !== 'game_authored')) throw new Error('reload changed artifact provenance');
  if (eraRestored.scientificVerification.some((value) => value !== false)) throw new Error('reload claimed scientific verification');

  await page.locator('#btn-notebook').click();
  await page.waitForSelector('#panel-notebook:not(.hidden) .notebook-entry');
  const notebook = await page.evaluate(async () => {
    const entry = document.querySelector('#panel-notebook .notebook-entry');
    await window.__aolAccept('save');
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    return {
      open: !document.getElementById('panel-notebook')?.classList.contains('hidden'),
      speciesId: entry?.getAttribute('data-species-id') || null,
      savedSpeciesId: saved?.notebook?.[0]?.speciesId || null,
      provenance: (saved?.artifacts || []).map((item) => item.provenance),
      scientificVerification: (saved?.artifacts || []).map((item) => item.scientificVerification),
      returnHref: document.querySelector('#game-screen [data-portal-return]')?.getAttribute('href') || null,
    };
  });
  if (!notebook.open) throw new Error('journal control did not open the notebook');
  if (notebook.speciesId !== explored.speciesId || notebook.savedSpeciesId !== explored.speciesId) {
    throw new Error(`journal did not show the collected find ${JSON.stringify(notebook)}`);
  }
  if (notebook.returnHref !== 'https://gunnchos.com') throw new Error(`return ${notebook.returnHref}`);
  if (notebook.provenance.some((value) => value !== 'game_authored')) throw new Error('journal changed artifact provenance');
  if (notebook.scientificVerification.some((value) => value !== false)) throw new Error('journal claimed scientific verification');

  await page.reload();
  await page.getByRole('button', { name: 'Continue Expedition' }).click();
  await page.waitForFunction(() => document.getElementById('game-screen')?.classList.contains('active'));
  await page.locator('#btn-notebook').click();
  await page.waitForSelector('#panel-notebook:not(.hidden) .notebook-entry');
  const notebookRestored = await page.evaluate(() => {
    const entry = document.querySelector('#panel-notebook .notebook-entry');
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    return {
      speciesId: entry?.getAttribute('data-species-id') || null,
      scientificVerification: (saved?.artifacts || []).map((item) => item.scientificVerification),
      provenance: (saved?.artifacts || []).map((item) => item.provenance),
      returnHref: document.querySelector('#game-screen [data-portal-return]')?.getAttribute('href') || null,
    };
  });
  if (notebookRestored.speciesId !== explored.speciesId) throw new Error('reload lost the journal entry');
  if (notebookRestored.returnHref !== 'https://gunnchos.com') throw new Error(`return ${notebookRestored.returnHref}`);
  if (notebookRestored.provenance.some((value) => value !== 'game_authored')) throw new Error('reload changed artifact provenance');
  if (notebookRestored.scientificVerification.some((value) => value !== false)) throw new Error('reload claimed scientific verification');

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ ok: true, runtime: 'vite_preview', explored, restored, era, eraRestored, notebook, notebookRestored }, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, runtime: 'vite_preview', speciesId: explored.speciesId, era: era.active }));
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
