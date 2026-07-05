from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA


def checksum_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def build_snapshot_manifest() -> dict:
    """Build release snapshot manifest with bundle checksums."""
    bundles_dir = PUBLIC_DATA / "bundles"
    manifest_path = PUBLIC_DATA / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    bundle_checksums = {}
    for p in sorted(bundles_dir.glob("*.json")):
        bundle_checksums[f"bundles/{p.name}"] = checksum_file(p)

    out = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "gameVersion": "2.0.0",
        "dataSnapshotId": manifest.get("snapshotId", "unknown"),
        "sourceSnapshotIds": [],
        "bundleChecksums": bundle_checksums,
        "mockSampleCount": 0,
    }

    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = EXPORTS_DIR / "release_snapshot_manifest.json"
    out_path.write_text(json.dumps(out, indent=2))
    return out
