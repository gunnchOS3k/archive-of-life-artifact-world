# Archive of Life: Artifact World

An educational open-world exploration prototype where you play as an **Explorer-Archivist** building the greatest interactive Archive of Life ever created.

Discover animals, insects, and ancient fossils across realistic Earth biomes. Collect ethical scientific **artifacts** — never by harming wildlife. Your adaptive companion, the **Lifeling**, grows as you learn.

## Quick Start

Serve the folder with any static HTTP server (required for ES modules and JSON loading):

```bash
cd archive-of-life-artifact-world
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move |
| E | Interact (portals, species, fossils) |
| A | Archive of Life |
| N | Field Notebook |
| M | World Map |
| C | Lifeling Companion |
| Q | Quests |
| Escape | Close panels |

## Features

- **Explorable regions**: Museum hub, Savanna, Forest, Wetland, Coastal, Fossil Dig Site
- **23 species** (10 mammals, 10 insects/arachnids, 3 extinct) — all JSON-driven
- **Artifact collection** with ethical, evidence-based types
- **Archive UI** with educational species cards and conservation status
- **Field notebook** logging discoveries
- **Quest system** with regional objectives
- **Fossil excavation** mini-game (brush away sediment)
- **Wildlife observation** mini-game (patience-based)
- **Lifeling companion** with trait unlocks, customization, and emotes
- **Save/load** via localStorage

## Adding Species

Edit JSON files in `data/species/`:

```json
{
  "id": "unique_id",
  "commonName": "Common Name",
  "scientificName": "Scientific name",
  "group": "Mammal",
  "artifactTypes": ["photo_record"],
  "conservationStatus": "Least Concern",
  "region": "savanna"
}
```

Add the species ID to a region in `data/regions.json`, and optionally map trait unlocks in `data/traits.json`.

## Architecture

```
data/           JSON game content (species, traits, quests, regions)
js/
  systems/      Data loading, save, artifacts, quests
  ui/           Archive, notebook, map, companion, quest panels
  minigames/    Fossil excavation, wildlife observation
  game.js       Main game loop
  player.js     Explorer-Archivist controller
  companion.js  Lifeling adaptive companion
  world.js      Region rendering and interactables
```

## Design Pillars

- **Wonder** — Every creature deserves attention
- **Accuracy** — Scientifically grounded content
- **Respect** — Animals are not trophies
- **Exploration** — The world is the classroom
- **Collection** — Artifacts, not capture
- **Conservation** — Learning creates responsibility

## MVP Win Condition

Complete the **First Archive Wing** quest by documenting 10 mammals, 10 insects, and 3 fossil species, then reconstructing extinct ecosystem knowledge through the fossil dig site.

---

*Prototype built for educational exploration. Not affiliated with any existing creature-collection franchise.*
