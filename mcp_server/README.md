# Campus Customs MCP Server

This MCP server (built with FastMCP) is how the Campus Customs agents read and change real shop data.
Every agent in the backend uses these tools, and there is no other path to the shop data.

## Database

It uses `data/campus_customs_new.db`, the working copy of the shop database.
The original `data/campus_customs.db` is the reset source: the server refuses to open it.
Set `CAMPUS_CUSTOMS_DB` to point the server at a different copy (for example for tests).

## Tools

| Tool | Reads | Writes | What it does |
|---|---|---|---|
| `get_invoice_status` | `invoices`, `vendors` | | Invoice amount, due date, status, and the vendor's lead time |
| `get_lease_rent_due` | `leases` | | Monthly rent and next due date for a lease |
| `get_sku_pricing` | `pricing` | | Unit cost and list price for a SKU |
| `get_today` | `desk` | | The shop's "today" (`date_today`) |
| `list_open_tickets` | `tickets` | | All open tickets |
| `get_ticket` | `tickets` | | One ticket with its linked invoice, lease, and SKU |
| `get_inventory` | `inventory` | | Stock by SKU and size |
| `get_vendors` | `vendors`, `invoices` | | Vendors with lead times and their open invoices |
| `get_cash_balance` | `cash_accounts` | | Balance of a cash account |
| `prepare_payment` | `invoices`, `leases`, `cash_accounts` | `payment_requests` | Queues a payment for human approval; moves no money; refuses if cash is short |
| `pay` | `payment_requests`, `cash_accounts` | `payments`, `cash_accounts`, `invoices`, `leases`, `payment_requests` | Executes an approved payment; needs a named human approver; refuses if cash is short. Agents do not get this tool |
| `save_customer_draft` | `tickets` | `customer_drafts` | Saves a customer message as a draft on the board; nothing is sent |
| `list_tickets` | `tickets` | | All tickets with their status; used by the dashboard backend, not by agents |
| `list_pending_payments` | `payment_requests` | | Payment requests waiting for human approval; used by the dashboard backend |
| `set_ticket_status` | | `tickets` | Marks a ticket `open` or `resolved`; used by the backend when a run finishes |

`payment_requests` and `customer_drafts` are board tables created on first use in the working copy only.
