"""July 5 NASA manifest bytes stay put. The review decision is not source_verified."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data-pipeline/exports/nasa/nasa_metadata_manifest.json"
DECISION = ROOT / "data-pipeline/exports/nasa/nasa_metadata_manifest_verification_decision.json"
HISTORICAL_SHA256 = "f6d1c4d83b3888b1cd9fd7cd1b4fed11dbd317b857d461666f6a01ea3b3265b6"


def test_historical_manifest_unchanged_and_decision_is_not_source_verified():
    raw = MANIFEST.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == HISTORICAL_SHA256
    historical = json.loads(raw)
    assert historical["generatedAt"] == "2026-07-05T03:41:38Z"
    assert historical["recordCount"] == 21
    assert historical["verifiedRecordCount"] == 21
    assert historical["verificationMode"] == "source_verified"
    assert historical["dataMode"] == "real_metadata"
    assert historical["scope"] == "metadata_only"

    decision = json.loads(DECISION.read_text())
    assert decision["historicalManifest"]["path"] == (
        "data-pipeline/exports/nasa/nasa_metadata_manifest.json"
    )
    assert decision["historicalManifest"]["sha256"] == HISTORICAL_SHA256
    assert decision["historicalManifest"]["bytesRewritten"] is False
    assert decision["historicalManifest"]["preserved"] is True

    current = decision["currentVerificationDecision"]
    assert current["verificationMode"] != "source_verified"
    assert current["sourceVerified"] is False
    assert current["verifiedRecordCount"] == 0
    assert current["appliesToUnverifiedRecordCount"] == 21
    assert current["dataMode"] != "source_verified"
    assert decision["retrieval"]["performed"] is False
    assert decision["retrieval"]["responseSha256"] is None
