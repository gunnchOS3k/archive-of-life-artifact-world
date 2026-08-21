# Wave008 — Component: ArchiveDex scientific record stack

```mermaid
flowchart LR
  Fixtures[ScientificFixtures] --> Adapters[SourceAdapters]
  Adapters --> Snapshot[SourceSnapshotManifest]
  Snapshot --> Validate[RecordValidator]
  Validate --> SciRec[ScientificRecordSnapshot]
  SciRec --> Dex[ArchiveDexEntry]
  Dex --> UI[ArchiveDex UI]
  SciRec --> Coverage[CoverageEngine]
  Coverage --> UI
  Registry[SourceRegistry] --> Adapters
  Registry --> UI
```

Components:
- ArchiveDex UI consumes ScientificRecordSnapshot via ArchiveDexEntry.scientificRecord
- Source adapters (fixture/HTTP stub) produce snapshots with explicit integration_status
- Coverage engine labels denominator; forbids completeness overclaim
- Field-level ScientificFieldEvidence binds value hashes to provenance
