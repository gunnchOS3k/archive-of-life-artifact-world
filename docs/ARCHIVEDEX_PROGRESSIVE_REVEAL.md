# ArchiveDex Progressive Reveal

## Design goal

Entries should feel like opening an encyclopedia page after discovery — exciting, layered, and never overwhelming on first open.

## Reveal levels

### `hidden` (Tier 4+ undiscovered)

- Grid card: silhouette, "Undocumented", field clue text
- Entry: Overview only with documentation prompt
- No scientific name shown in header

### `preview` (Tier 0–3 archive records)

- Grid card: full common name visible
- Entry: taxonomy, time, habitat, sources tabs
- No artifact collection required

### `discovered` (artifact collected or Tier ≤3 browse)

- Full common and scientific names
- Overview, taxonomy, habitat, artifacts, conservation tabs
- Artifact and field note shown on Overview

### `studied` (Tier 6 documented)

- All 17 tabs unlocked
- Lifeling unlocks, food web, human connections, media placeholders
- Completion percentage on Overview

## Unlock sequence (field documentation)

1. Discovery animation (Lifeling celebrate)
2. **ArchiveDex unlock modal** — name, artifact, time, status, Lifeling trait
3. Field note added to notebook
4. Player can open full entry

## Tier tab matrix

| Tier | Tabs available |
|------|----------------|
| 0 | Taxonomy, Sources |
| 1 | + Overview |
| 2 | + Habitat |
| 3 | + Time |
| 4–5 | + Artifacts, Conservation (when discovered) |
| 6 studied | All 17 tabs |

Implementation: `getVisibleTabs()` in `src/services/archivedexMapper.ts`

## Ethical constraints

- Indigenous/local knowledge: credit respectfully, never lootable
- Uncertainty always visible in Sources tab
- Mock sample data flagged with badges
