import plateUrl from '@/assets/organisms/blue-whale-field-plate.svg?url';

const NOTES = {
  body: { label: 'Body shape', x: '17%', y: '54%', heading: 'An ocean-going body', text: 'Look for the long, tapered body and broad head. These proportions help distinguish a blue whale from the rounder whale shapes often used in cartoons.' },
  skin: { label: 'Mottled skin', x: '47%', y: '54%', heading: 'A pattern of light and dark', text: 'Blue whales have mottled blue-gray skin. This illustration invents its own patches; it does not depict a photographed or identified individual.' },
  fin: { label: 'Dorsal fin', x: '70%', y: '53%', heading: 'Small fin, far back', text: 'The dorsal fin is small compared with the body and sits far back along the back. Find it near the tail rather than halfway along the body.' },
} as const;
type Feature = keyof typeof NOTES;

export function blueWhalePlateHtml(taxonId: string): string {
  if (taxonId !== 'balaenoptera_musculus') return '';
  return `<figure class="dex-organism-plate" data-organism-art="balaenoptera_musculus" data-art-status="production_candidate"><img src="${plateUrl}" width="1200" height="480" alt="Original blue-whale illustration: elongated mottled blue-gray body, small rear dorsal fin, long flippers and broad flukes."><figcaption>Original field illustration · production candidate · independent review and human acceptance pending.</figcaption></figure>`;
}

export function mountBlueWhaleStudy(root: Document): boolean {
  const host = root.getElementById('organism-study-host');
  if (!host || host.querySelector('[data-blue-whale-study]')) return false;
  host.innerHTML = `<section class="whale-study" data-blue-whale-study data-art-status="production_candidate" aria-labelledby="whale-study-title">
    <div class="whale-study-heading"><div><p class="whale-study-kicker">From the living collection <span aria-hidden="true">/</span> Field plate 001</p><h2 id="whale-study-title">An ocean giant, in detail.</h2><p class="whale-study-name">Blue whale <span aria-hidden="true">·</span> <i>Balaenoptera musculus</i></p></div><span class="whale-study-tag">Present-day oceans</span></div>
    <div class="whale-study-image"><img src="${plateUrl}" width="1200" height="480" alt="Blue whale with a long tapered body, broad head, mottled blue-gray skin, a small dorsal fin near the rear, narrow flippers and broad tail flukes."><span class="whale-study-marker" aria-hidden="true"></span><span class="whale-study-image-note">Lateral study · stylized proportions</span></div>
    <div class="whale-study-observation"><div class="whale-study-controls" role="group" aria-label="Explore blue whale anatomy">${Object.entries(NOTES).map(([key,note])=>`<button type="button" data-whale-feature="${key}" aria-pressed="${key==='body'}">${note.label}</button>`).join('')}</div><div class="whale-study-note" data-whale-note role="status" aria-live="polite"><h3>${NOTES.body.heading}</h3><p>${NOTES.body.text}</p></div></div>
    <p class="whale-study-status">Original illustration · production candidate</p>
    <details class="whale-study-sources"><summary>About this illustration &amp; its sources</summary><p>Original artwork for Archive of Life. Anatomical references: <a href="https://www.fisheries.noaa.gov/species/blue-whale" target="_blank" rel="noopener noreferrer">NOAA Fisheries: Blue Whale</a> and <a href="https://www.canada.ca/en/environment-climate-change/services/species-risk-public-registry/recovery-strategies/blue-whale-northwest-atlantic/chapter-1.html" target="_blank" rel="noopener noreferrer">Fisheries and Oceans Canada: description</a>. This is an educational interpretation, not a measured specimen or identification key. The art is a production candidate awaiting independent review and human acceptance; the bundled species record retains its existing sample status.</p></details>
  </section>`;
  const section = host.querySelector<HTMLElement>('[data-blue-whale-study]')!;
  const note = section.querySelector<HTMLElement>('[data-whale-note]')!;
  function select(feature: Feature) {
    const selected = NOTES[feature];
    section.style.setProperty('--study-target-x', selected.x);
    section.style.setProperty('--study-target-y', selected.y);
    section.querySelectorAll<HTMLButtonElement>('[data-whale-feature]').forEach(button=>button.setAttribute('aria-pressed', String(button.dataset.whaleFeature === feature)));
    note.innerHTML = `<h3>${selected.heading}</h3><p>${selected.text}</p>`;
  }
  section.querySelectorAll<HTMLButtonElement>('[data-whale-feature]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.whaleFeature as Feature)));
  select('body');
  return true;
}
