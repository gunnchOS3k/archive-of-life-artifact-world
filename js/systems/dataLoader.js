const DATA_PATHS = {
  mammals: 'data/species/mammals.json',
  insects: 'data/species/insects.json',
  extinct: 'data/species/extinct.json',
  traits: 'data/traits.json',
  quests: 'data/quests.json',
  regions: 'data/regions.json',
};

export async function loadGameData() {
  const entries = await Promise.all(
    Object.entries(DATA_PATHS).map(async ([key, path]) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      return [key, await res.json()];
    })
  );
  const data = Object.fromEntries(entries);

  const allSpecies = [
    ...data.mammals,
    ...data.insects,
    ...data.extinct,
  ];

  const speciesById = Object.fromEntries(allSpecies.map(s => [s.id, s]));

  return {
    ...data,
    allSpecies,
    speciesById,
  };
}

export function getSpeciesIcon(species) {
  const icons = {
    Mammal: '🦁',
    Insect: '🦋',
    Arachnid: '🕷️',
    Reptile: '🦕',
  };
  if (species.conservationStatus === 'Extinct') return '🦴';
  return icons[species.group] || '🐾';
}

export function getConservationClass(status) {
  const map = {
    'Least Concern': 'least-concern',
    'Vulnerable': 'vulnerable',
    'Endangered': 'endangered',
    'Extinct': 'extinct',
    'Data Deficient': 'data-deficient',
    'Near Threatened': 'vulnerable',
  };
  return map[status] || 'data-deficient';
}
