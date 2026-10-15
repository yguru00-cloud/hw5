"""Append-only audit trail for agent-loop steps (output/audit_trail.json)."""

import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

from backend.config import ROOT
from backend.models import AuditRecord

# CAMPUS_AUDIT_PATH lets tests write somewhere else; normal runs use output/audit_trail.json.
AUDIT_PATH = os.environ.get("CAMPUS_AUDIT_PATH") or str(ROOT / "output" / "audit_trail.json")
_lock = threading.Lock()


def _read_records() -> list[dict]:
    # On Windows (especially inside a OneDrive folder) another process can hold the file for a
    # moment, so a refused read or replace is retried instead of failing the whole agent run.
    for attempt in range(20):
        try:
            with open(AUDIT_PATH, encoding="utf-8") as f:
                text = f.read().strip()
            break
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(0.05)
    if not text:
        return []
    records = json.loads(text)  # a corrupt file raises instead of being silently wiped
    if not isinstance(records, list):
        raise ValueError(f"{AUDIT_PATH} must contain a JSON list")
    return records


def _write_records(records: list[dict]) -> None:
    data = json.dumps(records, indent=2, ensure_ascii=False, default=str) + "\n"
    tmp = AUDIT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(data)
    for _ in range(20):
        try:
            os.replace(tmp, AUDIT_PATH)
            return
        except PermissionError:
            time.sleep(0.05)
    # Still locked: write the file in place rather than losing the record or failing the run.
    with open(AUDIT_PATH, "w", encoding="utf-8") as f:
        f.write(data)
    try:
        os.remove(tmp)
    except OSError:
        pass


def read_trail() -> list[dict]:
    """All audit records (used by the /events route); waits for any write in progress."""
    if not os.path.exists(AUDIT_PATH):
        return []
    with _lock:
        return _read_records()


def ensure_audit_file() -> None:
    """Create the file with an empty list only if it is missing; never overwrite it."""
    os.makedirs(os.path.dirname(AUDIT_PATH), exist_ok=True)
    with _lock:
        if not os.path.exists(AUDIT_PATH):
            with open(AUDIT_PATH, "w", encoding="utf-8") as f:
                f.write("[]\n")


def log_step(
    *,
    ticket_id: int,
    agent: str,
    depth: int,
    step_type: str,
    step: int | None = None,
    model_text: str | None = None,
    requested_calls: list[dict[str, Any]] | None = None,
    tool_name: str | None = None,
    arguments: dict[str, Any] | None = None,
    result: Any = None,
    delegation_target: str | None = None,
    error: str | None = None,
    usage: dict[str, int] | None = None,
) -> None:
    """Append one record to the audit trail."""
    record = AuditRecord(
        timestamp=datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        ticket_id=ticket_id,
        agent=agent,
        depth=depth,
        step_type=step_type,  # type: ignore[arg-type]
        step=step,
        model_text=model_text,
        requested_calls=requested_calls,
        tool_name=tool_name,
        arguments=arguments,
        result=result,
        delegation_target=delegation_target,
        error=error,
        usage=usage,
    ).model_dump(mode="json")
    ensure_audit_file()
    with _lock:
        records = _read_records()
        records.append(record)
        _write_records(records)
