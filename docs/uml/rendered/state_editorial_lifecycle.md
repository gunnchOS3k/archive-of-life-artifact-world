# Wave008 — State: editorial lifecycle

```mermaid
stateDiagram-v2
  [*] --> INGESTED
  INGESTED --> VALIDATED
  VALIDATED --> CURATED
  INGESTED --> REVIEW_NEEDED
  REVIEW_NEEDED --> CONFLICTED
  CONFLICTED --> REVIEW_NEEDED
  INGESTED --> BLOCKED_EXTERNAL
  INGESTED --> GAME_AUTHORED
  INGESTED --> MOCK_SAMPLE
  CURATED --> RETIRED
  MOCK_SAMPLE --> RETIRED: never auto-CURATED
```

Editorial status is distinct from EvidenceConfidence and VerificationStatus.
