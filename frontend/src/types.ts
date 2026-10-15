export type AgentName = 'boss' | 'inventory' | 'accounting' | 'facilities' | 'customer_service'

export interface Resolution {
  ticket_id: number
  decision: string
  reasoning: string
  actions_taken: string[]
  pending_human_approvals: string[]
  customer_drafts: string[]
  agents_consulted: string[]
}

export interface RunInfo {
  status: 'running' | 'done' | 'error'
  started_at: string
  finished_at: string | null
  error: string | null
  resolution: Resolution | null
}

export interface Ticket {
  id: number
  type: string
  requester: string
  subject: string
  sku: string | null
  size: string | null
  qty: number | null
  lease_id: number | null
  invoice_id: number | null
  status: 'open' | 'resolved'
  notes: string | null
  created_at: string
  run_status: 'idle' | 'running' | 'done' | 'error'
  run: RunInfo | null
}

export interface RequestedCall {
  tool: string
  arguments: Record<string, unknown>
}

export interface AgentEvent {
  timestamp: string
  ticket_id: number
  agent: string
  depth: number
  step_type: 'agent_step' | 'tool_call' | 'delegation' | 'final_answer'
  step: number | null
  model_text: string | null
  requested_calls: RequestedCall[] | null
  tool_name: string | null
  arguments: Record<string, unknown> | null
  result: unknown
  delegation_target: string | null
  error: string | null
  usage: { requests: number; input_tokens: number; output_tokens: number; tool_calls: number } | null
}

export interface PaymentRequest {
  id: number
  kind: 'invoice' | 'lease'
  ref_id: number
  amount: number
  account: string
  reason: string | null
  requested_by: string
  status: string
  created_at: string
}

export interface Cash {
  name: string
  balance: number
  date: string
}
