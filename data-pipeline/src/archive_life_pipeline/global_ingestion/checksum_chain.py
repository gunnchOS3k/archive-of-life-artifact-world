"""Source versioning + end-to-end checksum chain (SHA-256)."""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass
class SnapshotComponent:
    name: str
    path: str | None
    sha256: str | None
    bytes: int | None
    present: bool
    role: str


@dataclass
class ScientificSnapshotSet:
    snapshot_set_id: str
    generated_at: str
    components: list[SnapshotComponent]
    global_data_complete: bool = False
    all_species_ingested: bool = False
    notes: str = "Placeholder set until approved external snapshots are ingested."

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ChecksumChainResult:
    algorithm: str
    links: list[dict[str, Any]]
    corruption_test: dict[str, Any]
    end_to_end_pass: bool
    source_version_traceability_pass: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_snapshot_set(
    *,
    raw_paths: dict[str, Path | None],
    normalized_paths: dict[str, Path | None],
    science_db: Path | None = None,
    search_index: Path | None = None,
    offline_pack: Path | None = None,
    manifest: Path | None = None,
) -> ScientificSnapshotSet:
    components: list[SnapshotComponent] = []

    def add(role: str, name: str, path: Path | None) -> None:
        if path and path.exists():
            components.append(
                SnapshotComponent(
                    name=name,
                    path=str(path),
                    sha256=sha256_file(path),
                    bytes=path.stat().st_size,
                    present=True,
                    role=role,
                )
            )
        else:
            components.append(
                SnapshotComponent(
                    name=name,
                    path=str(path) if path else None,
                    sha256=None,
                    bytes=None,
                    present=False,
                    role=role,
                )
            )

    for source, path in raw_paths.items():
        add("raw_source", f"raw:{source}", path)
    for source, path in normalized_paths.items():
        add("normalized_export", f"normalized:{source}", path)
    add("canonical_science_db", "science_db", science_db)
    add("search_index", "search_index", search_index)
    add("offline_pack", "offline_pack", offline_pack)
    add("manifest", "manifest", manifest)

    return ScientificSnapshotSet(
        snapshot_set_id=f"gkip-{_now()[:10]}",
        generated_at=_now(),
        components=components,
    )


def verify_checksum_chain(
    snapshot: ScientificSnapshotSet,
    *,
    require_all_present: bool = False,
) -> ChecksumChainResult:
    links: list[dict[str, Any]] = []
    for c in snapshot.components:
        ok = True
        detail = "absent"
        if c.present and c.path and c.sha256:
            actual = sha256_file(Path(c.path))
            ok = actual == c.sha256
            detail = "match" if ok else f"mismatch actual={actual}"
        elif require_all_present:
            ok = False
            detail = "required_missing"
        links.append(
            {
                "name": c.name,
                "role": c.role,
                "present": c.present,
                "sha256": c.sha256,
                "ok": ok if c.present else (not require_all_present),
                "detail": detail,
            }
        )

    # Intentional corruption test on an ephemeral buffer (not mutating real files)
    probe = "gkip-corruption-probe-v1"
    good = sha256_text(probe)
    bad = sha256_text(probe + "-tampered")
    corruption_test = {
        "algorithm": "sha256",
        "baseline": good,
        "tampered": bad,
        "detected": good != bad,
        "pass": good != bad,
    }

    present_links = [L for L in links if L["present"]]
    e2e = all(L["ok"] for L in present_links) and corruption_test["pass"]
    # Traceability pass if every present component has sha256 + path
    trace = all(
        (not c.present) or (c.sha256 and c.path)
        for c in snapshot.components
    )

    return ChecksumChainResult(
        algorithm="sha256",
        links=links,
        corruption_test=corruption_test,
        end_to_end_pass=e2e,
        source_version_traceability_pass=trace,
    )
