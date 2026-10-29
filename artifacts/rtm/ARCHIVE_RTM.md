# Archive of Life — Requirements-to-Evidence Matrix (RTM)

**Machine-readable:** [`ARCHIVE_REQUIREMENTS_TO_EVIDENCE_MATRIX.json`](./ARCHIVE_REQUIREMENTS_TO_EVIDENCE_MATRIX.json)  
**Draft PR:** [#55](https://github.com/gunnchOS3k/archive-of-life-artifact-world/pull/55)  
**Gates:** HUMAN=false · RC=false · V1=false · production=false · Cursor-Complete **not claimed**

## Shared Product Verification Standard (PVS)

Referenced worktree: `_open_lab_worktrees/product-verification-standard`  
Branch: `docs/gunnchos3k-product-verification-standard-v1`  
Paths: `docs/quality/schemas`, `docs/quality/specialty_matrices`

Those directories are present as a **scaffold** (schemas empty at draft time). This RTM uses a local specialty schema aligned with the gunnchOS3k Requirements Pack traceability plan and will rebase onto shared PVS row IDs when published.

## Specialty coverage

| Specialty | Focus |
| --- | --- |
| Scientific provenance | `sample_fallback ≠ source_verified`; IUCN blocked; NASA historical preserved |
| Taxonomy / geo / temporal | Species-correct marks; steppe/savanna honesty; **0/17** maps |
| Offline integrity | Pack hashes; `liveClaim=false` |
| Expeditions | Museum → field → dex → lifeling → save/reload |
| Organism identity | Flagship 24; emoji identity candidates ≠ finished models |
| Save migrations | `SAVE_VERSION` migrate; no global-coverage claim |
| Accessibility | Persisted a11y settings + honest museum/dex labels |

## Honesty invariants

- `sample_fallback` is never treated as `source_verified`
- IUCN remains `blocked_external` without token + rights review
- Time Atlas: **0/17** full-Earth maps source-verified
- No invented credentials or maps

## Status summary

See JSON `rows[].status`. Several expedition / museum-dex / organism rows are `cursor_complete_candidate` with automated evidence — **Cursor-Complete is not claimed**. Remaining gaps are listed in the JSON `cursorCompleteGaps` array.
