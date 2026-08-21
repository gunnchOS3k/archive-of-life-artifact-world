/**
 * Wave008 scientific ArchiveDex demo — boots real ArchiveDex UI surfaces
 * inside the product shell (not a static harness).
 */
import { scientificRecordToArchiveDexEntry } from '@/services/scientific/fixtures';
import { renderArchiveDexTab } from '@/ui/archiveDexTabs';
import { renderScientificIdentityBlock } from '@/services/scientific/renderScientificUI';
import { computeCoverageMetrics } from '@/services/scientific/coverageEngine';
import type { ScientificRecordSnapshot } from '@/schema/scientificRecord';

declare global {
  interface Window {
    __WAVE008_SCIENTIFIC__?: {
      ready: boolean;
      records: ScientificRecordSnapshot[];
      openRole: (role: string) => void;
      openSources: () => void;
    };
  }
}

async function loadFixturesBrowser(): Promise<ScientificRecordSnapshot[]> {
  // Prefer fetch from public Vite path; fall back to empty.
  const res = await fetch('/data/scientific_fixtures/wave008-scientific-fixture-v1.json');
  if (!res.ok) throw new Error(`fixture fetch failed: ${res.status}`);
  const doc = (await res.json()) as { records: ScientificRecordSnapshot[] };
  return doc.records;
}

export async function bootWave008ScientificArchiveDex(): Promise<void> {
  const title = document.getElementById('title-screen');
  const game = document.getElementById('game-screen');
  const panel = document.getElementById('panel-archive');
  if (title) title.classList.remove('active');
  if (game) game.classList.add('active');
  if (panel) panel.classList.remove('hidden');

  const records = await loadFixturesBrowser();

  const { metrics } = computeCoverageMetrics(records, {
    coverage_semantics: 'CURRENT_ARCHIVE_SNAPSHOT',
    denominator_label: 'current Archive scientific fixture snapshot scope',
    snapshot_id: 'wave008-scientific-fixture-v1',
    included_source_snapshots: ['wave008-scientific-fixture-v1'],
    scope_total: records.length + 4,
  });

  const coverageEl = document.getElementById('archive-coverage');
  if (coverageEl) {
    coverageEl.innerHTML = `<div class="coverage-summary" data-no-completeness-claim="1" data-wave008="1">${metrics.user_facing_summary}</div>`;
  }

  const grid = document.getElementById('archive-grid');
  const entryPanel = document.getElementById('archivedex-entry');
  const entryHeader = document.getElementById('archivedex-entry-header');
  const entryTabs = document.getElementById('archivedex-tabs');
  const entryContent = document.getElementById('archivedex-tab-content');

  if (!grid || !entryPanel || !entryHeader || !entryTabs || !entryContent) {
    throw new Error('ArchiveDex DOM missing');
  }

  grid.innerHTML = records
    .map((r) => {
      const entry = scientificRecordToArchiveDexEntry(r);
      return `<button type="button" class="archive-card wave008-card" data-role="${r.fixture_role ?? ''}" data-canonical-id="${entry.id}">
        <strong class="common-name">${entry.commonName}</strong>
        <em class="sci-name">${entry.scientificName}</em>
        <span class="authority">${r.taxonomic_authority.authority_text ?? 'Unknown'}${
          r.taxonomic_authority.authority_year ? `, ${r.taxonomic_authority.authority_year}` : ''
        }</span>
      </button>`;
    })
    .join('');

  const openRole = (role: string) => {
    const rec = records.find((r) => r.fixture_role === role);
    if (!rec) return;
    const entry = scientificRecordToArchiveDexEntry(rec);
    entryPanel.classList.remove('hidden');
    entryPanel.dataset.role = role;
    entryHeader.innerHTML = `
      <div class="archivedex-entry-hero" data-role="${role}">
        <h3>${entry.commonName}</h3>
        <p class="sci-name">${entry.scientificName}</p>
        <p class="authority">${rec.taxonomic_authority.authority_text ?? 'Unknown'}${
          rec.taxonomic_authority.authority_year ? `, ${rec.taxonomic_authority.authority_year}` : ''
        }</p>
        <div class="identity">${renderScientificIdentityBlock(rec)}</div>
      </div>`;
    entryTabs.innerHTML = `
      <button class="archivedex-tab" data-tab="identity" type="button">Identity</button>
      <button class="archivedex-tab active" data-tab="sources" type="button">Sources</button>`;
    entryContent.innerHTML = renderArchiveDexTab(entry, 'sources', true);
    entryContent.querySelector('.scientific-sources')?.setAttribute('data-role', role);
    entryTabs.querySelectorAll('.archivedex-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as 'identity' | 'sources';
        entryTabs.querySelectorAll('.archivedex-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        entryContent.innerHTML = renderArchiveDexTab(entry, tab, true);
        entryContent.querySelector('.scientific-sources')?.setAttribute('data-role', role);
      });
    });
  };

  const openSources = () => {
    const active = entryTabs.querySelector('[data-tab="sources"]') as HTMLButtonElement | null;
    active?.click();
  };

  grid.querySelectorAll('.wave008-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const role = (btn as HTMLElement).dataset.role ?? '';
      openRole(role);
    });
  });

  document.getElementById('archivedex-entry-back')?.addEventListener('click', () => {
    entryPanel.classList.add('hidden');
  });

  window.__WAVE008_SCIENTIFIC__ = {
    ready: true,
    records,
    openRole,
    openSources,
  };

  document.body.dataset.wave008Scientific = '1';
  document.body.dataset.wave008Ready = '1';
}
