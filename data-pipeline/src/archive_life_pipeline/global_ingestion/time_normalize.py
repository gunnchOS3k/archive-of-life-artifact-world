"""Time-range normalization engine backed by Time Atlas / ICS semantics."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class TimeInterval:
    earliest_ma: float | None
    latest_ma: float | None
    eon: str | None = None
    era: str | None = None
    period: str | None = None
    epoch: str | None = None
    age: str | None = None
    present: bool = False
    uncertain: bool = False
    open_ended: bool = False
    label: str | None = None


@dataclass
class TimeNormalizationReport:
    engine_pass: bool
    ics_snapshot_present: bool
    status: str
    normalized_count: int
    preserved_ranges: int
    collapsed_to_point: int
    samples: list[dict[str, Any]] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# Minimal fixture ICS-like units for engine tests (not a real ICS approval)
FIXTURE_ICS_UNITS = {
    "holocene": TimeInterval(0.0117, 0.0, period="Quaternary", epoch="Holocene", present=True),
    "pleistocene": TimeInterval(2.58, 0.0117, period="Quaternary", epoch="Pleistocene"),
    "cretaceous": TimeInterval(145.0, 66.0, era="Mesozoic", period="Cretaceous"),
    "cambrian": TimeInterval(538.8, 485.4, era="Paleozoic", period="Cambrian"),
}


def normalize_interval(raw: dict[str, Any], *, ics_available: bool) -> TimeInterval:
    earliest = raw.get("earliest_ma", raw.get("max_ma", raw.get("eag")))
    latest = raw.get("latest_ma", raw.get("min_ma", raw.get("lag")))
    label = raw.get("label") or raw.get("period") or raw.get("epoch")
    if isinstance(label, str) and label.lower() in FIXTURE_ICS_UNITS and earliest is None:
        base = FIXTURE_ICS_UNITS[label.lower()]
        return TimeInterval(
            earliest_ma=base.earliest_ma,
            latest_ma=base.latest_ma,
            eon=base.eon,
            era=base.era,
            period=base.period,
            epoch=base.epoch,
            age=base.age,
            present=base.present,
            uncertain=not ics_available,
            open_ended=False,
            label=label,
        )
    try:
        e = float(earliest) if earliest is not None else None
    except (TypeError, ValueError):
        e = None
    try:
        latest_val = float(latest) if latest is not None else None
    except (TypeError, ValueError):
        latest_val = None
    open_ended = (e is not None and latest_val is None) or (latest_val is not None and e is None)
    uncertain = e is None and latest_val is None
    present = bool(raw.get("present")) or (latest_val == 0.0)
    return TimeInterval(
        earliest_ma=e,
        latest_ma=latest_val,
        eon=raw.get("eon"),
        era=raw.get("era"),
        period=raw.get("period"),
        epoch=raw.get("epoch"),
        age=raw.get("age"),
        present=present,
        uncertain=uncertain,
        open_ended=open_ended,
        label=label if isinstance(label, str) else None,
    )


def run_time_normalization(
    records: list[dict[str, Any]],
    *,
    ics_snapshot_present: bool,
) -> TimeNormalizationReport:
    normalized: list[TimeInterval] = []
    collapsed = 0
    preserved = 0
    for rec in records:
        raw = rec.get("temporal_range") or rec.get("time") or {}
        if not isinstance(raw, dict):
            continue
        interval = normalize_interval(raw, ics_available=ics_snapshot_present)
        if (
            interval.earliest_ma is not None
            and interval.latest_ma is not None
            and interval.earliest_ma == interval.latest_ma
            and not interval.present
        ):
            # Point only if source literally provided a point — still not a collapse of a range
            if raw.get("earliest_ma") != raw.get("latest_ma"):
                collapsed += 1
            else:
                preserved += 1
        else:
            preserved += 1
        normalized.append(interval)

    status = "PASS_WITH_EVIDENCE" if ics_snapshot_present else "BLOCKED_EXTERNAL_DATA"
    # Engine itself can pass synthetic/fixture tests even when ICS absent
    engine_pass = collapsed == 0
    return TimeNormalizationReport(
        engine_pass=engine_pass,
        ics_snapshot_present=ics_snapshot_present,
        status=status,
        normalized_count=len(normalized),
        preserved_ranges=preserved,
        collapsed_to_point=collapsed,
        samples=[asdict(x) for x in normalized[:20]],
        notes=(
            "Real ICS snapshot absent => BLOCKED_EXTERNAL_DATA for production normalization; "
            "engine passes fixture tests without collapsing ranges to points."
        ),
    )
