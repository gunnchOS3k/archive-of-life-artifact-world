# ArchiveDex Species Entry System

**ArchiveDex** is the educational heart of *Archive of Life: Artifact World*. When a player ethically documents a species or taxon, they unlock a **Known Life Entry** — a structured field encyclopedia record.

## Naming

- System: **ArchiveDex** (never "Pokédex" in code, UI, or docs)
- Entry type: **Known Life Entry**
- Code types: `ArchiveDexEntry`, `ArchiveDexService`, `ArchiveDexUI`

## Progressive reveal

| Stage | Player sees |
|-------|-------------|
| Undocumented (Tier 4+) | Silhouette, region/time clues, "Undocumented" |
| Archive browse (Tier 0–3) | Name, taxonomy, time, sources without field collection |
| Discovered | Full name, artifact, overview, core tabs |
| Studied (Tier 6 + documented) | All 17 tabs, Lifeling unlocks, rich ecology |

## 17 entry tabs

Overview · Identity · Taxonomy · Time · Habitat & Range · Body & Traits · Behavior · Diet & Food Web · Life Cycle · Ecology · Conservation · Artifacts & Evidence · Earth Systems · Human Connections · Lifeling Unlocks · Media · Sources & Uncertainty

Tab visibility adapts to representation tier and discovery state.

## Architecture

```
Search index (paginated) → ArchiveDexService.getEntryById()
  → merge hero-species + archive-stubs + archivedex-profiles + taxon time ranges
  → ArchiveDexUI tab renderer
```

## Commands

```bash
npm run audit:archivedex
npm run dev   # Press A for ArchiveDex
```

See also: `ARCHIVEDEX_DATA_SCHEMA.md`, `ARCHIVEDEX_PROGRESSIVE_REVEAL.md`
