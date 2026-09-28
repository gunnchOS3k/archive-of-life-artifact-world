# Scientific Snapshot Set Policy

Every normalized record must trace to:

`source_name`, `source_record_id`, `source_snapshot_id`, `source_version`, `retrieval_date`, `license`, `citation`, `input_checksum`, `transform_version`, `normalization_timestamp`

## Checksum chain (SHA-256)

1. raw approved source
2. normalized export
3. canonical science DB
4. search index
5. offline pack
6. manifest

Intentional corruption probes must detect tampering.

## Completeness gates

Must not claim catalogue completeness. Forbidden completeness tokens stay false without authentic approved snapshots. Snapshot-scoped completeness may be evaluated only against a declared approved source set with checksums.

Git may store manifests/hashes/aggregate reports only — never raw multi-GB corpora.
