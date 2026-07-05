# Source snapshots

Large biodiversity source downloads are **not committed** to Git. Place full snapshots here locally or track them with DVC/external storage later.

Each snapshot directory should include:

- `manifest.json` — source name, version, license, checksum, retrieval date, `approvedForUse`
- Raw files downloaded from the authoritative source
- Transformation logs

Only small sample scopes and checksum manifests belong in Git. See `docs/DATA_VERSIONING_WORKFLOW.md`.
