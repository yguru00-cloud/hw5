# Campus Customs Multi-Agent Operations

A small agentic team that runs a campus merch shop. Open tickets (a customer order, a rent notice, a discount request) land on a board. Five AI agents read them, hand work to each other, and prepare payments, and a human watches them work and approves any payment.

It has three pieces:

| Piece | Folder | What it is |
|---|---|---|
| MCP server | `mcp_server/` | FastMCP server with 15 tools over the shop database (`data/campus_customs_new.db`) |
| Backend | `backend/` | FastAPI app with a PydanticAI team: Boss, Inventory, Accounting, Facilities, Customer Service |
| Dashboard | `frontend/` | React + Vite + TypeScript board to pick tickets, watch the agents, and approve payments |

Every agent uses only the `gpt-6-luna` model, called through Portkey with your `PORTKEY_API_KEY`. No payment is ever made without a human approving it, and nothing is emailed: customer messages stay as drafts.

## What you need

- Python 3.11 or newer (built and tested on 3.14)
- Node.js 20 or newer (built and tested on 24)
- A Portkey API key that can call `gpt-6-luna`

## 1. Install

From the project folder:

```bash
python -m venv .venv
```

Activate the virtual environment. On Windows (PowerShell):

```bash
.venv\Scripts\activate
```

On Mac or Linux:

```bash
source .venv/bin/activate
```

Then install the Python packages and the dashboard packages:

```bash
pip install -r requirements.txt
```

```bash
cd frontend && npm install
```

## 2. Add your API key

Copy `.env.example` to `.env` and put your key after `PORTKEY_API_KEY=`. The app looks for `.env` in this folder, or in the folder above it. Never commit `.env` (it is in `.gitignore`).

## 3. The two database files

- `data/campus_customs.db` is the **original**. It is never changed; the MCP server refuses to open it.
- `data/campus_customs_new.db` is the **working copy**. Everything the agents and the dashboard do happens here.

The working copy in this repository is left exactly as it was after the full three-ticket run (checking balance $160.00, all three tickets resolved, two payments made). When you need a clean run, copy the original over the working copy.

Windows (PowerShell):

```bash
Copy-Item data\campus_customs.db data\campus_customs_new.db -Force
```

Mac or Linux:

```bash
cp data/campus_customs.db data/campus_customs_new.db
```

You can also press **Reset desk** on the dashboard, which does the same copy. Do this **before a full three-ticket run**, so the checking balance starts at $3,400.00.

## 4. The MCP server

You usually do not start it yourself: the backend launches it automatically from `.mcp.json` (stdio) when it needs shop data. Claude Code and other MCP clients can also use `.mcp.json` directly.

To run it on its own (it waits for an MCP client on stdin/stdout):

```bash
python mcp_server/server.py
```

Set `CAMPUS_CUSTOMS_DB` to point it at a different copy of the database. The tools are listed in `mcp_server/README.md`.

> **Windows path in `.mcp.json`:** the file uses `"command": ".venv/Scripts/python.exe"`, which is where Windows puts the virtual environment's Python. On Mac or Linux, change it to `".venv/bin/python"`.

## 5. Start the FastAPI backend

From the `backend/` folder, with the virtual environment active:

```bash
cd backend
```

```bash
uvicorn main:app --reload --port 8000
```

It listens on `http://localhost:8000` (the interactive route list is at `http://localhost:8000/docs`). Without activating the environment you can run `..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000` (Windows) instead.

## 6. Start the React board

In a second terminal:

```bash
cd frontend
```

```bash
npm run dev
```

Open `http://localhost:5173`. The board talks to the backend at `http://localhost:8000`; change that with `VITE_API_URL` (see `frontend/.env.example`).

## 7. A full three-ticket run

1. Reset the database (section 3), so checking starts at $3,400.00.
2. Start the backend and the board.
3. On the board, select ticket 101 and press **Start agents**. Wait for it to finish, then do 102 and 103. One ticket runs at a time.
4. When Accounting prepares a payment, it appears under **Needs your signature**. Type your name and press **Approve & pay**. Only this step changes cash.
5. Look at the results: the board, `output/resolved_tickets.json`, and the audit trail.

`output/audit_trail.json` is append-only: every agent step is added and nothing is wiped. The one in this repository holds the real run of all three tickets; set it back to `[]` if you want an empty log before your own run.

## Where to look

| File | What it shows |
|---|---|
| `output/harness.md` | Tables, MCP tools, the five agents, API routes, the dashboard, and safety rules |
| `output/design.md` | The dashboard design choices and why |
| `output/desk_tickets.html` | Expected vs Actual for each ticket, the Cash tab, and the Reflection (open it by double-clicking) |
| `output/resolved_board.html` | One dashboard screenshot per resolved ticket |
| `output/resolved_tickets.json` | Outcome, agent contributions, and human approvals per ticket |
| `output/audit_trail.json` | Every agent step of the real run |
| `output/mcp_smoke.json` | Proof that each of the first three MCP tools works through the coding agent |
| `AI_prompts.md` | The prompts used to build this, one section per problem |

## The result of the full run

Checking balance: $3,400.00 at the start, then -$840.00 (invoice 501, ticket 101) and -$2,400.00 (rent, ticket 102), and $0.00 for ticket 103, ending at $160.00. This equals `cash_accounts` in the working database.

## Known limits

- There is no purchase-order tool, so the agents cannot restock inventory.
- A ticket is marked resolved when its agent run finishes, even if a payment still waits for a human.
- If a port is already in use (8000 or 5173), stop the program that is using it, or the dashboard shows "Backend offline".
