# State machine — artifact / Lifeling (current)

Artifact collection:

```mermaid
stateDiagram-v2
  [*] --> unseen
  unseen --> documented: collectArtifact success
  documented --> already_collected: duplicate attempt
```

Lifeling runtime (derived from `Lifeling.update` / emote timers — not a formal enum in code):

```mermaid
stateDiagram-v2
  [*] --> idle_bob
  idle_bob --> follow: dist > followDistance
  follow --> idle_bob: close enough
  idle_bob --> emote: triggerReaction
  follow --> emote: triggerReaction
  emote --> idle_bob: emoteTimer elapsed
```

Generated / sample biology must remain labeled; never “verified science.”
