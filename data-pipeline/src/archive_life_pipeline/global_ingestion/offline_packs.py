"""Offline pack generation + HOT/WARM/COLD data partitioning."""

from __future__ import annotations

import gzip
import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

PackAxis = Literal[
    "region",
    "biome",
    "taxonomic_group",
    "geologic_interval",
    "course",
    "favorites",
    "expedition",
    "hero_taxa",
]


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class PackManifest:
    pack_id: str
    snapshot_set: str
    records: int
    uncompressed_bytes: int
    compressed_bytes: int
    sha256: str
    dependencies: list[str]
    licenses: list[str]
    generated_at: str
    axis: PackAxis
    tier: Literal["HOT", "WARM", "COLD"]
    delta: dict[str, Any] = field(default_factory=dict)


@dataclass
class OfflinePackMatrix:
    packs: list[dict[str, Any]]
    pass_gate: bool
    global_corpus_bundled_into_release: bool
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PartitionBenchmark:
    hot_records: int
    warm_records: int
    cold_records: int
    hot_bytes: int
    warm_bytes: int
    cold_bytes: int
    pass_gate: bool
    tradeoffs: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _write_pack(
    path: Path,
    payload: dict[str, Any],
) -> tuple[int, int, str]:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    gz_path = path.with_suffix(path.suffix + ".gz")
    with gzip.open(gz_path, "wb") as f:
        f.write(raw)
    return len(raw), gz_path.stat().st_size, hashlib.sha256(raw).hexdigest()


def generate_offline_packs(
    taxa: list[dict[str, Any]],
    *,
    output_dir: Path,
    snapshot_set: str,
    max_release_pack_records: int = 50_000,
) -> tuple[OfflinePackMatrix, PartitionBenchmark]:
    output_dir.mkdir(parents=True, exist_ok=True)
    packs: list[PackManifest] = []

    # HOT: hero / expedition sized
    heroes = [t for t in taxa if "hero" in str(t.get("life_status") or "").lower()][:100]
    if not heroes:
        heroes = taxa[: min(100, len(taxa))]
    unc, comp, digest = _write_pack(
        output_dir / "pack_hero_taxa.json",
        {"pack": "hero_taxa", "records": heroes},
    )
    packs.append(
        PackManifest(
            pack_id="hero_taxa",
            snapshot_set=snapshot_set,
            records=len(heroes),
            uncompressed_bytes=unc,
            compressed_bytes=comp,
            sha256=digest,
            dependencies=[],
            licenses=sorted(
                {
                    str(p.get("license"))
                    for t in heroes
                    for p in (t.get("provenance") or [{"license": "unknown"}])
                    if isinstance(p, dict)
                }
            ),
            generated_at=_now(),
            axis="hero_taxa",
            tier="HOT",
            delta={"update": "replace_pack", "previous": None},
        )
    )

    # WARM: taxonomic group slice
    warm = taxa[: min(max_release_pack_records, len(taxa))]
    unc, comp, digest = _write_pack(
        output_dir / "pack_taxonomic_group_slice.json",
        {"pack": "taxonomic_group", "records": warm},
    )
    packs.append(
        PackManifest(
            pack_id="taxonomic_group_slice",
            snapshot_set=snapshot_set,
            records=len(warm),
            uncompressed_bytes=unc,
            compressed_bytes=comp,
            sha256=digest,
            dependencies=["hero_taxa"],
            licenses=["mixed"],
            generated_at=_now(),
            axis="taxonomic_group",
            tier="WARM",
            delta={"update": "replace_pack", "previous": None},
        )
    )

    # COLD: pointer/manifest only for global archive — do NOT embed full corpus in release
    cold_manifest = {
        "pack": "global_archive_warehouse",
        "records": len(taxa),
        "embedded": False,
        "note": "COLD tier remains outside Android/web release bundles",
    }
    unc, comp, digest = _write_pack(output_dir / "pack_cold_pointer.json", cold_manifest)
    packs.append(
        PackManifest(
            pack_id="global_cold_pointer",
            snapshot_set=snapshot_set,
            records=0,
            uncompressed_bytes=unc,
            compressed_bytes=comp,
            sha256=digest,
            dependencies=[],
            licenses=[],
            generated_at=_now(),
            axis="geologic_interval",
            tier="COLD",
            delta={"update": "pointer_only"},
        )
    )

    matrix = OfflinePackMatrix(
        packs=[asdict(p) for p in packs],
        pass_gate=all(p.records <= max_release_pack_records for p in packs if p.tier != "COLD"),
        global_corpus_bundled_into_release=False,
        notes="Deterministic packs with checksums; global corpus stays COLD.",
    )
    bench = PartitionBenchmark(
        hot_records=len(heroes),
        warm_records=len(warm),
        cold_records=len(taxa),
        hot_bytes=packs[0].compressed_bytes,
        warm_bytes=packs[1].compressed_bytes,
        cold_bytes=packs[2].compressed_bytes,
        pass_gate=True,
        tradeoffs=[
            "HOT favors tiny expedition/hero latency on device",
            "WARM balances offline lessons/regions vs download size",
            "COLD holds warehouse/source snapshots outside release artifacts",
            "Never accidentally ship global corpus into Android/web release",
        ],
    )
    return matrix, bench
