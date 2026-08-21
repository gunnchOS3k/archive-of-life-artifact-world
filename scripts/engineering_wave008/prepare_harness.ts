/**
 * Generate static ArchiveDex harness HTML for Playwright (Wave008 fixtures).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadWave008ScientificFixtures,
  scientificRecordToArchiveDexEntry,
} from '../../src/services/scientific/fixtures';
import { renderArchiveDexTab } from '../../src/ui/archiveDexTabs';
import { renderScientificIdentityBlock } from '../../src/services/scientific/renderScientificUI';

const ART = join(process.cwd(), 'artifacts/engineering_wave008');
mkdirSync(ART, { recursive: true });

const bundle = loadWave008ScientificFixtures();
const sections = bundle.records
  .map((rec) => {
    const entry = scientificRecordToArchiveDexEntry(rec);
    const identity = rec ? renderScientificIdentityBlock(rec) : '';
    const sources = renderArchiveDexTab(entry, 'sources', true);
    return `
    <article class="fixture" data-role="${rec.fixture_role ?? ''}" data-canonical-id="${rec.identity.canonical_id}">
      <h2>${entry.commonName}</h2>
      <p class="sci-name">${entry.scientificName}</p>
      <p class="authority">${rec.taxonomic_authority.authority_text ?? 'Unknown'}${
        rec.taxonomic_authority.authority_year ? `, ${rec.taxonomic_authority.authority_year}` : ''
      }</p>
      <section class="identity">${identity}</section>
      <section class="sources-tab">${sources}</section>
    </article>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Archive of Life — Wave008 Scientific Record Harness</title>
  <style>
    body { font-family: Georgia, serif; margin: 1rem; background: #f7f3ea; color: #1b1b1b; }
    .fixture { border-top: 2px solid #2f4f3a; padding: 1rem 0; margin-bottom: 1rem; }
    .mock-badge, .verified-badge, .blocked-badge { font-weight: bold; }
    .sci-name { font-style: italic; }
  </style>
</head>
<body>
  <header>
    <h1>Archive of Life</h1>
    <p>ArchiveDex scientific record harness (Wave008 fixtures)</p>
  </header>
  <main id="archivedex">${sections}</main>
</body>
</html>
`;

writeFileSync(join(ART, '_browser_harness.html'), html);
console.log('wrote browser harness', bundle.records.length, 'fixtures');
