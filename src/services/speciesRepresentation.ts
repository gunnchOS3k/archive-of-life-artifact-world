/**
 * Taxon-specific encounter / ArchiveDex representation.
 * Never map an entire taxonomic group to one charismatic organism (e.g. Mammal → lion).
 * When no approved asset exists, return a truthful labeled fallback — not a wrong organism.
 */

export type SpeciesIdentity = {
  id?: string;
  commonName?: string;
  scientificName?: string;
  family?: string;
  group?: string;
  conservationStatus?: string;
  conservation?: { iucnCategory?: string };
};

const LION_ICON = '🦁';
const HORSE_ICON = '🐴';

/** Approved emoji marks keyed by species id (game-authored presentation, not IUCN/PBDB). */
const SPECIES_ICONS: Record<string, string> = {
  panthera_leo: LION_ICON,
  loxodonta_africana: '🐘',
  equus_caballus_ferus: HORSE_ICON,
  canis_lupus: '🐺',
  odocoileus_virginianus: '🦌',
  ursus_americanus: '🐻',
  castor_canadensis: '🦫',
  lontra_canadensis: '🦦',
  balaenoptera_musculus: '🐋',
  phoca_vitulina: '🦭',
  mammuthus_primigenius: '🦣',
  tyrannosaurus_rex: '🦖',
  trilobita_order: '🦴',
  danaus_plexippus: '🦋',
  apis_mellifera: '🐝',
  latrodectus_mactans: '🕷️',
  pachnoda_marginata: '🪲',
  formica_rufa: '🐜',
  dynastes_hercules: '🪲',
  acanthoscurria_geniculata: '🕷️',
  anax_junius: '🪰',
  libellula_quadrimaculata: '🪰',
};

/**
 * Family-level marks must stay category-neutral — never impersonate one species
 * inside the family (e.g. Felidae ≠ lion, Equidae ≠ horse, Canidae ≠ wolf).
 * Taxon-correct marks live in SPECIES_ICONS / looksLike* helpers.
 */
const FAMILY_ICONS: Record<string, string> = {
  Felidae: '🐾',
  Elephantidae: '🐘',
  Equidae: '🐾',
  Canidae: '🐾',
  Cervidae: '🦌',
  Ursidae: '🐻',
  Castoridae: '🦫',
  Mustelidae: '🦦',
  Balaenopteridae: '🐋',
  Phocidae: '🦭',
  Nymphalidae: '🦋',
  Apidae: '🐝',
  Theridiidae: '🕷️',
  Formicidae: '🐜',
  Scarabaeidae: '🪲',
  Dynastidae: '🪲',
  Theraphosidae: '🕷️',
  Aeshnidae: '🪰',
  Libellulidae: '🪰',
};

const GROUP_FALLBACK: Record<string, string> = {
  Mammal: '🐾',
  Insect: '🐛',
  Arachnid: '🕸️',
  Reptile: '🦎',
  Mollusk: '🐚',
  Arthropod: '🔬',
  Microbe: '🦠',
};

function norm(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function looksLikeHorse(identity: SpeciesIdentity): boolean {
  const id = norm(identity.id);
  const common = norm(identity.commonName);
  const sci = norm(identity.scientificName);
  // Do not key off Equidae alone — zebras/asses must not impersonate horse.
  return (
    id.includes('equus') ||
    common.includes('horse') ||
    common.includes('przewalski') ||
    sci.includes('equus')
  );
}

function looksLikeLion(identity: SpeciesIdentity): boolean {
  const id = norm(identity.id);
  const common = norm(identity.commonName);
  const sci = norm(identity.scientificName);
  return id.includes('panthera_leo') || common === 'lion' || sci.includes('panthera leo');
}

/**
 * Resolve a display mark for a taxon. Prefer species id, then family cues, then
 * a group-neutral fallback. Never use the lion mark for a non-lion mammal.
 */
export function getSpeciesIcon(species: SpeciesIdentity): string {
  const status = species.conservationStatus ?? species.conservation?.iucnCategory;
  if (status === 'Extinct') return '🦴';

  if (species.id && SPECIES_ICONS[species.id]) return SPECIES_ICONS[species.id];

  if (looksLikeHorse(species)) return HORSE_ICON;
  if (looksLikeLion(species)) return LION_ICON;

  if (species.family && FAMILY_ICONS[species.family]) return FAMILY_ICONS[species.family];

  const group = species.group || '';
  return GROUP_FALLBACK[group] || '◇';
}

/** Human-readable fallback when no pictorial asset is approved. */
export function getSpeciesRepresentationLabel(species: SpeciesIdentity): string {
  const name = (species.commonName || species.scientificName || species.id || 'Unknown taxon').trim();
  return name;
}

export function assertSpeciesIconNotMismatched(species: SpeciesIdentity, icon: string): void {
  if (looksLikeHorse(species) && icon === LION_ICON) {
    throw new Error(`Horse taxon ${species.id || species.commonName} must not use the lion icon`);
  }
  if (looksLikeLion(species) && icon === HORSE_ICON) {
    throw new Error(`Lion taxon ${species.id || species.commonName} must not use the horse icon`);
  }
  if (looksLikeHorse(species) && icon !== HORSE_ICON && icon !== '🦴') {
    // Allowed: exact horse mark or extinct bone; generic mammal paw is also wrong if we have a horse cue.
    if (icon === LION_ICON || icon === '🐾') {
      throw new Error(`Horse taxon ${species.id} requires a horse-specific or labeled representation, got ${icon}`);
    }
  }
}

export const SPECIES_REPRESENTATION_CONTRACT = Object.freeze({
  lionIcon: LION_ICON,
  horseIcon: HORSE_ICON,
  forbidGroupLionForAllMammals: true,
  forbidFamilyImpersonation: true,
  provenance: 'game_authored_presentation',
  scientificAcceptanceClaim: false,
});
