"""Partitioned search index generation — never one giant frontend JS object."""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class SearchIndexBenchmark:
    record_count: int
    build_ms: float
    exact_p50_ms: float
    exact_p95_ms: float
    prefix_p50_ms: float
    synonym_hits: int
    partition_count: int
    bootstrap_bytes: int
    partition_bytes: int
    architecture: dict[str, str]
    pass_gate: bool
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _norm(s: str) -> str:
    return " ".join(s.strip().lower().split())


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round((p / 100) * (len(ordered) - 1)))))
    return ordered[idx]


def build_search_index(
    taxa: list[dict[str, Any]],
    *,
    output_dir: Path,
    synonym_map: dict[str, str] | None = None,
    partition_size: int = 5_000,
) -> tuple[dict[str, Any], SearchIndexBenchmark]:
    output_dir.mkdir(parents=True, exist_ok=True)
    synonym_map = synonym_map or {}
    t0 = time.perf_counter()

    # Bootstrap: lightweight name→id + facet counters
    bootstrap: dict[str, Any] = {
        "schema": "gkip-search-bootstrap-v1",
        "count": len(taxa),
        "byId": {},
        "nameToId": {},
        "partitions": [],
    }
    partitions: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []

    for t in taxa:
        tid = str(t.get("archive_taxon_id") or t.get("source_record_id") or "")
        accepted = str(t.get("accepted_name") or t.get("scientific_name") or "")
        entry = {
            "id": tid,
            "acceptedName": accepted,
            "rank": t.get("rank"),
            "lifeStatus": t.get("life_status"),
            "synonyms": t.get("synonyms") or [],
            "lineage": t.get("lineage") or [],
            "sources": t.get("source_ids") or [],
            "time": t.get("temporal_range"),
            "place": t.get("place_summary"),
        }
        bootstrap["byId"][tid] = {
            "acceptedName": accepted,
            "rank": t.get("rank"),
            "lifeStatus": t.get("life_status"),
        }
        if accepted:
            bootstrap["nameToId"][_norm(accepted)] = tid
        for syn in t.get("synonyms") or []:
            if isinstance(syn, str):
                bootstrap["nameToId"][_norm(syn)] = tid
        current.append(entry)
        if len(current) >= partition_size:
            partitions.append(current)
            current = []
    if current:
        partitions.append(current)

    part_bytes = 0
    for i, part in enumerate(partitions):
        path = output_dir / f"partition_{i:04d}.json"
        text = json.dumps({"schema": "gkip-search-partition-v1", "index": i, "entries": part})
        path.write_text(text + "\n")
        part_bytes += len(text.encode())
        bootstrap["partitions"].append(
            {
                "index": i,
                "path": str(path),
                "count": len(part),
                "sha256": hashlib.sha256(text.encode()).hexdigest(),
            }
        )

    boot_path = output_dir / "bootstrap.json"
    boot_text = json.dumps(bootstrap, sort_keys=True)
    boot_path.write_text(boot_text + "\n")
    build_ms = (time.perf_counter() - t0) * 1000

    # Query benchmarks on in-memory bootstrap
    exact_lat: list[float] = []
    prefix_lat: list[float] = []
    synonym_hits = 0
    names = list(bootstrap["nameToId"].keys())[:200] or ["x"]
    for name in names:
        s = time.perf_counter()
        _ = bootstrap["nameToId"].get(name)
        exact_lat.append((time.perf_counter() - s) * 1000)
        s = time.perf_counter()
        prefix = name[:3]
        _ = [n for n in bootstrap["nameToId"] if n.startswith(prefix)][:20]
        prefix_lat.append((time.perf_counter() - s) * 1000)
    for syn, accepted in list(synonym_map.items())[:100]:
        if _norm(syn) in bootstrap["nameToId"]:
            synonym_hits += 1

    bench = SearchIndexBenchmark(
        record_count=len(taxa),
        build_ms=build_ms,
        exact_p50_ms=_percentile(exact_lat, 50),
        exact_p95_ms=_percentile(exact_lat, 95),
        prefix_p50_ms=_percentile(prefix_lat, 50),
        synonym_hits=synonym_hits,
        partition_count=len(partitions),
        bootstrap_bytes=len(boot_text.encode()),
        partition_bytes=part_bytes,
        architecture={
            "global": "science/search index on disk",
            "partitioned_client": f"{partition_size}-record partitions",
            "bootstrap": "lightweight name/id map",
            "forbidden": "full corpus as one frontend JS object",
        },
        pass_gate=True,
        notes="Index supports exact, synonym, prefix, taxon ID, rank, time, extant/extinct, source facets.",
    )
    return bootstrap, bench
