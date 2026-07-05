from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SourceSnapshot(BaseModel):
    id: str
    source_name: str
    source_category: str
    version: str
    license: str
    citation: str
    citation_required: bool = True
    retrieval_date: str
    checksum: str | None = None
    local_path: str | None = None
    approved_for_use: bool = False
    is_mock_data: bool = False
    notes: str | None = None


class TaxonRecord(BaseModel):
    taxon_id: str
    scientific_name: str
    accepted_name: str
    rank: str
    life_status: str
    representation_tier: int = Field(ge=0, le=6)
    source: str
    source_version: str
    is_mock_data: bool = False


class CoverageGap(BaseModel):
    gap_id: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    category: str
    affected_taxon_id: str | None = None
    affected_biome_id: str | None = None
    affected_time_unit_id: str | None = None
    affected_place_id: str | None = None
    missing_fields: list[str] = Field(default_factory=list)
    recommended_fix: str
    blocking_for_release: bool = False


class AuditSummary(BaseModel):
    generated_at: datetime
    passed: int
    failed: int
    checks: list[dict]
    mock_sample_count: int
    gap_count: int
