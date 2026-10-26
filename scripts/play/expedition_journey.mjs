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
  await page.goto(URL);
  await page.getByRole('button', { name: 'Begin Expedition' }).click();
  await page.waitForFunction(() => document.getElementById('game-screen')?.classList.contains('active'));
  await page.waitForFunction(() => typeof window.__aolAccept === 'function');

  const explored = await page.evaluate(async () => {
    const accept = window.__aolAccept;
    await accept('move', 'species');
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
    const clue = await accept('clue');
    await accept('save');
    const saved = JSON.parse(localStorage.getItem('archive_of_life_save') || 'null');
    return {
      clue,
      speciesId: saved?.artifacts?.[0]?.speciesId || null,
      provenance: saved?.artifacts?.[0]?.provenance || null,
      scientificVerification: saved?.artifacts?.[0]?.scientificVerification,
      clueIds: saved?.expeditions?.discoveredClueIds || [],
      returnHref: document.querySelector('#game-screen [data-portal-return]')?.getAttribute('href') || null,
    };
  });

  if (!explored.speciesId) throw new Error('collect did not record an artifact');
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

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ ok: true, runtime: 'vite_preview', explored, restored }, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, runtime: 'vite_preview', speciesId: explored.speciesId }));
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
