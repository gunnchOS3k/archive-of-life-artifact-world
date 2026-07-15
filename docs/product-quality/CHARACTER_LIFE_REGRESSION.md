# Archive regression freeze — character-life branch

Scope: regression only. No feature expansion.

## Checklist

| Flow | Status |
| --- | --- |
| Expedition | Prior Pixel PASS retained (merged main) |
| Observation | Prior PASS |
| Artifact | Prior PASS |
| Notebook | Prior PASS |
| Sources and Evidence | Vitest 28/28 including infinite-loading regression |
| Live/fixture labeling | Unchanged |
| Lifeling trait | Unchanged |
| Indiana Ancient Swamp | Unchanged |
| Persistence | Unchanged |
| Offline/provider failure | Covered by federation timeout tests |
| No infinite Loading | Regression tests pass |

Automated: `npm test` → 28 passed (this branch, 2026-07-14).

Pixel re-smoke optional if no Archive source changes on this branch (none intentional).
