"""Identity layers + deduplication decisions for catalogue-scale ingestion."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Decision = Literal["KEEP", "MERGE", "LINK_AS_SYNONYM", "CONFLICT", "REJECT"]


def _norm_name(name: str | None) -> str:
    if not name:
        return ""
    return " ".join(name.strip().lower().split())


@dataclass
class IdentityKeys:
    source_record_identity: str
    canonical_taxon_identity: str | None
    occurrence_identity: str | None = None
    fossil_occurrence_identity: str | None = None
    media_identity: str | None = None


@dataclass
class DedupeDecision:
    decision: Decision
    reason: str
    evidence: dict[str, Any]
    record_id: str
    matched_record_id: str | None = None


@dataclass
class DedupeReport:
    input_count: int
    kept: int
    merged: int
    linked_as_synonym: int
    conflicts: int
    rejected: int
    decisions: list[DedupeDecision] = field(default_factory=list)
    idempotent: bool = True
    notes: str = (
        "Never collapse distinct taxa merely because names match. "
        "Same scientific name across sources yields CONFLICT or LINK, not silent MERGE."
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def source_record_identity(source: str, source_record_id: str) -> str:
    return f"{source}:{source_record_id}"


def canonical_taxon_identity(
    accepted_name: str | None,
    rank: str | None,
    authorship: str | None = None,
) -> str | None:
    name = _norm_name(accepted_name)
    if not name:
        return None
    parts = [name, (rank or "").lower(), (authorship or "").lower()]
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]
    return f"taxon:{digest}"


def occurrence_identity(
    source: str,
    occurrence_id: str | None,
    lat: Any = None,
    lon: Any = None,
    event_date: str | None = None,
) -> str | None:
    if occurrence_id:
        return f"occ:{source}:{occurrence_id}"
    if lat is None or lon is None:
        return None
    return f"occ:{source}:{lat}:{lon}:{event_date or ''}"


def dedupe_records(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], DedupeReport]:
    """Idempotent dedupe with explicit decisions. Name collision != merge."""
    by_source_id: dict[str, dict[str, Any]] = {}
    by_canonical: dict[str, list[str]] = defaultdict(list)
    decisions: list[DedupeDecision] = []
    kept: list[dict[str, Any]] = []
    counts = {"KEEP": 0, "MERGE": 0, "LINK_AS_SYNONYM": 0, "CONFLICT": 0, "REJECT": 0}

    for rec in records:
        source = str(rec.get("source_name") or rec.get("source") or "unknown")
        sid = str(rec.get("source_record_id") or "")
        if not sid:
            decisions.append(
                DedupeDecision(
                    decision="REJECT",
                    reason="missing_source_record_id",
                    evidence={"source": source},
                    record_id="",
                )
            )
            counts["REJECT"] += 1
            continue
        skey = source_record_identity(source, sid)
        if skey in by_source_id:
            decisions.append(
                DedupeDecision(
                    decision="MERGE",
                    reason="duplicate_source_record_identity",
                    evidence={"source_record_identity": skey},
                    record_id=skey,
                    matched_record_id=skey,
                )
            )
            counts["MERGE"] += 1
            continue

        accepted = rec.get("accepted_name") or rec.get("scientific_name")
        ckey = canonical_taxon_identity(
            accepted if isinstance(accepted, str) else None,
            rec.get("rank") if isinstance(rec.get("rank"), str) else None,
            rec.get("authorship") if isinstance(rec.get("authorship"), str) else None,
        )
        life = str(rec.get("life_status") or "").lower()
        if ckey and ckey in by_canonical:
            prior_ids = by_canonical[ckey]
            prior = by_source_id[prior_ids[0]]
            prior_source = str(prior.get("source_name") or prior.get("source"))
            if prior_source != source:
                # Distinct source assertions of same name → conflict / link, never silent collapse
                if "synonym" in life or rec.get("synonyms"):
                    decision: Decision = "LINK_AS_SYNONYM"
                    reason = "cross_source_synonym_signal"
                else:
                    decision = "CONFLICT"
                    reason = "cross_source_same_canonical_name"
                decisions.append(
                    DedupeDecision(
                        decision=decision,
                        reason=reason,
                        evidence={
                            "canonical_taxon_identity": ckey,
                            "sources": [prior_source, source],
                            "names": [
                                prior.get("scientific_name"),
                                rec.get("scientific_name"),
                            ],
                        },
                        record_id=skey,
                        matched_record_id=prior_ids[0],
                    )
                )
                counts[decision] += 1
                # Keep both records; conflict is evidence
                by_source_id[skey] = rec
                by_canonical[ckey].append(skey)
                kept.append(rec)
                continue

        by_source_id[skey] = rec
        if ckey:
            by_canonical[ckey].append(skey)
        kept.append(rec)
        decisions.append(
            DedupeDecision(
                decision="KEEP",
                reason="first_unique_source_record",
                evidence={
                    "source_record_identity": skey,
                    "canonical_taxon_identity": ckey,
                },
                record_id=skey,
            )
        )
        counts["KEEP"] += 1

    # Idempotency: rerun on kept must not change size
    second, _ = _dedupe_pass_only_source_id(kept)
    idempotent = len(second) == len(kept)

    report = DedupeReport(
        input_count=len(records),
        kept=len(kept),
        merged=counts["MERGE"],
        linked_as_synonym=counts["LINK_AS_SYNONYM"],
        conflicts=counts["CONFLICT"],
        rejected=counts["REJECT"],
        decisions=decisions[:500],
        idempotent=idempotent,
    )
    return kept, report


def _dedupe_pass_only_source_id(
    records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    dropped = 0
    for rec in records:
        source = str(rec.get("source_name") or rec.get("source") or "unknown")
        sid = str(rec.get("source_record_id") or "")
        skey = source_record_identity(source, sid)
        if skey in seen:
            dropped += 1
            continue
        seen.add(skey)
        out.append(rec)
    return out, dropped


def report_fingerprint(report: DedupeReport) -> str:
    payload = {
        "input_count": report.input_count,
        "kept": report.kept,
        "merged": report.merged,
        "linked_as_synonym": report.linked_as_synonym,
        "conflicts": report.conflicts,
        "rejected": report.rejected,
        "idempotent": report.idempotent,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
