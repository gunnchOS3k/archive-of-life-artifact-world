# Biome and ecoregion coverage

Biome coverage ensures all major Earth system realms can host represented life in the Archive.

## Registry

- `public/data/coverage/biome_registry.json` — biome categories
- `public/data/coverage/ecoregion_registry.json` — WWF/FWEW/MEOW-style units

## Realms

terrestrial · freshwater · marine · subterranean · atmospheric · polar · human-modified · microbial · paleoenvironment

## Playable biome requirements

Each expedition biome must have:

1. At least one represented taxon
2. At least one artifact type
3. At least one learning objective
4. Source provenance
5. Data quality status

## Audit

`npm run audit:biomes`

## SQL

`data-pipeline/sql/06_biomes_places.sql` — biome proxy counts for pipeline validation
