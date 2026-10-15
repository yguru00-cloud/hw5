# AI Prompts

Prompts typed to the vibe coder, recorded per problem.

## Problem 1: Create AI_prompts.md to Record Prompts

```
I wanna make AI_prompts.md where all the prompts I typed are recorded
Make one section for each problem(problem 1 to 11) and each section includes the problem number and title
Write the title based on its content
This is Problem1
```
## Problem 2: Inspect the Database and Document Tables in harness.md

```
Problem2

Here's what needs to be done:
1. Open and inspect 'data/campus_customs.db'. Copy this file to 'data/campus_customs_new.db' so that future working updates happen on the copy.
2. Examine all tables and fields in the database.
3. Inspect the three open tickets in the 'tickets' table to understand how they link to other tables in the schema.
4. Create or initialize a markdown file at 'output/harness.md'.
5. In 'output/harness.md', document every table in the database by listing:
   - All fields (columns) for each table.
   - A short one-line explanation of why that table matters for the multi-agent operations team.
```

## Problem 3: Build a FastMCP Server with Three Ticket Tools

```
Problem3

Here is what needs to be done:
1. Write an MCP server in the 'mcp_server/' directory using FastMCP. It should connect to and query 'data/campus_customs_new.db'. (You do not need to run or connect it right now).
2. Create exactly three MCP tools corresponding to the needs of the three open tickets (101, 102, and 103) in the database. Use clear names and only query real data from the database. The tools are:
   - get_invoice_status (ticket 101): reads invoices, joined with vendors
   - get_lease_rent_due (ticket 102): reads leases
   - get_sku_pricing (ticket 103): reads pricing
3. Update 'output/harness.md' to list each of the three MCP tools, and write the following content for each tool (table it reads, ticket it unlocks, and one precise sentence explaining why it is the right tool):
   - get_invoice_status | table: invoices (joined with vendors) | ticket: 101 | Ticket 101's size-S tee can only be restocked if its vendor will ship, and this tool returns invoice 501's status and due date plus the vendor's lead time, which show whether the open unpaid invoice is blocking that vendor.
   - get_lease_rent_due | table: leases | ticket: 102 | Ticket 102 is a rent notice, and this tool returns lease 1's monthly rent and next_due date, which are the two facts needed to decide how much to pay and how urgent it is.
   - get_sku_pricing | table: pricing | ticket: 103 | Ticket 103 asks for a bulk discount on CC-HOOD-NAVY, and this tool returns its unit_cost and list_price, which set the floor and ceiling for any discount that keeps a margin.
4. Create a short 'mcp_server/README.md' file that includes the following: what the MCP server is for (letting the agents read real shop data to unblock tickets 101, 102, and 103), which database file it uses (data/campus_customs_new.db, never the original), and the three tools it provides (get_invoice_status, get_lease_rent_due, get_sku_pricing), all read-only.
```

## Problem 4: Connect the MCP Server and Save Smoke-Test Evidence

```
Problem4

Here is what needs to be done:
1. Configure and connect our MCP server to the vibe coder by creating a '.mcp.json' file at the project root with the correct local MCP server configuration.
2. Test each of the three MCP tools through the vibe coder by asking it these three prompts, one at a time:
   - "Using the campus-customs MCP server, look up invoice 501. What are its amount, due date, and status, and what is the vendor's name and lead time?"
   - "Using the campus-customs MCP server, look up lease 1. What is the monthly rent and when is the next payment due?"
   - "Using the campus-customs MCP server, what are the unit cost and list price of the SKU CC-HOOD-NAVY?"
3. Save the test evidence in 'output/mcp_smoke.json' as a JSON list with one entry per tool tested. For every entry, include:
   - "prompt": the exact prompt I asked the vibe coder.
   - "tool": the name of the MCP tool that was called.
   - "output": the raw output returned by the tool, which must match the actual values in 'data/campus_customs_new.db'.
   Use only the real outputs from the tool calls; do not make up or hand-write any values. After saving, compare each output with the database and tell me if anything does not match.
```

Follow-up prompt (new session):

```
Problem 4 follow-up: '.mcp.json' is already created and the MCP server 'campus-customs' should be connected. First confirm that the three tools (get_invoice_status, get_lease_rent_due, get_sku_pricing) are available. Then test each tool by asking these three prompts, one at a time:
- "Using the campus-customs MCP server, look up invoice 501. What are its amount, due date, and status, and what is the vendor's name and lead time?"
- "Using the campus-customs MCP server, look up lease 1. What is the monthly rent and when is the next payment due?"
- "Using the campus-customs MCP server, what are the unit cost and list price of the SKU CC-HOOD-NAVY?"
Save the evidence in 'output/mcp_smoke.json' as a JSON list with one entry per tool, each with "prompt" (the exact prompt), "tool" (the tool name that was called), and "output" (the raw tool output, matching 'data/campus_customs_new.db'). Use only real tool outputs, then compare them with the database and tell me if anything does not match.
```

(What was lacking after the first prompt: the MCP server was not connected to the running session, so the tools could not be called and the test evidence could not be saved until I reopened the project in a new session and sent a follow-up prompt.)

## Problem 5: Build the PydanticAI Agent Team and Grow the MCP Tools

```
Problem5

Here is what needs to be done:
1. Build the multi-agent team using PydanticAI with 5 roles: Boss, Inventory, Accounting, Facilities, and Customer Service.
   - Configure full connectivity so any agent can delegate tasks to any other agent as needed. Add a limit on delegation depth so agents cannot loop forever.
   - Use PORTKEY_API_KEY with the 'gpt-6-luna' model exclusively for every agent. Never hard-code the key.
   - Put agent system prompts under 'backend/prompts/' (one file per agent), data structures in 'backend/models.py', and agent files under 'backend/'.
   - Write each system prompt in detail, covering that agent's whole job and scope. Every agent must use only data from the MCP tools (never invent data), treat desk.date_today as "today", delegate to another agent when the question is outside its role, and never contact real customers or real vendors. Role-specific rules:
     - Boss: reads each ticket, decides which agents should work on it, combines their results, and makes the final call.
     - Inventory: checks stock by SKU and size, calculates shortfalls, finds which vendor can restock using vendors.specialty and lead_days, and knows a vendor will not ship new product while they have an open unpaid invoice.
     - Accounting: checks cash and invoices, checks margins using unit_cost and list_price before approving any discount, and only prepares payments or purchase orders for human approval. Payments always need human approval, must be refused if cash is not enough (no negative balances), and must update the relevant table after payment. Cash only goes out; no revenue is modeled.
     - Facilities: handles leases and rent, uses desk.date_today to judge how urgent a rent due date is, and works with Accounting for the payment itself.
     - Customer Service: only drafts messages for customers. Drafts stay on the board and are never emailed, and it only states facts that other agents confirmed from the database.
2. Expand the MCP server in 'mcp_server/' with any additional tools the agents need to process the three open tickets (101, 102, 103) against 'data/campus_customs_new.db'. For example: today's date from the desk table, inventory by SKU and size, vendor lead times, cash balance, a payment tool (must require human approval, must refuse if cash is not enough, and must update the payments table and the relevant balances), and saving a customer message draft on the board without sending it. Shop facts must come only from the MCP server. Do not create any separate shop-tools layer that bypasses MCP.
3. Implement audit logging: every agent-loop step must append to 'output/audit_trail.json' (append, never overwrite or wipe the file on each run). Each record should have enough detail to audit later: timestamp, ticket id, agent name, step type (tool call, delegation, or final answer), tool name and arguments, tool result, and the delegation target if any.
4. Update 'output/harness.md' to:
   - List each agent role with a one-line job description and the MCP tools it uses, and list each MCP tool (including the ones added in this problem) along with which database tables it uses.
   - Add a short "Safety" section covering guardrails for real money and real customers (human approval before every payment, refuse when cash is not enough, no emails to customers, no calls to real vendors, drafts only, original database never modified), and limits that keep token use in check (maximum delegation depth, maximum requests and tokens per ticket, only gpt-6-luna, and limits on prompt and tool-result length).
5. Update 'mcp_server/README.md' so the tool list matches all the tools the MCP server has now.
```

## Problem 6: Plan the Three Tickets in desk_tickets.html

```
Problem6

Here is what needs to be done:
1. Create an HTML file at 'output/desk_tickets.html' that can be easily opened in a browser (double-click, no server needed).
2. The page must include individual tabs for each of the three open tickets (101, 102, and 103), plus empty/placeholder tabs for "Cash" and "Reflection" (with a short "coming later" note).
3. On each ticket tab, fill the 'Expected' section with the following (leave the 'Actual' section empty for later):

   Ticket 101 (tee, size S)
   - Boss calls Inventory first, because I think the tee is out of stock.
   - Inventory will probably find the vendor is blocked by the unpaid invoice, so it asks Accounting about it. Then Boss asks Customer Service to write the customer a message. Facilities is not needed.
     Boss -> Inventory -> Accounting
     Boss -> Customer Service
     Not called: Facilities
   - Tools I think will be used: get_ticket, get_inventory, get_vendors, get_invoice_status, prepare_payment, save_customer_draft.

   Ticket 102 (rent notice)
   - Boss calls Facilities first, because it is about rent and the due date is soon.
   - Facilities then asks Accounting to get the payment ready. Inventory and Customer Service are not needed.
     Boss -> Facilities -> Accounting
     Not called: Inventory, Customer Service
   - Tools I think will be used: get_ticket, get_lease_rent_due, get_cash_balance, prepare_payment.

   Ticket 103 (20 hoodies, bulk discount)
   - Boss calls Accounting first, because the main question is whether the discount still makes money.
   - Then Inventory to check the stock, and Customer Service to write a reply. Facilities is not needed.
     Boss -> Accounting
     Boss -> Inventory
     Boss -> Customer Service
     Not called: Facilities
   - Tools I think will be used: get_ticket, get_sku_pricing, get_inventory, get_vendors, save_customer_draft.
```

## Problem 7: Build the FastAPI Backend Routes

```
Problem7

Here is what needs to be done:
1. In 'backend/main.py', create FastAPI routes to support the upcoming React dashboard:
   - GET tickets list (returns the 3 tickets and whether each is open or resolved).
   - POST run agent team on a ticket (takes 'ticket_id' and executes agent workflow).
   - GET agent events (returns recent agent thoughts/actions/tool usage for live updates).
   - POST approve payment/purchase (processes human approval to deduct cash from 'cash_accounts', agents only prepare payments, this route executes them).
   - GET cash balance (returns current checking balance from 'cash_accounts').
   - POST reset database (resets 'data/campus_customs_new.db' back to the original 'data/campus_customs.db').
2. Ensure the backend can be launched via 'uvicorn main:app --reload --port 8000' from the 'backend/' folder.
3. Update 'output/harness.md' by listing each created route on a single line (format: URL endpoint and a brief description of what it does).
```

## Problem 8: Build the React Agent Dashboard

```
Problem8

Here is what needs to be done:
1. Build the frontend dashboard in the 'frontend/' directory using React + Vite + TypeScript. It must start with 'npm run dev' and call the FastAPI backend at 'http://localhost:8000' (keep that address in one place, for example a Vite environment variable with that default).
2. Make sure the backend ('backend/main.py') allows the Vite dev server origin ('http://localhost:5173') in CORS, so the browser can call the routes.
3. The dashboard must include:
   - A list of all three tickets.
   - An option to select a ticket and start the agent team on it.
   - Live display of what each agent is saying and doing while the ticket runs (refresh from the backend events route).
   - Marking a ticket as resolved when its run finishes.
   - A short summary of what each agent did on that ticket.
   - A human approval interface for payments or purchases that agents prepared, where the human types their name and approves.
   - The current checking balance, which updates after an approved payment.
4. Make the design creative, using a "campus shop counter" idea:
   - Tickets look like paper order slips pinned on a board. When a ticket is resolved, a "RESOLVED" rubber-stamp animation plays and the slip moves to a "done" shelf.
   - The checking balance looks like a cash register display, with the digits rolling down after an approved payment and a short "-$amount" animation. If cash is not enough for a pending payment, show that clearly and disable its approve button.
   - The 5 agents are animal staff members, each with a name and a drawing: Chief the bulldog (Boss), Acorn the squirrel (Inventory), Ledger the owl (Accounting), Chip the beaver (Facilities), and Polly the parrot (Customer Service). Each also has its own color, role icon, and speech bubble shape, so they can be told apart without relying on color alone.
   - Each staff member works in their own way. While an agent is working, show what it is doing in its own words (for example "Acorn is counting boxes"). Tool calls appear as small receipts that arrive in each agent's own way (Ledger's like calculator tape, Acorn's sliding in like a crate). When Polly saves a customer message, show it as an envelope card stamped "DRAFT - NOT SENT".
   - A small delegation map shows the animals at their desks and who called whom. It lights up live as agents hand work to each other, and a paper slip flies along the newest handoff.
   - Use a 3-column layout: tickets on the left, live agent feed in the center, and pending payment approvals, the cash register, and the ticket summary on the right, with pending approvals highlighted at the top so they are never missed.
5. Create an 'output/design.md' file that explains the dashboard design with these points:
   - Layout: 3 columns. Tickets on the left so I can pick one, the live agent feed in the middle because that is what I watch most, and payments, cash, and the summary on the right. Pending approvals sit at the top right so they are never missed.
   - Agents: the staff are animals (Chief the bulldog, Acorn the squirrel, Ledger the owl, Chip the beaver, Polly the parrot), and each also has its own color, icon, and bubble shape, so you can still tell them apart without color. Each one works in its own way, for example Ledger's receipts print like calculator tape and Polly's messages are stamped "DRAFT - NOT SENT". I chose this so a person can follow who is talking at a glance, the page feels like a living shop, the "never send" rule is visible, and the page works for people who cannot see colors well.
   - Delegation map: a small map of the animals at their desks that lights up when one agent hands work to another, with a paper slip flying along the newest handoff. I chose it because delegation is the main idea of the project, and this shows it without reading the logs.
   - Resolved tickets: tickets look like paper order slips. When a ticket is resolved, a "RESOLVED" stamp appears and the slip moves to a "done" shelf. I chose this so finished work is easy to see and the board stays clean.
   - Cash: the balance looks like a cash register display. The digits roll down after an approved payment and a "-$amount" shows briefly, so I can see exactly where the money went. A payment that cash cannot cover cannot be approved.
```

## Problem 9: Resolve the Tickets and Record the Results

```
Problem9

Here is what needs to be done. Use the runs that already happened: do NOT reset the database and do NOT run the agents again. Use only real values from 'data/campus_customs_new.db' and 'output/audit_trail.json'; do not invent anything.

1. Update 'output/desk_tickets.html':
   - On each ticket tab, fill in the 'Actual' section (which agents worked, what they delegated, and which tools they used) so it can be compared with the 'Expected' section, which stays unchanged.
   - On the 'Cash' tab, itemize the money: the starting checking balance, the cash change for each ticket (which payment or purchase, with dollar amounts, and that it was applied after a human approved it), and the ending balance, which must match 'cash_accounts' in the working database exactly.
2. Create 'output/resolved_tickets.json' with, for each ticket: id, final status, a short outcome, what each agent contributed, and the human approvals.
3. Create 'output/resolved_board.html': take one screenshot of the React dashboard for each resolved ticket (101, 102, and 103), save them as image files in 'output/', and show all three in a page that opens by double-clicking.
4. Check that the real runs are in 'output/audit_trail.json' (do not wipe or recreate it).
5. Finish 'output/harness.md' so it covers the database tables, the MCP tools, the 5 agents, the API routes, the dashboard architecture, and the safety rules, and say plainly that there is no purchase-order tool.
```

## Problem 10: Write the Reflection Tab

```
Problem10

Here is what needs to be done. Use the runs that already happened: do NOT reset the database and do NOT run the agents again. Keep the ticket tabs and the Cash tab as they are.

1. Open 'output/desk_tickets.html' and fill in the 'Reflection' tab with the five sections a) to e) below, one heading per section, keeping all the numbers and details:

   a) How I would evaluate the agents on each ticket, and why
   - Ticket 101 (B): The agents got the right answer: the tee in size S has 0 in stock, and Bulldog Print Co can't ship because invoice 501 ($840) is overdue. Accounting prepared payment #1, I approved it, and Customer Service wrote a delay note that promised no date. But it was messy: 17 model requests and 29 tool calls, the most of the three tickets. Boss called Accounting twice (once just to check the invoice, once to queue the payment), and Customer Service called Inventory again to re-check facts Inventory had already given, so get_inventory, get_vendors, and get_today each ran twice.
   - Ticket 102 (A): Boss -> Facilities -> Accounting, 9 requests and 12 tool calls. Facilities read lease 1 ($2,400, due 2026-09-02, 2 days away), Accounting checked cash ($2,560 at that point) and queued payment #2. Nobody else was bothered. It was the cleanest because the task maps to one expert plus the person who handles money.
   - Ticket 103 (B-): Inventory found only 8 of 20 size M hoodies in stock (short by 12). Accounting respected "never below cost" and gave a break-even ceiling (cost $22, list $58, 62% off, $0 margin). Boss refused to approve any override because the customer never named a target price, and Customer Service saved a draft asking for one. All of it follows the rules and 11 requests is efficient, but the final answer was "ask the customer", not a decision, and Accounting gave a break-even number instead of a sensible discount to offer.

   b) How Actual compared to my Expected plan, for each ticket
   - 101: Mostly matched. Boss called Inventory first, Inventory found the blocked vendor, Customer Service wrote the note, and Facilities was correctly not called. What I got wrong: I expected Inventory to hand off to Accounting, but Boss called Accounting directly (twice), and Customer Service also called Inventory, which I never predicted. All six tools I predicted were used, plus get_today, get_cash_balance, and get_sku_pricing.
   - 102: Exact match: Boss -> Facilities -> Accounting, Inventory and Customer Service untouched, all four predicted tools used (plus get_today). My best prediction, because the ticket has a clear owner.
   - 103: Right agents, wrong first move. I expected Boss to call Accounting first (is the discount still profitable?), but Boss called Inventory first to see if 20 hoodies even exist. In hindsight that is smarter, because if the stock isn't there the margin question matters less. All five predicted tools were used (plus get_today).
   - Overall: I predicted who would be involved well, but not how many times. The real team double-checked itself.

   c) What would have been simpler as one agent with tools, and why
   - Most of the work is lookups, not judgment. For 102, one agent with the tools needs three calls (get_lease_rent_due, get_cash_balance, prepare_payment). The team needed 9 requests and 12 tool calls, because Boss, Facilities, and Accounting each re-read the ticket and today's date.
   - 101's duplicate lookups would disappear, because one agent holds stock, vendor, invoice, and cash in one context and nobody has to re-ask. The ticket used 29 tool calls; my guess is that about 6 to 8 would do.
   - Delegation costs tokens: the three runs together used roughly 60,000 input tokens (29,019 + 13,703 + 17,391) for what is mostly reading a few database tables.

   d) Three new problems Campus Customs might face that this team CAN solve with the tools we built
   - A new vendor bill: say Elm City Gifts sends an invoice for mugs. It has the same shape as ticket 101: get_invoice_status, get_cash_balance, and prepare_payment for a human to approve, with the vendor-won't-ship rule applied to Elm City Gifts.
   - A stock-and-timing question: a customer asks "do you have the navy hoodie in L, and how fast can you get more?" Inventory reads stock (14 in L) and the vendor's lead time, and Customer Service drafts an honest answer with an estimate, never a promise.
   - A discount on a different item: a club wants 30 Yale caps (stock 40, cost $6, list $22). Inventory confirms stock, Accounting checks the margin with get_sku_pricing, and Customer Service drafts the reply. It is ticket 103 again, but with enough stock to say yes.

   e) Three new problems Campus Customs might face that this team CANNOT solve, and the tools and agents needed
   - Restocking: ticket 103 showed it. Twelve more hoodies would cost 12 x $22 = $264, and only $160 was left after the rent. The team cannot buy anything. It needs a prepare_purchase_order tool (human-approved, with the same cash check), a receive_stock tool that raises inventory.qty, vendor price data, and a Purchasing agent that decides what to reorder, and in what order, when cash is short.
   - Cash-flow planning: I ended at $160 with the next rent due 2026-10-02 and no revenue modeled, so the team cannot answer "can we survive next month?" It needs a sales ledger (record_sale), a forecast_cash tool, and a Finance Planner agent that ranks bills by consequence (blocked vendor vs. late rent) and proposes a plan, such as asking the landlord for a payment plan.
   - Fulfilling orders and talking to the outside world: drafts are never sent and nothing ships. It needs an orders table with reserve_stock and mark_shipped tools, a courier-tracking tool (QuickShip CT is in the vendors table but has no tool), a human-gated send_email tool, and a Fulfillment agent for orders, delays, returns, and refunds.
```

## Problem 11: Submit to GitHub

```
Problem11

Here is what needs to be done. Do NOT reset the database and do NOT run the agents again; the working database must stay in its current final state. Never commit the real '.env' or any API key.

1. Make this project folder ('hw5') a git repository and push it to my existing empty PUBLIC GitHub repository: https://github.com/yguru00-cloud/hw5.git (branch 'main'). Write the web address https://github.com/yguru00-cloud/hw5 into 'output/github_url.txt' first, then make one commit and push. If the push needs me to sign in, tell me exactly what I need to do.
2. The repository must match this layout: AI_prompts.md, requirements.txt, .env.example, .gitignore, .mcp.json, README.md, data/ (both 'campus_customs.db' and 'campus_customs_new.db', the working copy in its current state), mcp_server/ (server.py and README.md), frontend/, backend/ (main.py, models.py, and prompts/ with boss.md, inventory.md, accounting.md, facilities.md, customer_service.md), and output/ (harness.md, mcp_smoke.json, desk_tickets.html, design.md, resolved_tickets.json, resolved_board.html, audit_trail.json, github_url.txt). Also include the screenshot images in 'output/' because 'resolved_board.html' needs them. Do not include '.venv', 'node_modules', 'frontend/dist', '__pycache__', or '.env'. Add a root '.env.example' that has 'PORTKEY_API_KEY=' with no value.
3. Before pushing, check that no secret is in any file that will be committed (compare against the real key in '.env' without printing it), and show me the list of files that will be committed.
4. Write a root 'README.md' that explains: how to install (virtual environment, 'requirements.txt', 'npm install' in 'frontend/'), how to put 'PORTKEY_API_KEY' in '.env', how to copy the original database to the working copy when I need a clean run, how to start the MCP server (it is started by the backend through '.mcp.json', and how to run it on its own), how to start the FastAPI backend, how to start the React board, and that the database should be reset before a full three-ticket run. Mention that '.mcp.json' uses the Windows path '.venv/Scripts/python.exe' and what to change on Mac or Linux.
5. After the push, clone the repository into a temporary folder and check that the file layout matches item 2.
6. Tell me the final repository URL so I can submit it to Canvas myself.
```
