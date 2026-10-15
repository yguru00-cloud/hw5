"""FastAPI backend for the Campus Customs dashboard.

Start it from the backend/ folder:  uvicorn main:app --reload --port 8000
All shop data goes through the MCP server; the routes never open the shop database themselves
(except /reset, which copies the original file over the working copy).
"""

import asyncio
import os
import shutil
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

# Make `backend.*` importable when uvicorn is started from inside backend/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, StringConstraints

from backend.agents import Team
from backend.audit import read_trail
from backend.config import DB_ORIGINAL, DB_WORKING
from backend.mcp_client import ShopClient

shop = ShopClient()

# In-memory state of agent runs, keyed by ticket id. A ticket is "resolved" in the database
# once its run finishes; the run's own status is reported next to it.
runs: dict[int, dict[str, Any]] = {}


def make_team() -> Team:
    return Team()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _busy() -> bool:
    return any(r["status"] == "running" for r in runs.values())


@asynccontextmanager
async def lifespan(app: FastAPI):
    await shop.start()
    try:
        yield
    finally:
        await shop.stop()


app = FastAPI(title="Campus Customs Operations", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ApproveBody(BaseModel):
    approved_by: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


# ------------------------------------------------------------------------------ tickets
@app.get("/tickets")
async def get_tickets() -> dict[str, Any]:
    """The tickets with their status (open or resolved) and the state of any agent run."""
    data = await shop.call("list_tickets")
    tickets = []
    for t in data["tickets"]:
        run = runs.get(t["id"])
        tickets.append({**t, "run_status": run["status"] if run else "idle", "run": run})
    return {"tickets": tickets}


@app.post("/tickets/{ticket_id}/run", status_code=202)
async def run_ticket(ticket_id: int) -> dict[str, Any]:
    """Start the agent team on one ticket in the background and return right away."""
    if not os.environ.get("PORTKEY_API_KEY"):
        raise HTTPException(503, "PORTKEY_API_KEY is not set, so the agents cannot call the model.")
    if _busy():
        raise HTTPException(409, "An agent run is already in progress.")
    tickets = (await shop.call("list_tickets"))["tickets"]
    ticket = next((t for t in tickets if t["id"] == ticket_id), None)
    if ticket is None:
        raise HTTPException(404, f"Ticket {ticket_id} not found.")
    if ticket["status"] != "open":
        raise HTTPException(409, f"Ticket {ticket_id} is already {ticket['status']}; reset the database to run it again.")

    runs[ticket_id] = {"status": "running", "started_at": _now(), "finished_at": None, "error": None, "resolution": None}
    asyncio.create_task(_run_in_background(ticket_id))
    return {"ticket_id": ticket_id, "run_status": "running"}


async def _run_in_background(ticket_id: int) -> None:
    run = runs[ticket_id]
    try:
        resolution = await make_team().resolve_ticket(ticket_id)
        result = await shop.call("set_ticket_status", {"ticket_id": ticket_id, "status": "resolved"})
        if "error" in result:
            raise RuntimeError(result["error"])
        run.update(status="done", resolution=resolution.model_dump(mode="json"))
    except Exception as exc:  # the ticket stays open so it can be retried
        run.update(status="error", error=f"{type(exc).__name__}: {exc}")
    finally:
        run["finished_at"] = _now()


# ------------------------------------------------------------------------------- events
@app.get("/events")
async def get_events(
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    ticket_id: int | None = None,
) -> dict[str, Any]:
    """Recent agent events (each loop step, tool call, delegation and final answer), oldest first."""
    try:
        records = await asyncio.to_thread(read_trail)
    except (OSError, ValueError) as exc:  # a locked or half-written file: the board retries in 2 seconds
        raise HTTPException(503, f"The audit trail is busy right now ({type(exc).__name__}). Retrying.")
    if ticket_id is not None:
        records = [r for r in records if r.get("ticket_id") == ticket_id]
    return {"total": len(records), "events": records[-limit:]}


# ---------------------------------------------------------------------- approvals & cash
@app.get("/approvals")
async def get_approvals() -> dict[str, Any]:
    """Payment requests that agents prepared and that are waiting for a human to approve."""
    return await shop.call("list_pending_payments")


@app.post("/approvals/{request_id}/approve")
async def approve_payment(request_id: int, body: ApproveBody) -> dict[str, Any]:
    """A human approves a prepared payment; this is the only route that changes cash (via the MCP pay tool)."""
    result = await shop.call("pay", {"request_id": request_id, "approved_by": body.approved_by})
    if "error" in result:
        raise HTTPException(404 if "not found" in result["error"] else 409, result["error"])
    return result


@app.get("/cash")
async def get_cash() -> dict[str, Any]:
    """The current checking balance from cash_accounts."""
    result = await shop.call("get_cash_balance", {"account": "checking"})
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


# ------------------------------------------------------------------------------- reset
@app.post("/reset")
async def reset_database() -> dict[str, Any]:
    """Copy the original database over the working copy. The audit trail is kept (append-only)."""
    if _busy():
        raise HTTPException(409, "An agent run is in progress; wait for it to finish before resetting.")
    if DB_WORKING.resolve() == DB_ORIGINAL.resolve():
        raise HTTPException(500, "The working database path points at the original file; refusing to reset.")
    shutil.copyfile(DB_ORIGINAL, DB_WORKING)
    runs.clear()
    return {"status": "reset", "database": DB_WORKING.name, "cash": await shop.call("get_cash_balance", {"account": "checking"})}
