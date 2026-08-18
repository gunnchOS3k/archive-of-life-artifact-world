# Sequence — expedition (current)

```mermaid
sequenceDiagram
  participant P as Player
  participant UI as Museum / region UI
  participant ES as expeditionSystem
  participant SAVE as SaveState
  participant ART as collectArtifact
  P->>UI: New Expedition
  UI->>ES: startExpedition
  ES->>SAVE: active + progress
  P->>UI: visit / observe / collect
  UI->>ES: complete objective
  UI->>ART: collectArtifact
  ART->>SAVE: artifacts + provenance cites
  Note over ART: ethical artifacts only; science fields stay labeled
```
