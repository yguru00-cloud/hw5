import type { AgentEvent } from './types'

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/** A run starts with the Boss's first loop step; keep only the latest run of a ticket. */
export function latestRun(events: AgentEvent[]): { events: AgentEvent[]; earlierRuns: number } {
  const starts = events
    .map((e, i) => (e.step_type === 'agent_step' && e.agent === 'boss' && e.depth === 0 && e.step === 1 ? i : -1))
    .filter((i) => i >= 0)
  if (starts.length === 0) return { events, earlierRuns: 0 }
  return { events: events.slice(starts[starts.length - 1]), earlierRuns: starts.length - 1 }
}

/** Walk the events to find who is working right now (a delegation pushes, a final answer pops). */
export function activeAgent(events: AgentEvent[]): string | null {
  if (events.length === 0) return null
  const stack = ['boss']
  for (const e of events) {
    if (e.step_type === 'delegation' && e.delegation_target && !e.error) stack.push(e.delegation_target)
    else if (e.step_type === 'final_answer' && stack.length > 1) stack.pop()
  }
  return stack[stack.length - 1]
}

export interface Edge {
  from: string
  to: string
  count: number
  refused: boolean
  latest: boolean
}

export function delegationEdges(events: AgentEvent[]): Edge[] {
  const map = new Map<string, Edge>()
  let lastKey = ''
  for (const e of events) {
    if (e.step_type !== 'delegation' || !e.delegation_target) continue
    const key = `${e.agent}>${e.delegation_target}`
    const edge = map.get(key) ?? { from: e.agent, to: e.delegation_target, count: 0, refused: false, latest: false }
    edge.count += 1
    if (e.error) edge.refused = true
    map.set(key, edge)
    lastKey = key
  }
  const edges = [...map.values()]
  edges.forEach((edge) => (edge.latest = `${edge.from}>${edge.to}` === lastKey))
  return edges
}

const record = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const num = (v: unknown) => (typeof v === 'number' ? money(v) : String(v))

/** One plain-language line for a tool result, shown on the "receipt" chip. */
export function summarizeResult(tool: string, result: unknown, error: string | null): string {
  if (error) return `error: ${error}`
  if (typeof result === 'string') return result.length > 120 ? `${result.slice(0, 120)}...` : result
  const r = record(result)
  if (!r) return JSON.stringify(result ?? '').slice(0, 120)
  if (typeof r.error === 'string') return `error: ${r.error}`
  switch (tool) {
    case 'get_today':
      return `today is ${r.date_today}`
    case 'get_ticket':
      return `#${r.id} ${r.subject}`
    case 'list_open_tickets':
      return `${(r.tickets as unknown[] | undefined)?.length ?? 0} open tickets`
    case 'get_inventory': {
      const items = (r.items as Record<string, unknown>[] | undefined) ?? []
      return items.length
        ? items.slice(0, 3).map((i) => `${i.sku} ${i.size}: ${i.qty} in stock`).join('; ')
        : 'no matching stock rows'
    }
    case 'get_vendors': {
      const vendors = (r.vendors as Record<string, unknown>[] | undefined) ?? []
      const blocked = vendors.filter((v) => Number(v.open_invoice_count) > 0)
      return `${vendors.length} vendors` + (blocked.length ? `; ${blocked.map((v) => v.name).join(', ')} has an open invoice` : '')
    }
    case 'get_invoice_status':
      return `invoice ${r.invoice_id}: ${num(r.amount)} ${r.status}, due ${r.due_date}`
    case 'get_lease_rent_due':
      return `${r.space_name}: rent ${num(r.monthly_rent)} due ${r.next_due}`
    case 'get_sku_pricing':
      return `${r.sku}: cost ${num(r.unit_cost)}, list ${num(r.list_price)}`
    case 'get_cash_balance':
      return `${r.name} balance ${num(r.balance)}`
    case 'prepare_payment':
      return `payment request #${r.request_id} for ${num(r.amount)} queued - waiting for a human`
    case 'save_customer_draft':
      return `draft #${r.draft_id} saved on the board (not sent)`
    default:
      return JSON.stringify(r).slice(0, 120)
  }
}

export function reportOf(e: AgentEvent): {
  headline: string
  detail: string | null
  facts: string[]
  actions: string[]
  needsApproval: boolean
} {
  const r = record(e.result) ?? {}
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
  if (typeof r.decision === 'string') {
    return {
      headline: r.decision,
      detail: typeof r.reasoning === 'string' ? r.reasoning : null,
      facts: list(r.actions_taken),
      actions: list(r.pending_human_approvals),
      needsApproval: list(r.pending_human_approvals).length > 0,
    }
  }
  return {
    headline: typeof r.summary === 'string' ? r.summary : '(no summary)',
    detail: null,
    facts: list(r.key_facts),
    actions: list(r.recommended_actions),
    needsApproval: r.needs_human_approval === true,
  }
}
