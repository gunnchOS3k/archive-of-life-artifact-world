"""Source conflict ledger — conflicts are evidence, not something to hide."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass
from typing import Any

CONFLICT_FIELDS = (
    "accepted_name",
    "rank",
    "parent",
    "life_status",
    "time_range",
    "place",
    "conservation",
)


@dataclass
class ConflictRecord:
    archive_taxon_id: str | None
    field: str
    source_assertions: list[dict[str, Any]]
    source_versions: list[str]
    authority_policy: str
    chosen_value: Any | None
    resolution_reason: str | None
    confidence: float
    human_review_required: bool


@dataclass
class ConflictLedger:
    conflicts: list[dict[str, Any]]
    count: int
    pass_gate: bool
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_conflict_ledger(
    records: list[dict[str, Any]],
    unresolved: list[dict[str, Any]] | None = None,
) -> ConflictLedger:
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for rec in records:
        name = rec.get("accepted_name") or rec.get("scientific_name")
        if isinstance(name, str) and name.strip():
            by_name[" ".join(name.lower().split())].append(rec)

    conflicts: list[ConflictRecord] = []
    for name, rows in by_name.items():
        if len(rows) < 2:
            continue
        for field in ("rank", "life_status", "accepted_name"):
            values = {}
            for r in rows:
                val = r.get(field) if field != "accepted_name" else (
                    r.get("accepted_name") or r.get("scientific_name")
                )
                if val is None or val == "":
                    continue
                key = str(val).lower()
                values.setdefault(key, []).append(r)
            if len(values) > 1:
                assertions = []
                versions = []
                for key, group in values.items():
                    for r in group:
                        assertions.append(
                            {
                                "source": r.get("source_name"),
                                "source_record_id": r.get("source_record_id"),
                                "source_version": r.get("source_version"),
                                "value": r.get(field)
                                if field != "accepted_name"
                                else (r.get("accepted_name") or r.get("scientific_name")),
                            }
                        )
                        versions.append(str(r.get("source_version") or "unknown"))
                conflicts.append(
                    ConflictRecord(
                        archive_taxon_id=None,
                        field=field,
                        source_assertions=assertions,
                        source_versions=sorted(set(versions)),
                        authority_policy="do_not_fabricate_consensus",
                        chosen_value=None,
                        resolution_reason=None,
                        confidence=0.0,
                        human_review_required=True,
                    )
                )

    for u in unresolved or []:
        conflicts.append(
            ConflictRecord(
                archive_taxon_id=u.get("archive_taxon_id"),
                field=str(u.get("field")),
                source_assertions=u.get("assertions") or [],
                source_versions=sorted(
                    {
                        str(a.get("source_version") or "unknown")
                        for a in (u.get("assertions") or [])
                    }
                ),
                authority_policy="do_not_fabricate_consensus",
                chosen_value=None,
                resolution_reason=None,
                confidence=0.0,
                human_review_required=True,
            )
        )

    # Deduplicate identical field+name assertion sets
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    for c in conflicts:
        d = asdict(c)
        key = json_key(d)
        if key in seen:
            continue
        seen.add(key)
        unique.append(d)

    return ConflictLedger(
        conflicts=unique[:500],
        count=len(unique),
        pass_gate=True,
        notes="Conflicts retained as evidence; chosen_value left null when unresolved.",
    )


def json_key(d: dict[str, Any]) -> str:
    import json

    return json.dumps(
        {"field": d.get("field"), "assertions": d.get("source_assertions")},
        sort_keys=True,
        default=str,
    )
