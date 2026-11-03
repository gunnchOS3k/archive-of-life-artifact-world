import {
  drawAuthoredHabitat,
  drawAuthoredOrganism,
  hasAuthoredStudy,
  type StudyTaxon,
} from '@/art/organismStudies';
import '../../css/authored-organism-panel.css';

type EntryIdentity = { id: string; commonName: string; scientificName: string };
type PanelStudy = { habitat: string; description: string; interpretation: string; y: number; scale: number };

// Composition and interpretation for these exact existing studies only. The drawings
// and their morphology references remain in organismStudies.ts and its provenance.
const STUDIES: Record<StudyTaxon, PanelStudy> = {
  balaenoptera_musculus: {
    habitat: 'Open-ocean study',
    description: 'Long blue-gray whale with invented mottling, narrow flippers, a small rear dorsal fin and broad flukes, in an illustrated ocean.',
    interpretation: 'The mottled individual and ocean composition are original artistic interpretations.',
    y: 0.52,
    scale: 2.05,
  },
  panthera_leo: {
    habitat: 'Savanna study',
    description: 'Adult male lion with a dark mane, yellow-gold body, paws and tufted tail, in an illustrated savanna.',
    interpretation: 'This study depicts an adult male. The mane and landscape are original artistic interpretations.',
    y: 0.62,
    scale: 1.8,
  },
  loxodonta_africana: {
    habitat: 'Waterhole study',
    description: 'African savanna elephant with large ears, tusks, a flexible trunk, columnar feet and wrinkled gray skin beside an illustrated waterhole.',
    interpretation: 'The individual and waterhole composition are original artistic interpretations.',
    y: 0.61,
    scale: 1.75,
  },
  danaus_plexippus: {
    habitat: 'Milkweed study',
    description: 'Adult monarch butterfly with orange wings, black veins and borders, and white spotting, above illustrated milkweed.',
    interpretation: 'The markings and milkweed composition are original artistic interpretations.',
    y: 0.43,
    scale: 2.1,
  },
};

const WIDTH = 720;
const HEIGHT = 360;

/** One still render, with no RAF, resize listener, timers, save writes or unlocks.
 * CSS scales the same composition on small screens. Unsupported identities keep
 * their existing ArchiveDex fallback and never borrow one of these four images.
 */
export function mountAuthoredOrganismPanel(host: HTMLElement, entry: EntryIdentity): boolean {
  host.querySelector('[data-authored-organism-panel]')?.remove();
  if (!hasAuthoredStudy(entry.id)) return false;
  const study = STUDIES[entry.id];
  const doc = host.ownerDocument;
  const figure = doc.createElement('figure');
  figure.className = 'dex-authored-study';
  figure.dataset.authoredOrganismPanel = entry.id;
  figure.dataset.artStatus = 'production_candidate';
  figure.dataset.artMedium = 'original_canvas2d';
  figure.dataset.motion = 'static';

  const canvas = doc.createElement('canvas');
  canvas.className = 'dex-authored-study__canvas';
  canvas.width = WIDTH * 2;
  canvas.height = HEIGHT * 2;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${entry.commonName} (${entry.scientificName}). ${study.description}`);
  canvas.textContent = study.description;
  figure.append(canvas);

  const caption = doc.createElement('figcaption');
  caption.className = 'dex-authored-study__caption';
  const label = doc.createElement('strong');
  label.textContent = study.habitat;
  const identity = doc.createElement('span');
  identity.textContent = `${entry.commonName} · ${entry.scientificName}`;
  const status = doc.createElement('span');
  status.className = 'dex-authored-study__status';
  status.textContent = 'Original 2D art · work in progress';
  caption.append(label, identity, status);
  figure.append(caption);

  const fallback = doc.createElement('p');
  fallback.className = 'dex-authored-study__fallback';
  fallback.textContent = `Illustration unavailable. ${study.description}`;
  fallback.hidden = true;
  figure.append(fallback);

  const about = doc.createElement('details');
  about.className = 'dex-authored-study__about';
  const summary = doc.createElement('summary');
  summary.textContent = 'About this field study';
  const note = doc.createElement('p');
  note.textContent = `${study.interpretation} The habitat illustrates a setting rather than a recorded location. Studies are composed separately, so animal sizes cannot be compared across entries. Scientific information and data sources remain in the entry tabs. Art review and owner acceptance are pending.`;
  about.append(summary, note);
  figure.append(about);
  host.append(figure);

  // Static by design for every player, including reduced-motion users. The same
  // authorized original drawers serve the actual observation and world scenes.
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.hidden = true;
    fallback.hidden = false;
    figure.dataset.renderStatus = 'text_fallback';
    return true;
  }
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  drawAuthoredHabitat(ctx, entry.id, WIDTH, HEIGHT, 0, true);
  ctx.save();
  ctx.translate(WIDTH * 0.5, HEIGHT * study.y);
  drawAuthoredOrganism(ctx, entry.id, { time: 0, facing: 1, reducedMotion: true, scale: study.scale });
  ctx.restore();
  figure.dataset.renderStatus = 'rendered';
  return true;
}
