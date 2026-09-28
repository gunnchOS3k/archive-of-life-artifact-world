"""Durable checkpoint / resume for catalogue-scale bulk import."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class Checkpoint:
    source: str
    snapshot_id: str
    source_version: str
    cursor_or_offset: int = 0
    page: int = 0
    records_seen: int = 0
    records_accepted: int = 0
    records_rejected: int = 0
    last_success_at: str | None = None
    input_checksum: str | None = None
    transform_version: str = ""
    schema_version: str = ""
    completed: bool = False
    extras: dict[str, Any] = field(default_factory=dict)

    def key(self) -> str:
        return f"{self.source}|{self.snapshot_id}|{self.source_version}"


class CheckpointStore:
    """Atomic JSON checkpoint store with checksum / schema refusal."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._items: dict[str, Checkpoint] = {}
        if self.path.exists():
            self.load()

    def load(self) -> None:
        raw = json.loads(self.path.read_text())
        self._items = {}
        for row in raw.get("checkpoints", []):
            extras = {k: v for k, v in row.items() if k not in Checkpoint.__dataclass_fields__}
            base = {k: row[k] for k in Checkpoint.__dataclass_fields__ if k in row and k != "extras"}
            cp = Checkpoint(**base)
            cp.extras = extras or row.get("extras", {})
            self._items[cp.key()] = cp

    def get(self, source: str, snapshot_id: str, source_version: str) -> Checkpoint | None:
        return self._items.get(f"{source}|{snapshot_id}|{source_version}")

    def validate_resume(
        self,
        existing: Checkpoint,
        *,
        input_checksum: str | None,
        transform_version: str,
        schema_version: str,
        allow_migrate: bool = False,
    ) -> None:
        if existing.input_checksum and input_checksum and existing.input_checksum != input_checksum:
            raise ValueError(
                f"checksum mismatch: checkpoint={existing.input_checksum} input={input_checksum}"
            )
        if existing.transform_version and existing.transform_version != transform_version:
            if not allow_migrate:
                raise ValueError(
                    f"transform_version mismatch: {existing.transform_version} vs {transform_version}"
                )
        if existing.schema_version and existing.schema_version != schema_version:
            if not allow_migrate:
                raise ValueError(
                    f"schema_version mismatch: {existing.schema_version} vs {schema_version}"
                )

    def set(self, cp: Checkpoint) -> None:
        self._items[cp.key()] = cp
        self.save()

    def save(self) -> None:
        payload = {
            "schema": "gkip-checkpoint-v1",
            "updatedAt": _now(),
            "checkpoints": [asdict(cp) for cp in self._items.values()],
        }
        data = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        fd, tmp_name = tempfile.mkstemp(
            dir=str(self.path.parent), prefix=".ckpt_", suffix=".tmp"
        )
        try:
            with os.fdopen(fd, "w") as f:
                f.write(data)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_name, self.path)
        finally:
            if os.path.exists(tmp_name):
                os.unlink(tmp_name)

    def list(self) -> list[Checkpoint]:
        return list(self._items.values())
