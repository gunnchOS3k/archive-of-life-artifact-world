#!/usr/bin/env python3
"""Compare two independent Wave008 data-pipeline snapshot reproduction runs."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPORT = ROOT / "data-pipeline/exports/release_snapshot_manifest.json"
OUT = ROOT / "artifacts/engineering_wave008/PIPELINE_AB_REPRODUCTION_RESULT.json"
AB = ROOT / "artifacts/engineering_wave008/pipeline_ab"


def normalize_manifest(path: Path) -> dict:
    doc = json.loads(path.read_text(encoding="utf-8"))
    # Drop non-deterministic clock fields for A/B equivalence
    doc.pop("generatedAt", None)
    return doc


def hash_obj(obj: object) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def main() -> int:
    a_path = AB / "A" / "release_snapshot_manifest.json"
    b_path = AB / "B" / "release_snapshot_manifest.json"
    if not a_path.is_file() or not b_path.is_file():
        print("PIPELINE_AB_MISSING_RUNS", file=sys.stderr)
        return 1
    a = normalize_manifest(a_path)
    b = normalize_manifest(b_path)
    a_hash = hash_obj(a)
    b_hash = hash_obj(b)
    equal = a_hash == b_hash and a.get("bundleChecksums") == b.get("bundleChecksums")
    result = {
        "ok": equal,
        "independent_runs": 2,
        "run_a_hash": a_hash,
        "run_b_hash": b_hash,
        "hashes_equal": equal,
        "bundle_checksum_count": len(a.get("bundleChecksums") or {}),
        "pipeline": "data-pipeline archive-pipeline build-snapshot",
        "deterministic_fields": ["dataSnapshotId", "bundleChecksums", "gameVersion"],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    if not equal:
        print("PIPELINE_AB_MISMATCH", result, file=sys.stderr)
        return 1
    print("PIPELINE_AB_OK", a_hash[:16])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
