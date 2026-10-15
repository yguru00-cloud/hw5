# Campus Customs Database Harness

Reference for `data/campus_customs.db` (original, read-only) and its working copy `data/campus_customs_new.db` (all tools and the backend write here). SQLite, 9 tables.

"Today" for the shop is `desk.date_today` = **2026-08-31**.

## Tables

### `desk` (1 row)
- **Fields:** `date_today` (TEXT, NOT NULL), `notes` (TEXT)
- **Why it matters:** Holds the shop's "today", which every agent must use to decide what is overdue or due soon.

### `tickets` (3 rows)
- **Fields:** `id` (INTEGER, PK), `type` (TEXT), `requester` (TEXT), `subject` (TEXT), `sku` (TEXT), `size` (TEXT), `qty` (INTEGER), `lease_id` (INTEGER, FK → `leases.id`), `invoice_id` (INTEGER, FK → `invoices.id`), `status` (TEXT), `notes` (TEXT), `created_at` (TEXT)
- **Why it matters:** The work queue the Boss agent reads and routes to the other agents.

### `inventory` (10 rows)
- **Fields:** `sku` (TEXT), `name` (TEXT), `size` (TEXT), `qty` (INTEGER), `location` (TEXT); primary key is (`sku`, `size`)
- **Why it matters:** Stock by SKU and size, which the Inventory agent checks to spot shortfalls.

### `pricing` (4 rows)
- **Fields:** `sku` (TEXT, PK), `unit_cost` (REAL), `list_price` (REAL)
- **Why it matters:** Cost and list price per SKU, which Accounting uses to check margins on discount requests.

### `vendors` (3 rows)
- **Fields:** `id` (INTEGER, PK), `name` (TEXT), `specialty` (TEXT), `lead_days` (INTEGER)
- **Why it matters:** The source of vendor lead times and of who can restock which kind of product.

### `leases` (1 row)
- **Fields:** `id` (INTEGER, PK), `space_name` (TEXT), `landlord` (TEXT), `monthly_rent` (REAL), `next_due` (TEXT), `notes` (TEXT)
- **Why it matters:** Rent amount and due date for the shop space, which the Facilities agent tracks.

### `cash_accounts` (1 row)
- **Fields:** `name` (TEXT, PK), `balance` (REAL), `date` (TEXT)
- **Why it matters:** The available cash that Accounting checks before any payment; the pay tool must refuse if it would go negative.

### `invoices` (1 row)
- **Fields:** `id` (INTEGER, PK), `vendor_id` (INTEGER, FK → `vendors.id`), `amount` (REAL), `due_date` (TEXT), `status` (TEXT), `description` (TEXT)
- **Why it matters:** Unpaid vendor bills; a vendor with an open invoice will not ship new product.

### `payments` (0 rows)
- **Fields:** `id` (INTEGER, PK), `kind` (TEXT), `ref_id` (INTEGER), `amount` (REAL), `account` (TEXT), `paid_at` (TEXT), `approved_by` (TEXT)
- **Why it matters:** The ledger of approved payments; it must be updated whenever a payment is made.

The row counts above are those of the original database. Two more tables exist only in the working copy `data/campus_customs_new.db`; the MCP server creates them on first use, so resetting the database removes them.

### `payment_requests` (working copy only)
- **Fields:** `id` (INTEGER, PK), `kind` (TEXT), `ref_id` (INTEGER), `amount` (REAL), `account` (TEXT), `reason` (TEXT), `requested_by` (TEXT), `status` (TEXT), `created_at` (TEXT), `decided_at` (TEXT), `approved_by` (TEXT)
- **Why it matters:** Where Accounting's prepared payments wait for a human; a request becomes `paid` only when a person approves it.

### `customer_drafts` (working copy only)
- **Fields:** `id` (INTEGER, PK), `ticket_id` (INTEGER), `recipient` (TEXT), `subject` (TEXT), `body` (TEXT), `status` (TEXT), `created_at` (TEXT)
- **Why it matters:** Customer messages stay here as drafts on the board; nothing is ever sent.

## Result of the full run

All three tickets were run on a freshly reset database, in the order 101, 102, 103, with the real `gpt-6-luna` model. Details are in `output/resolved_tickets.json`, `output/desk_tickets.html` (Actual and Cash tabs) and `output/resolved_board.html`.

| Ticket | Outcome | Cash change |
|---|---|---|
| 101 | Order held: tee size S has 0 in stock and Bulldog Print Co will not ship while invoice 501 is unpaid. Payment #1 for invoice 501 was prepared, then approved by a human. A delay note was drafted (not sent). | -$840.00 |
| 102 | Rent for lease 1 ($2,400.00, due 2026-09-02) was prepared, then approved by a human (payment #2). | -$2,400.00 |
| 103 | No price override approved yet (8 of 20 size M hoodies in stock, no target price from the customer). A reply draft was saved (not sent). | $0.00 |

Checking balance: $3,400.00 at the start, $160.00 at the end ($3,400.00 - $840.00 - $2,400.00), equal to `cash_accounts` in the working database.

## Agents

Built with PydanticAI in `backend/` (`agents.py`, prompts in `backend/prompts/`, one file per agent). All five agents use only `gpt-6-luna` through Portkey, over the Responses API (`/v1/responses`): the model refuses function tools together with reasoning on `/v1/chat/completions`. Every agent has a `delegate_to_<agent>` tool for each of the other four (full connectivity, limited by a delegation depth).

| Agent | Job | MCP tools it can use |
|---|---|---|
| **Boss** | Reads each ticket, decides who works on it, combines their reports, and makes the final call. | `get_today`, `get_ticket`, `list_open_tickets` |
| **Inventory** | Checks stock by SKU and size, finds shortfalls, and finds which vendor can restock and how fast. | `get_today`, `get_ticket`, `get_inventory`, `get_vendors`, `get_sku_pricing`, `get_invoice_status` |
| **Accounting** | Watches cash and invoices, checks margins, and queues payments for human approval. | `get_today`, `get_ticket`, `get_cash_balance`, `get_invoice_status`, `get_lease_rent_due`, `get_sku_pricing`, `get_vendors`, `prepare_payment` |
| **Facilities** | Handles the shop lease: rent amount, due date, and urgency. | `get_today`, `get_ticket`, `get_lease_rent_due`, `get_cash_balance` |
| **Customer Service** | Drafts customer messages; drafts stay on the board and are never sent. | `get_today`, `get_ticket`, `save_customer_draft` |

`pay` is deliberately in no agent's tool list: it is the human-approval step. The backend-only tools (`pay`, `list_tickets`, `list_pending_payments`, `set_ticket_status`) are reached only through the dashboard routes.

## MCP tools

Served by `mcp_server/server.py` (FastMCP) over `data/campus_customs_new.db`. Shop facts reach the agents only through these tools; there is no second shop-tools layer. Tools marked (new) were added for the agent team. `payment_requests` and `customer_drafts` are board tables that the server creates on first use inside the working copy only, so resetting the database from the original removes them.

### `get_invoice_status`
- **Table read:** `invoices` (joined with `vendors`)
- **Unlocks ticket:** 101
- **Why this tool:** Ticket 101's size-S tee can only be restocked if its vendor will ship, and this tool returns invoice 501's status and due date plus the vendor's lead time, which show whether the open unpaid invoice is blocking that vendor.

### `get_lease_rent_due`
- **Table read:** `leases`
- **Unlocks ticket:** 102
- **Why this tool:** Ticket 102 is a rent notice, and this tool returns lease 1's monthly rent and next_due date, which are the two facts needed to decide how much to pay and how urgent it is.

### `get_sku_pricing`
- **Table read:** `pricing`
- **Unlocks ticket:** 103
- **Why this tool:** Ticket 103 asks for a bulk discount on CC-HOOD-NAVY, and this tool returns its unit_cost and list_price, which set the floor and ceiling for any discount that keeps a margin.

### `get_today` (new)
- **Table read:** `desk`
- **Helps tickets:** 101, 102, 103
- **Why this tool:** `desk.date_today` is the shop's "today", the only date that can say whether invoice 501 is overdue and how many days are left before the lease 1 rent is due.

### `list_open_tickets` (new)
- **Table read:** `tickets`
- **Helps tickets:** 101, 102, 103
- **Why this tool:** The Boss needs the list of open tickets with their `invoice_id`, `lease_id`, and SKU links to decide which agents each one needs.

### `get_ticket` (new)
- **Table read:** `tickets`
- **Helps tickets:** 101, 102, 103
- **Why this tool:** Any agent can read one ticket's requester, SKU/size/quantity, and linked invoice or lease instead of relying on a possibly incomplete delegated task.

### `get_inventory` (new)
- **Table read:** `inventory`
- **Helps tickets:** 101, 103
- **Why this tool:** Ticket 101 needs to know that CC-TEE-WHITE size S has 0 in stock, and ticket 103 needs to know that CC-HOOD-NAVY size M has 8 against a request for 20.

### `get_vendors` (new)
- **Tables read:** `vendors`, `invoices`
- **Helps tickets:** 101, 103
- **Why this tool:** It shows which vendor can restock apparel, its lead time, and whether it has an open unpaid invoice that stops it from shipping, which decides whether tickets 101 and 103 can be restocked at all.

### `get_cash_balance` (new)
- **Table read:** `cash_accounts`
- **Helps tickets:** 101, 102
- **Why this tool:** Paying invoice 501 ($840) and the lease 1 rent ($2,400) both come out of the same checking balance, and this tool shows whether cash covers them and what is left.

### `prepare_payment` (new)
- **Tables read:** `invoices`, `leases`, `cash_accounts`; **table written:** `payment_requests`
- **Helps tickets:** 101 (pay invoice 501), 102 (pay the rent)
- **Why this tool:** It queues a payment for a person to approve, takes the amount from the database instead of from the agent, and refuses when cash is not enough, so Accounting can prepare payments without being able to make them.

### `pay` (new, human approval only)
- **Tables written:** `payments`, `cash_accounts`, `invoices` (status becomes `paid`), `leases` (next_due moves one month), `payment_requests`
- **Helps tickets:** 101, 102, once a person approves
- **Why this tool:** It is the only tool that moves money; it needs a named human approver, refuses when cash is not enough (no negative balances), and updates every table the payment touches. No agent has it.

### `save_customer_draft` (new)
- **Tables read:** `tickets`; **table written:** `customer_drafts`
- **Helps tickets:** 101 (delay notice to the customer), 103 (answer to the discount request)
- **Why this tool:** It stores the customer message as a draft on the board and sends nothing, which is how Customer Service answers a customer without emailing anyone.

### `list_tickets` (new, backend only)
- **Table read:** `tickets`
- **Used by:** the dashboard route `GET /tickets`
- **Why this tool:** The board must show all three tickets with their status (open or resolved), while `list_open_tickets` only returns the open ones.

### `list_pending_payments` (new, backend only)
- **Table read:** `payment_requests`
- **Used by:** the dashboard route `GET /approvals`
- **Why this tool:** A human can only approve a payment they can see, so the dashboard lists the requests that Accounting queued with `prepare_payment`.

### `set_ticket_status` (new, backend only)
- **Table written:** `tickets`
- **Used by:** the backend when an agent run finishes (marks the ticket `resolved`)
- **Why this tool:** Ticket status lives in the database, so the backend changes it through MCP instead of writing to the database itself.

## Backend routes

FastAPI app in `backend/main.py`. Start it from the `backend/` folder with `uvicorn main:app --reload --port 8000`; it listens on `http://localhost:8000`. Shop data goes through the MCP server above, and the React dashboard (allowed by CORS on ports 5173 and 3000) calls these routes.

- `GET http://localhost:8000/tickets` - the three tickets with their status (open or resolved) and the state of any agent run on them.
- `POST http://localhost:8000/tickets/{ticket_id}/run` - starts the agent team on that ticket in the background and returns right away (409 if a run is already going or the ticket is resolved).
- `GET http://localhost:8000/events` - recent agent events (steps, tool calls, delegations, final answers) from the audit trail, oldest first; optional `limit` and `ticket_id`.
- `GET http://localhost:8000/approvals` - payment requests that agents prepared and that are waiting for a human to approve.
- `POST http://localhost:8000/approvals/{request_id}/approve` - a human approves one prepared payment (body: `approved_by`); this is the only route that changes cash.
- `GET http://localhost:8000/cash` - the current checking balance from `cash_accounts`.
- `POST http://localhost:8000/reset` - copies `data/campus_customs.db` over `data/campus_customs_new.db` (refused while a run is going; the audit trail is kept).

## Dashboard

The dashboard lives in `frontend/` (React + Vite + TypeScript) and starts with `npm run dev` on `http://localhost:5173`, the origin the backend allows in CORS. It has no shop data of its own and never touches the database: everything goes through the backend routes above. The backend address is kept in one place (`src/api.ts`, `VITE_API_URL`, default `http://localhost:8000`). The design choices are explained in `output/design.md`.

**How data flows.** `src/App.tsx` refreshes every 2 seconds with `GET /tickets`, `GET /approvals`, `GET /cash`, and `GET /events` for the selected ticket. Actions call `POST /tickets/{id}/run`, `POST /approvals/{id}/approve` (with the approver's name), and `POST /reset`. Everything the agents say and do on screen is built from the audit-trail records returned by `/events`; `src/events.ts` picks the latest run, finds who is working now, and collects the delegations. A link such as `/?ticket=101` opens that ticket directly.

| Piece | File | What it does |
|---|---|---|
| Order board | `components/TicketBoard.tsx` | Paper slips with a "Start agents" button; resolved slips get a RESOLVED stamp and move to the done shelf |
| Delegation map | `components/DelegationMap.tsx` | Five desks; arrows for handoffs, and a paper slip flies along the newest one |
| Live feed | `components/LiveFeed.tsx` | Speech bubbles per agent, tool-call receipts, and "DRAFT - NOT SENT" cards |
| Approvals | `components/ApprovalPanel.tsx` | Cheques that need the approver's name; disabled when cash is not enough |
| Cash register | `components/CashRegister.tsx` | The checking balance with rolling digits and a "-$amount" tag |
| Ticket summary | `components/SummaryPanel.tsx` | The Boss's final call and a short card per agent |
| Staff | `agents.tsx`, `avatars.tsx` | Names, colors, role icons, bubble shapes, and the five animal drawings |

## Known limits

- **No purchase-order tool.** Accounting can only prepare payments for invoices and leases (`prepare_payment`). Restocking, such as buying 12 more hoodies for ticket 103, is not handled by the agents, so no purchase was ever attempted or refused. It would have cost 12 x $22.00 = $264.00, more than the $160.00 left after the rent.
- **"Resolved" means the run finished.** A ticket is marked resolved when its agent run ends, even if a payment is still waiting for a human or the answer is "ask the customer". Cash moves later, when a person approves.
- **Little spoken text.** While calling tools, the model writes almost no text, so the live feed shows mostly tool receipts, delegation tasks, and final reports.
- **One run at a time.** The backend runs one ticket at a time, and a resolved ticket cannot be run again until the database is reset.

## Audit trail

Every agent-loop step is appended (never overwritten) to `output/audit_trail.json` as a JSON list. One loop step is one model response: it gets an `agent_step` record (step number, the model's text, the tool calls it asked for, and the running token usage), followed by a `tool_call` or `delegation` record for each action it triggers, and a `final_answer` record when the agent finishes. Each record has: `timestamp`, `ticket_id`, `agent`, `depth`, `step_type` (`agent_step`, `tool_call`, `delegation`, or `final_answer`), `step`, `model_text`, `requested_calls`, `tool_name`, `arguments`, `result`, `delegation_target`, `error`, and `usage`.

## Safety

**Real money**
- Every payment needs human approval. Agents can only call `prepare_payment`, which queues a request and moves no money; `pay` needs a named human approver and is in no agent's tool list.
- The server refuses a payment when cash is not enough, both when it is queued and when it is paid, so a balance can never go negative. Cash only goes out; no revenue is modeled.
- Payment amounts come from the database (invoice amount or monthly rent), never from the agent, and a second request for the same invoice or lease is refused while one is pending.
- The only route that changes cash is `POST /approvals/{request_id}/approve`; it needs the approver's name and calls the MCP `pay` tool, which re-checks the cash balance.
- After a payment, the `payments` table, the cash balance, and the invoice or lease are updated together in one transaction.

**Real customers and vendors**
- Nothing is emailed and no real vendor is contacted. Customer messages are saved as drafts on the board with `save_customer_draft`.
- Customer Service may only state facts that other agents confirmed from the database, and never reveals cash, margins, or supplier details.

**Data**
- Agents get shop facts only through the MCP tools. The MCP server refuses to open `data/campus_customs.db`; it works only on `data/campus_customs_new.db`, which is reset from the original before a full run.
- `PORTKEY_API_KEY` comes from the `.env` file and is never written into source files.

**Token and cost limits** (set in `backend/config.py`)
- Only `gpt-6-luna` is used, for every agent.
- Delegation depth is limited to 3; a deeper delegation is refused and logged.
- Each ticket run has a shared budget of 40 model requests and 150,000 tokens across all agents.
- Tool results are cut to 4,000 characters and delegated task text to 2,000 characters.
