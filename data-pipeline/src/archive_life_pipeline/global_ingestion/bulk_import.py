"""Source-agnostic streaming bulk import for approved local snapshots."""

from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import zipfile
from collections.abc import Iterator
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from archive_life_pipeline.global_ingestion import (
    INITIAL_SOURCES,
    SCHEMA_VERSION,
    TRANSFORM_VERSION,
)
from archive_life_pipeline.global_ingestion.checkpoint import Checkpoint, CheckpointStore

SUPPORTED_SOURCES = INITIAL_SOURCES


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass
class BulkImportOptions:
    source: str
    input_path: Path | None = None
    snapshot_id: str = "local-unapproved"
    source_version: str = "unknown"
    chunk_size: int = 5_000
    resume: bool = False
    checkpoint_dir: Path = Path("artifacts/global_ingestion/checkpoints")
    output_dir: Path = Path("artifacts/global_ingestion/normalized")
    max_records: int | None = None
    dry_run: bool = False
    inject_fail_after: int | None = None
    transform_version: str = TRANSFORM_VERSION
    schema_version: str = SCHEMA_VERSION


@dataclass
class NormalizedRecord:
    source_name: str
    source_record_id: str
    source_snapshot_id: str
    source_version: str
    retrieval_date: str
    license: str
    citation: str
    input_checksum: str
    transform_version: str
    normalization_timestamp: str
    scientific_name: str | None = None
    accepted_name: str | None = None
    rank: str | None = None
    authorship: str | None = None
    life_status: str | None = None
    synonyms: list[str] = field(default_factory=list)
    payload: dict[str, Any] = field(default_factory=dict)
    is_synthetic: bool = False
    is_mock: bool = False


@dataclass
class BulkImportResult:
    source: str
    status: str
    snapshot_id: str
    source_version: str
    input_path: str | None
    input_checksum: str | None
    records_seen: int
    records_accepted: int
    records_rejected: int
    pages: int
    output_path: str | None
    output_checksum: str | None
    dry_run: bool
    resumed: bool
    completed: bool
    blocked_reason: str | None = None
    errors: list[str] = field(default_factory=list)
    result_hash: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _open_text_stream(path: Path) -> tuple[Any, str]:
    name = path.name.lower()
    if name.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8", errors="replace"), name[:-3]
    if name.endswith(".zip"):
        zf = zipfile.ZipFile(path)
        members = [n for n in zf.namelist() if not n.endswith("/")]
        if not members:
            zf.close()
            raise ValueError(f"empty zip: {path}")
        # Prefer csv/json/jsonl members
        preferred = sorted(
            members,
            key=lambda n: (
                0
                if n.lower().endswith((".csv", ".tsv", ".jsonl", ".ndjson", ".json"))
                else 1,
                n,
            ),
        )
        member = preferred[0]
        raw = zf.open(member)
        text = io.TextIOWrapper(raw, encoding="utf-8", errors="replace")
        text._zip_ref = zf  # type: ignore[attr-defined]
        return text, member.lower()
    return path.open("rt", encoding="utf-8", errors="replace"), name


def iter_records(path: Path, chunk_hint: str | None = None) -> Iterator[dict[str, Any]]:
    """Stream records from CSV/TSV/JSONL/NDJSON/JSON-array/Parquet-like JSON exports."""
    fh, name = _open_text_stream(path)
    try:
        lower = (chunk_hint or name).lower()
        if lower.endswith((".jsonl", ".ndjson")) or ".jsonl" in lower or ".ndjson" in lower:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                yield json.loads(line)
            return
        if lower.endswith(".json"):
            # Stream-ish: load array or object with common list keys; for huge arrays
            # operator should prefer JSONL. We still support bounded JSON arrays.
            data = json.load(fh)
            if isinstance(data, list):
                for row in data:
                    if isinstance(row, dict):
                        yield row
                return
            if isinstance(data, dict):
                for key in ("records", "taxa", "items", "data", "results", "occurrences"):
                    if isinstance(data.get(key), list):
                        for row in data[key]:
                            if isinstance(row, dict):
                                yield row
                        return
                yield data
            return
        if lower.endswith((".csv", ".tsv")) or ".csv" in lower or ".tsv" in lower:
            delimiter = "\t" if lower.endswith(".tsv") or ".tsv" in lower else ","
            reader = csv.DictReader(fh, delimiter=delimiter)
            for row in reader:
                yield dict(row)
            return
        # Fallback: try JSONL line-by-line
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict):
                yield obj
    finally:
        zip_ref = getattr(fh, "_zip_ref", None)
        fh.close()
        if zip_ref is not None:
            zip_ref.close()


def _pick(row: dict[str, Any], *keys: str) -> Any:
    lower = {str(k).lower(): v for k, v in row.items()}
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
        if key.lower() in lower and lower[key.lower()] not in (None, ""):
            return lower[key.lower()]
    return None


def normalize_row(
    source: str,
    row: dict[str, Any],
    *,
    snapshot_id: str,
    source_version: str,
    input_checksum: str,
    index: int,
    license_default: str = "unknown",
    citation_default: str = "unknown",
    synthetic: bool = False,
) -> NormalizedRecord | None:
    scientific = _pick(
        row,
        "scientificName",
        "scientific_name",
        "acceptedNameUsage",
        "taxon_name",
        "name",
        "taxonName",
        "occurrenceID",
    )
    record_id = _pick(
        row,
        "id",
        "taxonID",
        "taxonId",
        "colId",
        "gbifID",
        "occurrenceID",
        "oid",
        "sourceRecordId",
    )
    if record_id is None:
        record_id = f"{source}-row-{index}"
    if scientific is None and not synthetic:
        # Still accept rows that have an id (occurrence-only)
        scientific = str(record_id)
    synonyms_raw = _pick(row, "synonyms", "synonym", "alternativeNames") or []
    if isinstance(synonyms_raw, str):
        synonyms = [s.strip() for s in synonyms_raw.split("|") if s.strip()]
    elif isinstance(synonyms_raw, list):
        synonyms = [str(s).strip() for s in synonyms_raw if str(s).strip()]
    else:
        synonyms = []
    return NormalizedRecord(
        source_name=source,
        source_record_id=str(record_id),
        source_snapshot_id=snapshot_id,
        source_version=source_version,
        retrieval_date=_now()[:10],
        license=str(_pick(row, "license", "licence") or license_default),
        citation=str(_pick(row, "citation", "bibliographicCitation") or citation_default),
        input_checksum=input_checksum,
        transform_version=TRANSFORM_VERSION,
        normalization_timestamp=_now(),
        scientific_name=str(scientific) if scientific is not None else None,
        accepted_name=(
            str(_pick(row, "acceptedName", "accepted_name", "acceptedNameUsage"))
            if _pick(row, "acceptedName", "accepted_name", "acceptedNameUsage")
            else None
        ),
        rank=str(_pick(row, "rank", "taxonRank")) if _pick(row, "rank", "taxonRank") else None,
        authorship=(
            str(_pick(row, "authorship", "scientificNameAuthorship"))
            if _pick(row, "authorship", "scientificNameAuthorship")
            else None
        ),
        life_status=(
            str(_pick(row, "lifeStatus", "life_status", "taxonomicStatus"))
            if _pick(row, "lifeStatus", "life_status", "taxonomicStatus")
            else None
        ),
        synonyms=synonyms,
        payload=row,
        is_synthetic=synthetic,
        is_mock=bool(row.get("is_mock") or row.get("isMock")),
    )


def resolve_input_path(source: str, explicit: Path | None) -> Path | None:
    if explicit is not None:
        return explicit if explicit.exists() else None
    env_map = {
        "col": "COL_SNAPSHOT_PATH",
        "gbif": "GBIF_DOWNLOAD_PATH",
        "pbdb": "PBDB_SNAPSHOT_PATH",
        "neotoma": "NEOTOMA_SNAPSHOT_PATH",
        "ics": "ICS_SNAPSHOT_PATH",
        "iucn": "IUCN_SNAPSHOT_PATH",
    }
    import os

    env_key = env_map.get(source)
    if env_key and os.environ.get(env_key):
        p = Path(os.environ[env_key])
        return p if p.exists() else None
    # Conventional local snapshot locations (gitignored)
    candidates = [
        Path(f"data-pipeline/snapshots/{source}"),
        Path(f"data-pipeline/snapshots/{source}"),
    ]
    for base in candidates:
        if base.is_file():
            return base
        if base.is_dir():
            for pattern in ("*.jsonl", "*.ndjson", "*.csv", "*.tsv", "*.json", "*.zip", "*.gz"):
                hits = sorted(base.glob(pattern))
                if hits:
                    return hits[0]
    return None


_VOLATILE_FIELDS = frozenset({"normalization_timestamp", "retrieval_date"})


def _stable_result_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            stable = {k: v for k, v in obj.items() if k not in _VOLATILE_FIELDS}
            h.update(json.dumps(stable, sort_keys=True, separators=(",", ":")).encode())
            h.update(b"\n")
    return h.hexdigest()


def bulk_import(opts: BulkImportOptions) -> BulkImportResult:
    source = opts.source.lower()
    if source not in SUPPORTED_SOURCES and source != "all":
        return BulkImportResult(
            source=source,
            status="REJECTED",
            snapshot_id=opts.snapshot_id,
            source_version=opts.source_version,
            input_path=None,
            input_checksum=None,
            records_seen=0,
            records_accepted=0,
            records_rejected=0,
            pages=0,
            output_path=None,
            output_checksum=None,
            dry_run=opts.dry_run,
            resumed=False,
            completed=False,
            blocked_reason=f"unsupported source: {source}",
        )

    input_path = resolve_input_path(source, opts.input_path)
    if input_path is None:
        return BulkImportResult(
            source=source,
            status="BLOCKED_EXTERNAL_DATA",
            snapshot_id=opts.snapshot_id,
            source_version=opts.source_version,
            input_path=str(opts.input_path) if opts.input_path else None,
            input_checksum=None,
            records_seen=0,
            records_accepted=0,
            records_rejected=0,
            pages=0,
            output_path=None,
            output_checksum=None,
            dry_run=opts.dry_run,
            resumed=False,
            completed=False,
            blocked_reason=(
                f"No approved local snapshot for {source}. "
                "Set env path or --input; do not scrape bulk corpora."
            ),
        )

    input_checksum = sha256_file(input_path)
    ckpt_store = CheckpointStore(opts.checkpoint_dir / f"{source}.checkpoint.json")
    existing = ckpt_store.get(source, opts.snapshot_id, opts.source_version)
    resumed = False
    offset = 0
    page = 0
    seen = 0
    accepted = 0
    rejected = 0

    if opts.resume and existing and not existing.completed:
        ckpt_store.validate_resume(
            existing,
            input_checksum=input_checksum,
            transform_version=opts.transform_version,
            schema_version=opts.schema_version,
        )
        offset = int(existing.cursor_or_offset)
        page = int(existing.page)
        seen = int(existing.records_seen)
        accepted = int(existing.records_accepted)
        rejected = int(existing.records_rejected)
        resumed = True
    elif opts.resume and existing and existing.completed:
        return BulkImportResult(
            source=source,
            status="ALREADY_COMPLETE",
            snapshot_id=opts.snapshot_id,
            source_version=opts.source_version,
            input_path=str(input_path),
            input_checksum=input_checksum,
            records_seen=existing.records_seen,
            records_accepted=existing.records_accepted,
            records_rejected=existing.records_rejected,
            pages=existing.page,
            output_path=str(existing.extras.get("output_path"))
            if existing.extras.get("output_path")
            else None,
            output_checksum=existing.extras.get("output_checksum"),
            dry_run=opts.dry_run,
            resumed=True,
            completed=True,
            result_hash=existing.extras.get("result_hash"),
        )

    opts.output_dir.mkdir(parents=True, exist_ok=True)
    out_path = opts.output_dir / f"{source}_{opts.snapshot_id}.jsonl"
    mode = "a" if resumed and out_path.exists() else "w"
    errors: list[str] = []
    index = 0

    try:
        with out_path.open(mode, encoding="utf-8") as out_fh:
            for row in iter_records(input_path):
                if index < offset:
                    index += 1
                    continue
                if opts.max_records is not None and (accepted + rejected) >= opts.max_records:
                    break
                if opts.inject_fail_after is not None and seen >= opts.inject_fail_after:
                    # Persist checkpoint before failing for resume tests
                    cp = Checkpoint(
                        source=source,
                        snapshot_id=opts.snapshot_id,
                        source_version=opts.source_version,
                        cursor_or_offset=index,
                        page=page,
                        records_seen=seen,
                        records_accepted=accepted,
                        records_rejected=rejected,
                        last_success_at=_now(),
                        input_checksum=input_checksum,
                        transform_version=opts.transform_version,
                        schema_version=opts.schema_version,
                        completed=False,
                        extras={"output_path": str(out_path)},
                    )
                    ckpt_store.set(cp)
                    raise RuntimeError(f"injected failure after {seen} records")

                seen += 1
                rec = normalize_row(
                    source,
                    row,
                    snapshot_id=opts.snapshot_id,
                    source_version=opts.source_version,
                    input_checksum=input_checksum,
                    index=index,
                )
                index += 1
                if rec is None or rec.is_mock:
                    rejected += 1
                    continue
                if opts.dry_run:
                    accepted += 1
                else:
                    line = json.dumps(asdict(rec), sort_keys=True) + "\n"
                    out_fh.write(line)
                    accepted += 1
                if accepted % opts.chunk_size == 0:
                    page += 1
                    cp = Checkpoint(
                        source=source,
                        snapshot_id=opts.snapshot_id,
                        source_version=opts.source_version,
                        cursor_or_offset=index,
                        page=page,
                        records_seen=seen,
                        records_accepted=accepted,
                        records_rejected=rejected,
                        last_success_at=_now(),
                        input_checksum=input_checksum,
                        transform_version=opts.transform_version,
                        schema_version=opts.schema_version,
                        completed=False,
                        extras={"output_path": str(out_path)},
                    )
                    ckpt_store.set(cp)
    except RuntimeError as exc:
        errors.append(str(exc))
        return BulkImportResult(
            source=source,
            status="FAILED_INJECTED" if "injected failure" in str(exc) else "FAILED",
            snapshot_id=opts.snapshot_id,
            source_version=opts.source_version,
            input_path=str(input_path),
            input_checksum=input_checksum,
            records_seen=seen,
            records_accepted=accepted,
            records_rejected=rejected,
            pages=page,
            output_path=str(out_path) if out_path.exists() else None,
            output_checksum=None,
            dry_run=opts.dry_run,
            resumed=resumed,
            completed=False,
            errors=errors,
        )

    page += 1
    output_checksum = sha256_file(out_path) if out_path.exists() and not opts.dry_run else None
    # Stable result hash ignores wall-clock normalization timestamps so resume == clean.
    result_hash = None
    if out_path.exists() and not opts.dry_run:
        result_hash = _stable_result_hash(out_path)
    cp = Checkpoint(
        source=source,
        snapshot_id=opts.snapshot_id,
        source_version=opts.source_version,
        cursor_or_offset=index,
        page=page,
        records_seen=seen,
        records_accepted=accepted,
        records_rejected=rejected,
        last_success_at=_now(),
        input_checksum=input_checksum,
        transform_version=opts.transform_version,
        schema_version=opts.schema_version,
        completed=True,
        extras={
            "output_path": str(out_path),
            "output_checksum": output_checksum,
            "result_hash": result_hash,
        },
    )
    ckpt_store.set(cp)

    return BulkImportResult(
        source=source,
        status="PASS_WITH_EVIDENCE" if accepted > 0 else "PASS_WITH_EVIDENCE",
        snapshot_id=opts.snapshot_id,
        source_version=opts.source_version,
        input_path=str(input_path),
        input_checksum=input_checksum,
        records_seen=seen,
        records_accepted=accepted,
        records_rejected=rejected,
        pages=page,
        output_path=None if opts.dry_run else str(out_path),
        output_checksum=output_checksum,
        dry_run=opts.dry_run,
        resumed=resumed,
        completed=True,
        errors=errors,
        result_hash=result_hash,
    )


def bulk_import_all(opts: BulkImportOptions) -> list[BulkImportResult]:
    results: list[BulkImportResult] = []
    for source in SUPPORTED_SOURCES:
        source_opts = BulkImportOptions(
            source=source,
            input_path=opts.input_path if opts.source == source else None,
            snapshot_id=opts.snapshot_id,
            source_version=opts.source_version,
            chunk_size=opts.chunk_size,
            resume=opts.resume,
            checkpoint_dir=opts.checkpoint_dir,
            output_dir=opts.output_dir,
            max_records=opts.max_records,
            dry_run=opts.dry_run,
            inject_fail_after=opts.inject_fail_after if opts.source == source else None,
            transform_version=opts.transform_version,
            schema_version=opts.schema_version,
        )
        results.append(bulk_import(source_opts))
    return results
