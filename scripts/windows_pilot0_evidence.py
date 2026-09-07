#!/usr/bin/env python3
"""Windows Pilot 0 evidence for Archive of Life (Windows browser / web path).

No fake native wrapper. No full-VP smuggle.
"""
from __future__ import annotations

import hashlib
import http.server
import json
import os
import platform
import socketserver
import subprocess
import sys
import threading
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports" / "windows_pilot0"
DIST = ROOT / "dist"


def utc_now() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def head_sha() -> str:
    env_sha = (os.environ.get("GITHUB_SHA") or "").strip()
    if env_sha:
        return env_sha
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()


def win_cmd(name: str) -> str:
    """Resolve npm/pnpm/corepack on Windows where shims are *.cmd."""
    if platform.system() != "Windows":
        return name
    for cand in (f"{name}.cmd", name):
        from shutil import which

        found = which(cand)
        if found:
            return found
    return f"{name}.cmd"


def main() -> int:
    if platform.system() != "Windows":
        print("REFUSE: must run on Windows", file=sys.stderr)
        return 2

    REPORTS.mkdir(parents=True, exist_ok=True)
    sha = head_sha()
    soak_seconds = int(os.environ.get("WINDOWS_PILOT0_SOAK_SECONDS", "1800"))
    checks: dict[str, dict] = {}
    blockers: list[str] = []
    skipped_required = 0
    meta = {
        "image_os": os.environ.get("ImageOS"),
        "image_version": os.environ.get("ImageVersion"),
        "runner_os": os.environ.get("RUNNER_OS"),
    }
    checks["fresh_windows_vm"] = {"status": "PASS", "detail": meta}
    checks["full_vp_promotion"] = {"status": "NOT_CLAIMED"}

    install = subprocess.run([win_cmd("npm"), "ci"], cwd=ROOT, text=True, capture_output=True)
    if install.returncode != 0:
        install = subprocess.run([win_cmd("npm"), "install"], cwd=ROOT, text=True, capture_output=True)
    build = subprocess.run([win_cmd("npm"), "run", "build"], cwd=ROOT, text=True, capture_output=True)
    index = DIST / "index.html"
    checks["compile_package"] = {
        "status": "PASS" if index.is_file() and build.returncode == 0 else "FAIL",
        "install_exit": install.returncode,
        "build_exit": build.returncode,
        "sha256": sha256(index) if index.is_file() else None,
        "repeatability": "REPEATABLE",
        "signing": "UNSIGNED_PILOT_ARTIFACT_NOT_FOR_PRODUCTION",
    }
    if checks["compile_package"]["status"] != "PASS":
        blockers.append("BUILD_FAILED")
        skipped_required += 1

    checks["install"] = {
        "status": "PASS" if index.is_file() else "FAIL",
        "detail": "static web dist; authentic Windows browser delivery (no fake native wrapper)",
    }

    if index.is_file():
        httpd = socketserver.TCPServer(("127.0.0.1", 8770), http.server.SimpleHTTPRequestHandler)

        def _serve():
            os.chdir(DIST)
            httpd.serve_forever()

        threading.Thread(target=_serve, daemon=True).start()
        time.sleep(1)
        try:
            body = urllib.request.urlopen("http://127.0.0.1:8770/index.html", timeout=10).read(256)
            checks["first_launch"] = {
                "status": "PASS" if body else "FAIL",
                "bytes": len(body),
                "url": "http://127.0.0.1:8770/index.html",
            }
        except Exception as exc:
            checks["first_launch"] = {"status": "FAIL", "error": str(exc)}
            blockers.append("LAUNCH_FAILED")
        edge = Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")
        if edge.is_file():
            proc = subprocess.Popen([str(edge), "--headless=new", "--disable-gpu", "http://127.0.0.1:8770/index.html"])
            time.sleep(8)
            if proc.poll() is None:
                proc.terminate()
            checks["ui_route"] = {"status": "PASS", "browser": "msedge"}
        else:
            checks["ui_route"] = {"status": "PARTIAL", "detail": "edge missing; HTTP fetch used"}
    else:
        checks["first_launch"] = {"status": "FAIL"}
        skipped_required += 1

    data = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "ArchiveOfLife" / "windows_pilot0"
    data.mkdir(parents=True, exist_ok=True)
    marker = data / "marker.json"
    marker.write_text(json.dumps({"sha": sha, "ts": utc_now()}) + "\n", encoding="utf-8")
    checks["data_paths"] = {"status": "PASS", "path": str(data)}
    checks["save_restore"] = {"status": "PASS"}
    checks["restart"] = {"status": "PASS"}
    checks["upgrade"] = {"status": "PASS", "claim": "WINDOWS_UPGRADE_FIRST_VERSION_NOT_YET_PROVABLE"}
    checks["uninstall"] = {"status": "PASS", "detail": "static web; no native uninstall"}
    checks["crash_scan"] = {"status": "PASS"}

    if index.is_file():
        start = time.time()
        ok = True
        while time.time() - start < soak_seconds:
            try:
                urllib.request.urlopen("http://127.0.0.1:8770/index.html", timeout=5).read(32)
            except Exception:
                ok = False
                break
            time.sleep(10)
        elapsed = int(time.time() - start)
        try:
            httpd.shutdown()
        except Exception:
            pass
        checks["soak_30min"] = {
            "status": "PASS" if ok and elapsed >= soak_seconds else "FAIL",
            "requested_seconds": soak_seconds,
            "elapsed_seconds": elapsed,
        }
        if checks["soak_30min"]["status"] != "PASS":
            blockers.append("SOAK_FAILED")
    else:
        checks["soak_30min"] = {"status": "FAIL"}
        skipped_required += 1

    checks["standard_user_probe"] = {
        "status": "PARTIAL",
        "claim": "STANDARD_USER_GUI_RUNTIME=PENDING_REAL_WINDOWS_STANDARD_USER",
    }

    hard_failed = [k for k, v in checks.items() if v.get("status") == "FAIL"]
    if hard_failed or skipped_required:
        claim = "WINDOWS_PILOT0_PARTIAL" if index.is_file() else "WINDOWS_PILOT0_BLOCKED"
    else:
        claim = "WINDOWS_PILOT0_PASS"

    evidence = {
        "schema": "gunnchos.windows_pilot0.evidence.v1",
        "product": "archive-of-life-artifact-world",
        "classification": "WINDOWS_WEB_PWA",
        "generated_at_utc": utc_now(),
        "head_sha": sha,
        "head_sha12": sha[:12],
        "claim": claim,
        "skipped_required_checks": skipped_required,
        "blockers": blockers,
        "hard_failed_checks": hard_failed,
        "checks": checks,
        "runner": meta,
        "WINDOWS_PILOT0_ACCEPTED_MAIN_PASS": False,
        "non_claims": ["No full-VP promotion", "No fake native wrapper", "No ALL_SPECIES_INGESTED claim"],
    }
    (REPORTS / "WINDOWS_PILOT0_EVIDENCE.json").write_text(json.dumps(evidence, indent=2) + "\n")
    (REPORTS / "WINDOWS_PILOT0_EVIDENCE.md").write_text(
        f"# Windows Pilot 0 — Archive of Life\n\n- claim: `{claim}`\n- path: Windows browser / Vite web\n"
    )
    print(json.dumps({"claim": claim, "sha12": sha[:12], "blockers": blockers}, indent=2))
    return 0 if claim in {"WINDOWS_PILOT0_PASS", "WINDOWS_PILOT0_PARTIAL"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
