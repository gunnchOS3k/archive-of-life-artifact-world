"""Tests for Global Knowledge Ingestion Program engineering gates."""

from __future__ import annotations

from pathlib import Path

from archive_life_pipeline.global_ingestion.bulk_import import BulkImportOptions, bulk_import
from archive_life_pipeline.global_ingestion.identity import dedupe_records
from archive_life_pipeline.global_ingestion.incremental import (
    PatchOp,
    apply_ops,
    verify_incremental_equals_full,
)
from archive_life_pipeline.global_ingestion.reconciliation import reconcile_taxa
from archive_life_pipeline.global_ingestion.scale_bench import generate_synthetic_jsonl
from archive_life_pipeline.global_ingestion.synonym_graph import build_synonym_graph
from archive_life_pipeline.global_ingestion.time_normalize import run_time_normalization


def test_checkpoint_resume_equivalence(tmp_path: Path):
    fixture = tmp_path / "fixture.jsonl"
    generate_synthetic_jsonl(fixture, 1200, seed="resume")
    ckpt = tmp_path / "ckpt"
    out_a = tmp_path / "interrupted"
    failed = bulk_import(
        BulkImportOptions(
            source="col",
            input_path=fixture,
            snapshot_id="t",
            source_version="v1",
            chunk_size=200,
            checkpoint_dir=ckpt,
            output_dir=out_a,
            inject_fail_after=400,
        )
    )
    assert failed.status.startswith("FAILED")
    resumed = bulk_import(
        BulkImportOptions(
            source="col",
            input_path=fixture,
            snapshot_id="t",
            source_version="v1",
            chunk_size=200,
            resume=True,
            checkpoint_dir=ckpt,
            output_dir=out_a,
        )
    )
    clean = bulk_import(
        BulkImportOptions(
            source="col",
            input_path=fixture,
            snapshot_id="t",
            source_version="v1",
            chunk_size=200,
            checkpoint_dir=tmp_path / "ckpt2",
            output_dir=tmp_path / "clean",
        )
    )
    assert resumed.completed and clean.completed
    assert resumed.records_accepted == clean.records_accepted == 1200
    assert resumed.result_hash == clean.result_hash


def test_checksum_mismatch_refuses_resume(tmp_path: Path):
    fixture = tmp_path / "fixture.jsonl"
    generate_synthetic_jsonl(fixture, 100, seed="a")
    ckpt = tmp_path / "ckpt"
    bulk_import(
        BulkImportOptions(
            source="col",
            input_path=fixture,
            snapshot_id="t",
            source_version="v1",
            chunk_size=50,
            checkpoint_dir=ckpt,
            output_dir=tmp_path / "out",
            inject_fail_after=40,
        )
    )
    other = tmp_path / "other.jsonl"
    generate_synthetic_jsonl(other, 100, seed="b")
    try:
        bulk_import(
            BulkImportOptions(
                source="col",
                input_path=other,
                snapshot_id="t",
                source_version="v1",
                resume=True,
                checkpoint_dir=ckpt,
                output_dir=tmp_path / "out",
            )
        )
        raised = False
    except ValueError as exc:
        raised = "checksum" in str(exc).lower()
    assert raised


def test_dedupe_idempotent_and_no_name_collapse():
    records = [
        {
            "source_name": "col",
            "source_record_id": "1",
            "scientific_name": "Ursus arctos",
            "accepted_name": "Ursus arctos",
            "rank": "species",
        },
        {
            "source_name": "col",
            "source_record_id": "1",
            "scientific_name": "Ursus arctos",
            "accepted_name": "Ursus arctos",
            "rank": "species",
        },
        {
            "source_name": "gbif",
            "source_record_id": "9",
            "scientific_name": "Ursus arctos",
            "accepted_name": "Ursus arctos",
            "rank": "species",
        },
    ]
    kept, report = dedupe_records(records)
    assert report.merged == 1
    assert report.conflicts >= 1
    assert len(kept) == 2
    kept2, report2 = dedupe_records(kept)
    assert len(kept2) == len(kept)
    assert report2.idempotent


def test_synonym_cycle_detection():
    records = [
        {
            "source_name": "col",
            "source_record_id": "a",
            "scientific_name": "A",
            "accepted_name": "B",
            "source_version": "1",
        },
        {
            "source_name": "col",
            "source_record_id": "b",
            "scientific_name": "B",
            "accepted_name": "A",
            "source_version": "1",
        },
    ]
    _g, report = build_synonym_graph(records)
    assert report.cycles_detected
    assert report.integrity_pass is False


def test_reconciliation_does_not_fabricate():
    records = [
        {
            "source_name": "col",
            "source_record_id": "1",
            "scientific_name": "X y",
            "accepted_name": "X y",
            "rank": "species",
            "life_status": "extant",
        },
        {
            "source_name": "pbdb",
            "source_record_id": "2",
            "scientific_name": "X y",
            "accepted_name": "X y",
            "rank": "genus",
            "life_status": "extinct",
        },
    ]
    canonical, unresolved, report = reconcile_taxa(records)
    assert report.fabricated_resolutions == 0
    assert any(c.reconciliation_status == "DISPUTED" for c in canonical)
    assert len(unresolved) >= 1


def test_time_engine_preserves_ranges():
    report = run_time_normalization(
        [{"temporal_range": {"earliest_ma": 145.0, "latest_ma": 66.0, "period": "Cretaceous"}}],
        ics_snapshot_present=False,
    )
    assert report.engine_pass
    assert report.status == "BLOCKED_EXTERNAL_DATA"
    assert report.collapsed_to_point == 0


def test_incremental_equals_full_rebuild():
    base = [
        {
            "source_name": "col",
            "source_record_id": "1",
            "scientific_name": "A a",
            "rank": "species",
        },
        {
            "source_name": "col",
            "source_record_id": "2",
            "scientific_name": "B b",
            "rank": "species",
        },
    ]
    ops = [
        PatchOp(
            op="ADD",
            record_id="col:3",
            payload={
                "source_name": "col",
                "source_record_id": "3",
                "scientific_name": "C c",
                "rank": "species",
            },
        ),
        PatchOp(op="TOMBSTONE", record_id="col:2"),
        PatchOp(op="UPDATE", record_id="col:1", payload={"rank": "subspecies"}),
    ]
    full = apply_ops(base, ops)
    report = verify_incremental_equals_full(base, full, ops)
    assert report.equal
    assert report.pass_gate


def test_blocked_external_without_input(tmp_path: Path):
    result = bulk_import(
        BulkImportOptions(
            source="gbif",
            snapshot_id="x",
            source_version="x",
            checkpoint_dir=tmp_path / "ckpt",
            output_dir=tmp_path / "out",
        )
    )
    assert result.status == "BLOCKED_EXTERNAL_DATA"
    assert result.completed is False
