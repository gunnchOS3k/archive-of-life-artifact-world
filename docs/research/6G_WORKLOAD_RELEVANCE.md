# 6G workload relevance — Archive of Life

This product is a **game / interactive workload**, not a RAN research result.

The notes below describe **measurable latency, QoE, and traffic characteristics** a lab could observe if this client ran on an instrumented link. They are **not** a 6G dissertation contribution.


## What this client is

Browser/Capacitor educational exploration game. Scientific bundles are labeled sample / game-authored unless a source snapshot is imported.

## Measurable characteristics

| Quantity | Where | Notes |
|---|---|---|
| Bundle fetch | `public/data/` | Local static files; offline-capable |
| Evidence panel timeout | `SourcesEvidencePanel.ts` | Bounded ~10 s per provider; offline state |
| Expedition start | `systems/expeditionSystem.ts` | Local save, not a network control loop |
| Package | `com.gunnchos.archiveoflife` | Distinct identity |

QoE is “did the world load and stay labeled,” not spectral efficiency.

## What this is not

- Not a claim that generated biology is verified science
- Not a 6G sensing or Earth-observation dissertation result
- Not Pixel 6a PASS while adb is unauthorized
