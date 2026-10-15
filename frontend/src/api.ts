import type { AgentEvent, Cash, PaymentRequest, Ticket } from './types'

// The backend address lives in one place; override it with VITE_API_URL (see .env.example).
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_URL}. Is it running?`)
  }
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body)
    throw new ApiError(response.status, detail)
  }
  return body as T
}

export const getTickets = () => request<{ tickets: Ticket[] }>('/tickets').then((r) => r.tickets)

export const runTicket = (ticketId: number) =>
  request<{ ticket_id: number; run_status: string }>(`/tickets/${ticketId}/run`, { method: 'POST' })

export const getEvents = (ticketId: number, limit = 400) =>
  request<{ total: number; events: AgentEvent[] }>(`/events?ticket_id=${ticketId}&limit=${limit}`)

export const getApprovals = () =>
  request<{ payment_requests: PaymentRequest[] }>('/approvals').then((r) => r.payment_requests)

export const approvePayment = (requestId: number, approvedBy: string) =>
  request<{ request_id: number; amount: number; cash_balance: number; approved_by: string }>(
    `/approvals/${requestId}/approve`,
    { method: 'POST', body: JSON.stringify({ approved_by: approvedBy }) },
  )

export const getCash = () => request<Cash>('/cash')

export const resetDatabase = () => request<{ status: string }>('/reset', { method: 'POST' })
