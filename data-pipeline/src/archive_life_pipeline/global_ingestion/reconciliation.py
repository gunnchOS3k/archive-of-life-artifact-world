"""Canonical taxon reconciliation — never fabricate resolution when sources disagree."""

from __future__ import annotations

import hashlib
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

ReconciliationStatus = Literal[
    "SOURCE_VERIFIED",
    "MULTI_SOURCE_CORROBORATED",
    "DERIVED_INFERRED",
    "DISPUTED",
    "UNCERTAIN",
    "HISTORICAL_CLASSIFICATION",
    "INSUFFICIENT_EVIDENCE",
]


def _norm(name: str | None) -> str:
    if not name:
        return ""
    return " ".join(name.strip().lower().split())


@dataclass
class CanonicalTaxon:
    archive_taxon_id: str
    accepted_name: str
    rank: str | None
    authorship: str | None
    lineage: list[str]
    life_status: str | None
    source_ids: list[str]
    synonyms: list[str]
    temporal_range: dict[str, Any] | None
    place_summary: str | None
    provenance: list[dict[str, Any]]
    confidence: float
    reconciliation_status: ReconciliationStatus


@dataclass
class UnresolvedConflict:
    archive_taxon_id: str | None
    field: str
    scientific_name: str
    assertions: list[dict[str, Any]]
    human_review_required: bool = True


@dataclass
class ReconciliationReport:
    canonical_count: int
    by_status: dict[str, int]
    unresolved_count: int
    fabricated_resolutions: int
    pass_gate: bool
    notes: str
    sample: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _archive_id(accepted_name: str, rank: str | None) -> str:
    digest = hashlib.sha256(f"{_norm(accepted_name)}|{rank or ''}".encode()).hexdigest()[:20]
    return f"aol:taxon:{digest}"


def reconcile_taxa(
    records: list[dict[str, Any]],
) -> tuple[list[CanonicalTaxon], list[UnresolvedConflict], ReconciliationReport]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for rec in records:
        name = rec.get("accepted_name") or rec.get("scientific_name")
        if not isinstance(name, str) or not name.strip():
            continue
        groups[_norm(name)].append(rec)

    canonical: list[CanonicalTaxon] = []
    unresolved: list[UnresolvedConflict] = []
    by_status: dict[str, int] = defaultdict(int)
    fabricated = 0

    for name_key, rows in groups.items():
        sources = sorted(
            {
                f"{r.get('source_name')}:{r.get('source_record_id')}"
                for r in rows
                if r.get("source_name") and r.get("source_record_id")
            }
        )
        ranks = {r.get("rank") for r in rows if r.get("rank")}
        life = {r.get("life_status") for r in rows if r.get("life_status")}
        accepted_names = {
            (r.get("accepted_name") or r.get("scientific_name"))
            for r in rows
            if (r.get("accepted_name") or r.get("scientific_name"))
        }
        display_name = next(iter(accepted_names)) if accepted_names else name_key
        assert isinstance(display_name, str)

        status: ReconciliationStatus
        confidence: float
        if len(sources) == 0:
            status = "INSUFFICIENT_EVIDENCE"
            confidence = 0.1
        elif len(ranks) > 1 or len(life) > 1:
            status = "DISPUTED"
            confidence = 0.4
            aid = _archive_id(display_name, next(iter(ranks)) if len(ranks) == 1 else None)
            if len(ranks) > 1:
                unresolved.append(
                    UnresolvedConflict(
                        archive_taxon_id=aid,
                        field="rank",
                        scientific_name=display_name,
                        assertions=[
                            {
                                "source": r.get("source_name"),
                                "source_version": r.get("source_version"),
                                "value": r.get("rank"),
                            }
                            for r in rows
                            if r.get("rank")
                        ],
                    )
                )
            if len(life) > 1:
                unresolved.append(
                    UnresolvedConflict(
                        archive_taxon_id=aid,
                        field="life_status",
                        scientific_name=display_name,
                        assertions=[
                            {
                                "source": r.get("source_name"),
                                "source_version": r.get("source_version"),
                                "value": r.get("life_status"),
                            }
                            for r in rows
                            if r.get("life_status")
                        ],
                    )
                )
            # Do NOT fabricate a chosen value
        elif len(sources) >= 2:
            status = "MULTI_SOURCE_CORROBORATED"
            confidence = 0.9
        elif any(not r.get("is_synthetic") and not r.get("is_mock") for r in rows):
            status = "SOURCE_VERIFIED"
            confidence = 0.75
        else:
            status = "INSUFFICIENT_EVIDENCE"
            confidence = 0.2

        synonyms: list[str] = []
        for r in rows:
            for s in r.get("synonyms") or []:
                if isinstance(s, str) and s.strip():
                    synonyms.append(s.strip())
            sci = r.get("scientific_name")
            if isinstance(sci, str) and _norm(sci) != _norm(display_name):
                synonyms.append(sci)

        taxon = CanonicalTaxon(
            archive_taxon_id=_archive_id(
                display_name, next(iter(ranks)) if len(ranks) == 1 else None
            ),
            accepted_name=display_name,
            rank=next(iter(ranks)) if len(ranks) == 1 else None,
            authorship=next(
                (r.get("authorship") for r in rows if r.get("authorship")),
                None,
            ),
            lineage=[],
            life_status=next(iter(life)) if len(life) == 1 else None,
            source_ids=sources,
            synonyms=sorted(set(synonyms)),
            temporal_range=None,
            place_summary=None,
            provenance=[
                {
                    "source_name": r.get("source_name"),
                    "source_record_id": r.get("source_record_id"),
                    "source_snapshot_id": r.get("source_snapshot_id"),
                    "source_version": r.get("source_version"),
                    "license": r.get("license"),
                    "citation": r.get("citation"),
                    "input_checksum": r.get("input_checksum"),
                }
                for r in rows
            ],
            confidence=confidence,
            reconciliation_status=status,
        )
        canonical.append(taxon)
        by_status[status] += 1

    report = ReconciliationReport(
        canonical_count=len(canonical),
        by_status=dict(by_status),
        unresolved_count=len(unresolved),
        fabricated_resolutions=fabricated,
        pass_gate=fabricated == 0,
        notes="Disputed fields left unresolved; no fabricated consensus values.",
        sample=[asdict(t) for t in canonical[:20]],
    )
    return canonical, unresolved, report
