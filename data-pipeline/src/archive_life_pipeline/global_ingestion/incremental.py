"""Incremental taxonomy updates — snapshot A + delta must equal full rebuild of B."""

from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

OpType = Literal[
    "ADD",
    "UPDATE",
    "DELETE",
    "TOMBSTONE",
    "SYNONYM_CHANGE",
    "LINEAGE_CHANGE",
    "SOURCE_WITHDRAWAL",
]


@dataclass
class PatchOp:
    op: OpType
    record_id: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class IncrementalUpdateReport:
    ops: int
    resulting_count: int
    full_rebuild_count: int
    result_hash: str
    full_rebuild_hash: str
    equal: bool
    invalidated_indexes: list[str]
    invalidated_packs: list[str]
    rollback_snapshot: str
    pass_gate: bool
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _rec_id(rec: dict[str, Any]) -> str:
    return f"{rec.get('source_name')}:{rec.get('source_record_id')}"


def _hash_records(records: list[dict[str, Any]]) -> str:
    normalized = sorted(
        ({k: v for k, v in r.items() if k != "normalization_timestamp"} for r in records),
        key=lambda r: _rec_id(r),
    )
    blob = json.dumps(normalized, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()


def apply_ops(base: list[dict[str, Any]], ops: list[PatchOp]) -> list[dict[str, Any]]:
    by_id = {_rec_id(r): copy.deepcopy(r) for r in base}
    for op in ops:
        if op.op == "ADD":
            by_id[op.record_id] = copy.deepcopy(op.payload)
        elif op.op == "UPDATE":
            if op.record_id in by_id:
                by_id[op.record_id].update(op.payload)
        elif op.op in ("DELETE", "TOMBSTONE", "SOURCE_WITHDRAWAL"):
            by_id.pop(op.record_id, None)
        elif op.op == "SYNONYM_CHANGE":
            if op.record_id in by_id:
                by_id[op.record_id]["synonyms"] = op.payload.get("synonyms", [])
        elif op.op == "LINEAGE_CHANGE":
            if op.record_id in by_id:
                by_id[op.record_id]["lineage"] = op.payload.get("lineage", [])
    return list(by_id.values())


def verify_incremental_equals_full(
    snapshot_a: list[dict[str, Any]],
    snapshot_b: list[dict[str, Any]],
    ops: list[PatchOp],
) -> IncrementalUpdateReport:
    incremental = apply_ops(snapshot_a, ops)
    inc_hash = _hash_records(incremental)
    full_hash = _hash_records(snapshot_b)
    equal = inc_hash == full_hash and len(incremental) == len(snapshot_b)
    return IncrementalUpdateReport(
        ops=len(ops),
        resulting_count=len(incremental),
        full_rebuild_count=len(snapshot_b),
        result_hash=inc_hash,
        full_rebuild_hash=full_hash,
        equal=equal,
        invalidated_indexes=["search_bootstrap", "search_partitions"],
        invalidated_packs=["taxonomic_group_slice", "hero_taxa"],
        rollback_snapshot="snapshot_a",
        pass_gate=equal,
        notes="Deterministic patch set; rollback restores snapshot A.",
    )
