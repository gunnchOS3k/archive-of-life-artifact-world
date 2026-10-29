# Archive of Life — Requirements-to-Evidence Matrix (RTM)

**Machine-readable:** [`ARCHIVE_REQUIREMENTS_TO_EVIDENCE_MATRIX.json`](./ARCHIVE_REQUIREMENTS_TO_EVIDENCE_MATRIX.json)  
**Contract:** `GUNNCHOS3K_PVS@1.0.0`  
**Contract source SHA:** `45b456617002569c33a5a27fe30d5cf8be5a7032` (gunnchos-site)  
**Schema:** gunnchos-site `docs/quality/schemas/requirements_to_evidence_matrix.schema.json`  
**Draft PR:** [#55](https://github.com/gunnchOS3k/archive-of-life-artifact-world/pull/55)  
**Honesty flags:** `HUMAN=false` · `RC2=false` · `V1=false` · production not claimed · Cursor-Complete **not claimed**  
**Independent review:** all rows `not_started`

## Shared Product Verification Standard (PVS)

Pinned worktree: `_open_lab_worktrees/product-verification-standard` @ `45b4566+`  
Paths: `docs/quality/schemas/requirements_to_evidence_matrix.schema.json`, `docs/quality/specialty_matrices/ARCHIVE_OF_LIFE.md`, `contracts/quality/PRODUCT_VERIFICATION_STANDARD.v1.json`

This RTM validates against the shared schema. Local specialty row IDs keep the `AOL-` prefix from the Archive specialty sketch.

## Specialty coverage

| Specialty | Focus |
| --- | --- |
| Scientific provenance | `sample_fallback ≠ source_verified`; IUCN blocked; NASA historical preserved |
| Taxonomy / geo / temporal | Species-correct marks; steppe/savanna honesty; **0/17** maps |
| Offline integrity | Pack hashes; `liveClaim=false` |
| Expeditions | Museum → field → observation → dex → Lifeling → save/reload |
| Organism identity | Flagship 24; emoji identity candidates ≠ finished models |
| Save migrations | `SAVE_VERSION` migrate; no global-coverage claim |
| Accessibility | Persisted a11y settings + honest museum/dex labels |

## Floors (authored / sample — not Earth-complete)

- Encounter taxa floor: **157**
- Flagship heroes: **24**
- Explore regions (min): **12**

## Honesty invariants

- `sample_fallback` is never treated as `source_verified`
- IUCN remains `blocked_external` without token + rights review
- Time Atlas: **0/17** full-Earth maps source-verified
- No invented credentials or maps
- Emoji / identity marks ≠ finished models

## Status summary

See JSON `rows[]`. Phase summary keeps `cursor_complete`, `codex_independently_verified`, and `human_approval` at `not_started`. Several rows have automated evidence with `cursor_complete_status: in_progress` — **Cursor-Complete is not claimed**.
