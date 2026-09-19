/**
 * Living Archive icon helper — loads original VXP-4 SVG marks (no emoji).
 */
const ICON_CACHE = new Map<string, string>();

const ICON_FILES: Record<string, string> = {
  explore: new URL('../assets/vxp4/icons/explore.svg', import.meta.url).href,
  observe: new URL('../assets/vxp4/icons/observe.svg', import.meta.url).href,
  collect: new URL('../assets/vxp4/icons/collect.svg', import.meta.url).href,
  archive: new URL('../assets/vxp4/icons/archive.svg', import.meta.url).href,
  lifeling: new URL('../assets/vxp4/icons/lifeling.svg', import.meta.url).href,
  time: new URL('../assets/vxp4/icons/time.svg', import.meta.url).href,
  map: new URL('../assets/vxp4/icons/map.svg', import.meta.url).href,
  evidence: new URL('../assets/vxp4/icons/evidence.svg', import.meta.url).href,
  journal: new URL('../assets/vxp4/icons/journal.svg', import.meta.url).href,
  quest: new URL('../assets/vxp4/icons/quest.svg', import.meta.url).href,
  region: new URL('../assets/vxp4/icons/region.svg', import.meta.url).href,
  biome: new URL('../assets/vxp4/icons/biome.svg', import.meta.url).href,
  species: new URL('../assets/vxp4/icons/species.svg', import.meta.url).href,
  artifact: new URL('../assets/vxp4/icons/artifact.svg', import.meta.url).href,
  provenance: new URL('../assets/vxp4/icons/provenance.svg', import.meta.url).href,
  uncertainty: new URL('../assets/vxp4/icons/uncertainty.svg', import.meta.url).href,
  settings: new URL('../assets/vxp4/icons/settings.svg', import.meta.url).href,
  accessibility: new URL('../assets/vxp4/icons/accessibility.svg', import.meta.url).href,
  pause: new URL('../assets/vxp4/icons/pause.svg', import.meta.url).href,
  back: new URL('../assets/vxp4/icons/back.svg', import.meta.url).href,
};

export type LivingArchiveIconId = keyof typeof ICON_FILES;

export async function loadIconSvg(id: LivingArchiveIconId): Promise<string> {
  const cached = ICON_CACHE.get(id);
  if (cached) return cached;
  const href = ICON_FILES[id];
  const res = await fetch(href);
  const text = await res.text();
  ICON_CACHE.set(id, text);
  return text;
}

export function iconSpan(id: LivingArchiveIconId, className = 'la-icon'): string {
  // Inline placeholder; hydrated by hydrateLivingArchiveIcons()
  return `<span class="${className}" data-la-icon="${id}" aria-hidden="true"></span>`;
}

export async function hydrateLivingArchiveIcons(root: ParentNode = document): Promise<void> {
  const nodes = root.querySelectorAll<HTMLElement>('[data-la-icon]');
  await Promise.all(
    Array.from(nodes).map(async (el) => {
      const id = el.dataset.laIcon as LivingArchiveIconId | undefined;
      if (!id || !(id in ICON_FILES)) return;
      if (el.dataset.hydrated === '1') return;
      try {
        el.innerHTML = await loadIconSvg(id);
        el.dataset.hydrated = '1';
      } catch {
        /* keep empty mark — do not fall back to emoji */
      }
    }),
  );
}

/** Map verification status → truthful visual chip (no claim inflation). */
export function truthChipHtml(
  status: 'source_verified' | 'game_authored_verified' | 'mock_sample' | 'uncertain' | string,
): string {
  const labels: Record<string, string> = {
    source_verified: 'Source verified',
    game_authored_verified: 'Game-authored',
    mock_sample: 'Mock / sample',
    uncertain: 'Uncertainty noted',
  };
  const label = labels[status] ?? status.replace(/_/g, ' ');
  const icon =
    status === 'uncertain'
      ? 'uncertainty'
      : status === 'source_verified'
        ? 'provenance'
        : status === 'mock_sample'
          ? 'uncertainty'
          : 'evidence';
  return `<span class="truth-chip" data-truth="${status}">${iconSpan(icon as LivingArchiveIconId)} ${label}</span>`;
}

export function setEmotionalMode(
  mode: 'home' | 'choose' | 'explore' | 'discover' | 'understand' | 'remember',
): void {
  const app = document.getElementById('app');
  if (app) app.dataset.emotionalMode = mode;
  document.documentElement.dataset.emotionalMode = mode;
}
