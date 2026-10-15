"""Campus Customs MCP server backed by data/campus_customs_new.db.

Read tools return real rows from the shop database. Three tools write to the working
copy: prepare_payment (queues a payment for human approval), pay (executes an approved
payment) and save_customer_draft (stores a draft on the board; nothing is ever sent).
"""

import os
import sqlite3
import calendar
from datetime import date, datetime, timezone
from pathlib import Path

from fastmcp import FastMCP

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(
    os.environ.get("CAMPUS_CUSTOMS_DB", ROOT / "data" / "campus_customs_new.db")
).resolve()

# The original database is the reset source and must never be opened by the server.
if DB_PATH.name == "campus_customs.db":
    raise SystemExit("Refusing to use the original campus_customs.db; use the working copy.")

mcp = FastMCP("campus-customs")


# --------------------------------------------------------------------------- helpers
def _connect(write: bool = False) -> sqlite3.Connection:
    mode = "rw" if write else "ro"
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode={mode}", uri=True, isolation_level=None)
    con.row_factory = sqlite3.Row
    return con


def _query_all(sql: str, params: tuple = ()) -> list[dict]:
    con = _connect()
    try:
        return [dict(r) for r in con.execute(sql, params).fetchall()]
    finally:
        con.close()


def _query_one(sql: str, params: tuple = ()) -> dict | None:
    rows = _query_all(sql, params)
    return rows[0] if rows else None


def _today(con: sqlite3.Connection) -> str:
    return con.execute("SELECT date_today FROM desk LIMIT 1").fetchone()["date_today"]


def _add_month(iso_date: str) -> str:
    d = date.fromisoformat(iso_date)
    year, month = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day).isoformat()


def _ensure_agent_tables(con: sqlite3.Connection) -> None:
    """Board tables live only in the working copy and are created on first use."""
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            ref_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            account TEXT NOT NULL,
            reason TEXT,
            requested_by TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            decided_at TEXT,
            approved_by TEXT
        )
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            recipient TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ------------------------------------------------------------------- original tools
@mcp.tool()
def get_invoice_status(invoice_id: int) -> dict:
    """Ticket 101: return an invoice's amount, due date and status together with
    its vendor's name and lead time (invoices joined with vendors)."""
    row = _query_one(
        """
        SELECT i.id AS invoice_id, i.vendor_id, v.name AS vendor_name,
               v.lead_days AS vendor_lead_days, i.amount, i.due_date,
               i.status, i.description
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.id = ?
        """,
        (invoice_id,),
    )
    return row or {"error": f"invoice {invoice_id} not found"}


@mcp.tool()
def get_lease_rent_due(lease_id: int) -> dict:
    """Ticket 102: return a lease's landlord, monthly rent and next due date."""
    row = _query_one(
        """
        SELECT id AS lease_id, space_name, landlord, monthly_rent, next_due, notes
        FROM leases
        WHERE id = ?
        """,
        (lease_id,),
    )
    return row or {"error": f"lease {lease_id} not found"}


@mcp.tool()
def get_sku_pricing(sku: str) -> dict:
    """Ticket 103: return a SKU's unit cost and list price."""
    row = _query_one(
        "SELECT sku, unit_cost, list_price FROM pricing WHERE sku = ?",
        (sku,),
    )
    return row or {"error": f"sku {sku} not found"}


# ----------------------------------------------------------------- read-only tools
@mcp.tool()
def get_today() -> dict:
    """Return the shop's 'today' (desk.date_today). Use it to decide what is overdue."""
    row = _query_one("SELECT date_today, notes FROM desk LIMIT 1")
    return row or {"error": "desk table is empty"}


@mcp.tool()
def list_open_tickets() -> dict:
    """List every ticket whose status is 'open' (id, type, requester, subject, sku, size,
    qty, lease_id, invoice_id, notes, created_at)."""
    return {
        "tickets": _query_all(
            "SELECT id, type, requester, subject, sku, size, qty, lease_id, invoice_id, "
            "status, notes, created_at FROM tickets WHERE status = 'open' ORDER BY id"
        )
    }


@mcp.tool()
def get_ticket(ticket_id: int) -> dict:
    """Return one ticket with all of its fields, including the lease_id / invoice_id it links to."""
    row = _query_one("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    return row or {"error": f"ticket {ticket_id} not found"}


@mcp.tool()
def get_inventory(sku: str | None = None, size: str | None = None) -> dict:
    """Return stock rows (sku, name, size, qty, location). Filter by sku and/or size;
    with no filters every row is returned."""
    clauses, params = [], []
    if sku:
        clauses.append("sku = ?")
        params.append(sku)
    if size:
        clauses.append("size = ?")
        params.append(size)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return {
        "items": _query_all(
            f"SELECT sku, name, size, qty, location FROM inventory {where} ORDER BY sku, size",
            tuple(params),
        )
    }


@mcp.tool()
def get_vendors() -> dict:
    """Return every vendor (id, name, specialty, lead_days) with its open invoices
    (open_invoice_ids, open_invoice_count, open_invoice_total). A vendor with an open
    unpaid invoice will not ship new product."""
    vendors = _query_all("SELECT id, name, specialty, lead_days FROM vendors ORDER BY id")
    invoices = _query_all("SELECT id, vendor_id, amount FROM invoices WHERE status = 'open'")
    for v in vendors:
        open_inv = [i for i in invoices if i["vendor_id"] == v["id"]]
        v["open_invoice_ids"] = [i["id"] for i in open_inv]
        v["open_invoice_count"] = len(open_inv)
        v["open_invoice_total"] = sum(i["amount"] for i in open_inv)
    return {"vendors": vendors}


@mcp.tool()
def get_cash_balance(account: str = "checking") -> dict:
    """Return a cash account's balance and the date of that balance."""
    row = _query_one("SELECT name, balance, date FROM cash_accounts WHERE name = ?", (account,))
    return row or {"error": f"cash account {account} not found"}


@mcp.tool()
def list_tickets() -> dict:
    """List every ticket with its status ('open' or 'resolved'), for the dashboard board."""
    return {
        "tickets": _query_all(
            "SELECT id, type, requester, subject, sku, size, qty, lease_id, invoice_id, "
            "status, notes, created_at FROM tickets ORDER BY id"
        )
    }


@mcp.tool()
def list_pending_payments() -> dict:
    """List payment requests that are waiting for human approval (queued by prepare_payment)."""
    exists = _query_one("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payment_requests'")
    if not exists:
        return {"payment_requests": []}
    return {
        "payment_requests": _query_all(
            "SELECT id, kind, ref_id, amount, account, reason, requested_by, status, created_at "
            "FROM payment_requests WHERE status = 'pending_approval' ORDER BY id"
        )
    }


# ------------------------------------------------------------------- writing tools
@mcp.tool()
def prepare_payment(
    kind: str,
    ref_id: int,
    reason: str,
    requested_by: str = "accounting",
    account: str = "checking",
) -> dict:
    """Queue a payment for HUMAN approval; this does NOT move any money.
    kind is 'invoice' or 'lease'; ref_id is the invoice or lease id. The amount is read
    from the database (invoice amount or monthly rent), never supplied by the caller.
    Refuses if the invoice is not open, the item does not exist, a request is already
    pending, or the account cannot cover the amount."""
    if kind not in ("invoice", "lease"):
        return {"error": "kind must be 'invoice' or 'lease'"}
    if kind == "invoice":
        item = _query_one("SELECT amount, status FROM invoices WHERE id = ?", (ref_id,))
        if not item:
            return {"error": f"invoice {ref_id} not found"}
        if item["status"] != "open":
            return {"error": f"invoice {ref_id} is not open (status: {item['status']})"}
        amount = item["amount"]
    else:
        item = _query_one("SELECT monthly_rent FROM leases WHERE id = ?", (ref_id,))
        if not item:
            return {"error": f"lease {ref_id} not found"}
        amount = item["monthly_rent"]

    con = _connect(write=True)
    try:
        _ensure_agent_tables(con)
        con.execute("BEGIN IMMEDIATE")
        acct = con.execute("SELECT balance FROM cash_accounts WHERE name = ?", (account,)).fetchone()
        if not acct:
            con.execute("ROLLBACK")
            return {"error": f"cash account {account} not found"}
        if acct["balance"] < amount:
            con.execute("ROLLBACK")
            return {
                "error": "insufficient cash",
                "balance": acct["balance"],
                "amount": amount,
            }
        dup = con.execute(
            "SELECT id FROM payment_requests WHERE kind = ? AND ref_id = ? AND status = 'pending_approval'",
            (kind, ref_id),
        ).fetchone()
        if dup:
            con.execute("ROLLBACK")
            return {"error": f"a payment request for {kind} {ref_id} is already pending", "request_id": dup["id"]}
        cur = con.execute(
            "INSERT INTO payment_requests (kind, ref_id, amount, account, reason, requested_by, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', ?)",
            (kind, ref_id, amount, account, reason, requested_by, _now()),
        )
        con.execute("COMMIT")
        return {
            "request_id": cur.lastrowid,
            "status": "pending_approval",
            "kind": kind,
            "ref_id": ref_id,
            "amount": amount,
            "account": account,
            "cash_balance": acct["balance"],
            "cash_after_payment": acct["balance"] - amount,
            "note": "Nothing was paid. A human must approve this request first.",
        }
    finally:
        con.close()


@mcp.tool()
def pay(request_id: int, approved_by: str) -> dict:
    """Execute a payment request that a HUMAN has approved (not for agents).
    Refuses without an approver name, for an unknown or already-decided request, or when
    the account cannot cover the amount (no negative balances). On success it records the
    payment, lowers the cash balance, marks an invoice 'paid' or moves a lease's next_due
    forward one month."""
    if not approved_by or not approved_by.strip():
        return {"error": "refused: a named human approver (approved_by) is required"}
    con = _connect(write=True)
    try:
        _ensure_agent_tables(con)
        con.execute("BEGIN IMMEDIATE")
        req = con.execute("SELECT * FROM payment_requests WHERE id = ?", (request_id,)).fetchone()
        if not req:
            con.execute("ROLLBACK")
            return {"error": f"payment request {request_id} not found"}
        if req["status"] != "pending_approval":
            con.execute("ROLLBACK")
            return {"error": f"payment request {request_id} is already {req['status']}"}
        acct = con.execute("SELECT balance FROM cash_accounts WHERE name = ?", (req["account"],)).fetchone()
        if not acct or acct["balance"] < req["amount"]:
            con.execute("ROLLBACK")
            return {
                "error": "refused: insufficient cash",
                "balance": acct["balance"] if acct else None,
                "amount": req["amount"],
            }
        today = _today(con)
        con.execute(
            "INSERT INTO payments (kind, ref_id, amount, account, paid_at, approved_by) VALUES (?, ?, ?, ?, ?, ?)",
            (req["kind"], req["ref_id"], req["amount"], req["account"], today, approved_by.strip()),
        )
        new_balance = acct["balance"] - req["amount"]
        con.execute(
            "UPDATE cash_accounts SET balance = ?, date = ? WHERE name = ?",
            (new_balance, today, req["account"]),
        )
        if req["kind"] == "invoice":
            con.execute("UPDATE invoices SET status = 'paid' WHERE id = ?", (req["ref_id"],))
        else:
            row = con.execute("SELECT next_due FROM leases WHERE id = ?", (req["ref_id"],)).fetchone()
            con.execute("UPDATE leases SET next_due = ? WHERE id = ?", (_add_month(row["next_due"]), req["ref_id"]))
        con.execute(
            "UPDATE payment_requests SET status = 'paid', decided_at = ?, approved_by = ? WHERE id = ?",
            (_now(), approved_by.strip(), request_id),
        )
        con.execute("COMMIT")
        return {
            "request_id": request_id,
            "status": "paid",
            "kind": req["kind"],
            "ref_id": req["ref_id"],
            "amount": req["amount"],
            "paid_at": today,
            "approved_by": approved_by.strip(),
            "cash_balance": new_balance,
        }
    finally:
        con.close()


@mcp.tool()
def save_customer_draft(ticket_id: int, recipient: str, subject: str, body: str) -> dict:
    """Save a customer message as a DRAFT on the board. Nothing is emailed or sent."""
    if not _query_one("SELECT id FROM tickets WHERE id = ?", (ticket_id,)):
        return {"error": f"ticket {ticket_id} not found"}
    con = _connect(write=True)
    try:
        _ensure_agent_tables(con)
        cur = con.execute(
            "INSERT INTO customer_drafts (ticket_id, recipient, subject, body, status, created_at) "
            "VALUES (?, ?, ?, ?, 'draft', ?)",
            (ticket_id, recipient, subject, body, _now()),
        )
        return {
            "draft_id": cur.lastrowid,
            "ticket_id": ticket_id,
            "status": "draft",
            "note": "Saved on the board only. No message was sent.",
        }
    finally:
        con.close()


@mcp.tool()
def set_ticket_status(ticket_id: int, status: str) -> dict:
    """Mark a ticket 'open' or 'resolved' (used by the backend when a run finishes; not an agent tool)."""
    if status not in ("open", "resolved"):
        return {"error": "status must be 'open' or 'resolved'"}
    con = _connect(write=True)
    try:
        cur = con.execute("UPDATE tickets SET status = ? WHERE id = ?", (status, ticket_id))
        if cur.rowcount == 0:
            return {"error": f"ticket {ticket_id} not found"}
        return {"ticket_id": ticket_id, "status": status}
    finally:
        con.close()


if __name__ == "__main__":
    mcp.run()
