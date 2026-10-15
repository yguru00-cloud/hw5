# Dashboard Design

The dashboard (`frontend/`, React + Vite + TypeScript) is a **campus shop counter**: tickets are paper order slips on a cork board, the agents are people at desks, and the cash is a cash register. The idea is that a person running this desk should understand the state of the shop at a glance, and actually enjoy sitting at it.

Run it with `npm run dev` inside `frontend/` (it opens on `http://localhost:5173`). It calls the backend at `http://localhost:8000`; the address is set in one place (`VITE_API_URL`, see `frontend/.env.example`).

## Layout: three columns

| Column | What is in it | Why it is there |
|---|---|---|
| Left | The order board with the open tickets, and the done shelf below it | This is where I choose what to work on, so it sits where the eye starts. Open and done work are kept apart so the board stays clean. |
| Center | A small delegation map on top, and the live feed below | The feed is what I watch most while agents run, so it gets the widest column. |
| Right | Payments waiting for my signature, the cash register, and the ticket summary | These are the things only a human does or needs to read. They stay in one place so nothing important is hidden in the feed. |

**Pending approvals are at the top right and are highlighted** (red border, a pulsing glow, and a count badge) so an operator can never miss a payment request. On narrow screens the columns stack in the same order.

## How the agents read differently

The shop is staffed by five **animals**, each with their own name, face, **color, role icon, speech-bubble shape, and name label**. They are drawn as simple flat illustrations, so no two have the same silhouette.

| Agent | Staff member | Role icon | Bubble shape |
|---|---|---|---|
| Boss | **Chief**, a grumpy bulldog with a whistle on the collar | clipboard | rounded, with a squared corner |
| Inventory | **Acorn**, a squirrel with an acorn | crate | square corners with a hard shadow, like a box |
| Accounting | **Ledger**, an owl in a green eyeshade | calculator | dashed outline on a ruled "tape" background |
| Facilities | **Chip**, a beaver in a hard hat | key | notched corners, like a key tag |
| Customer Service | **Polly**, a parrot with a headset | chat bubble | round, with a speech tail |

Why: a campus shop feels friendlier run by a mascot-style crew than by five identical robots, and a person can follow who is talking at a glance. The animal, the bubble shape, the role icon, and the name label each tell the agents apart on their own, so the page still works for people who cannot see colors well. Replies from a delegated agent are indented, so a handoff reads like a conversation going one level deeper.

**Each staff member works in their own way** (small details that follow what the agent actually does):

- While an agent is working, the "typing" line says what they are doing: "Acorn is counting boxes", "Ledger is punching the calculator", "Chip is jingling the keys", "Polly is drafting a note", "Chief is reading the slip".
- Tool calls are small dashed **receipt chips** (tool name plus one plain sentence, such as "invoice 501: $840.00 open, due 2026-08-28"). Clicking a chip shows the raw arguments and result. Each agent's chips arrive differently: Ledger's print out like calculator tape with a torn edge, Acorn's slide in like a crate, Chip's jingle, and Chief's get a check mark.
- When Polly saves a message, it appears as a small **envelope card** with the recipient, subject, and text, stamped **"DRAFT - NOT SENT"**. Why: the shop rule is that customers are never contacted, and the stamp makes that rule visible instead of just written down.

Why the extra detail: the story of a ticket stays readable, the raw data is one click away for auditing, and the page feels like a living shop rather than a log viewer.

## Delegation map

A small map of five desks, one per staff member, that **lights up as agents hand work to each other**. An arrow is drawn for each handoff. While a run is going, **a paper slip flies along the newest handoff** from one desk to the next, and the desk that is working right now pulses. A handoff that was refused (for example by the depth limit) is drawn dashed in red. In the feed, a handoff reads "Passing this slip to ...", the same idea in words.

Why: delegation is the main idea of this project, and a slip flying between desks shows who called whom without reading the logs. People who prefer reduced motion get the arrows without the flying slip.

## Resolved tickets

Tickets look like **paper order slips** taped to the board. When a run finishes, a **"RESOLVED" rubber stamp** slams onto the slip and the slip moves to the **done shelf**. Slips that were already resolved show the stamp without the animation.

Why: finished work is easy to see, the stamp gives a small moment of satisfaction, and the board only shows what is still open. After a reset, the slips come back to the board.

## Cash

The checking balance is a **cash register display**: green digits on a dark screen. After an approved payment, the digits **roll down** to the new balance and a "-$840.00" tag floats up and fades, so I can see exactly where the money went. If payments are waiting, the register says how much is waiting for approval.

Payments appear as **cheques** that need a name: the approver types their name, the card shows "Cash $3,400.00 -> $2,560.00" before paying, and the **Approve & pay** button works only with a name. If cash is not enough, the cheque turns red, says how much cash is short, and the button is disabled. Why: the backend never lets cash go negative, and the screen explains it before the person tries.

## Other choices

- **Latest run only.** The feed shows the latest run of the selected ticket. Earlier runs stay in the audit trail, and a note says how many. After "Reset desk", a ticket starts with a clean feed.
- **Summary per agent.** The ticket summary shows the Boss's final call first (with what is waiting for a human), then one short card per agent with what it concluded and which tools it used.
- **Honest empty and error states.** Empty panels explain what will appear there, and a red banner shows backend problems in plain words (for example, when the backend is not running or the model key is missing).
- **Accessibility.** Slips work with the keyboard, the feed announces new lines politely to screen readers, and animations switch off for people who prefer reduced motion.
