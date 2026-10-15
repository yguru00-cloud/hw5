import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_URL, ApiError, getApprovals, getCash, getEvents, getTickets, resetDatabase, runTicket } from './api'
import { ApprovalPanel } from './components/ApprovalPanel'
import { CashRegister } from './components/CashRegister'
import { DelegationMap } from './components/DelegationMap'
import { LiveFeed } from './components/LiveFeed'
import { SummaryPanel } from './components/SummaryPanel'
import { TicketBoard } from './components/TicketBoard'
import { activeAgent, latestRun } from './events'
import type { AgentEvent, Cash, PaymentRequest, Ticket } from './types'

const POLL_MS = 2000

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [approvals, setApprovals] = useState<PaymentRequest[]>([])
  const [cash, setCash] = useState<Cash | null>(null)
  // A link like /?ticket=101 opens that ticket directly (handy for sharing or for screenshots).
  const [selectedId, setSelectedId] = useState<number | null>(
    () => Number(new URLSearchParams(window.location.search).get('ticket')) || null,
  )
  const [eventsFor, setEventsFor] = useState<number | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [freshStamps, setFreshStamps] = useState<Set<number>>(new Set())

  const selectedRef = useRef<number | null>(null)
  const loading = useRef(false)
  const previousStatus = useRef<Map<number, string>>(new Map())
  selectedRef.current = selectedId

  const refresh = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const [t, a, c] = await Promise.all([getTickets(), getApprovals(), getCash()])
      setTickets(t)
      setApprovals(a)
      setCash(c)

      // A ticket that just turned resolved gets its rubber stamp.
      const justResolved = t.filter((x) => x.status === 'resolved' && previousStatus.current.get(x.id) === 'open').map((x) => x.id)
      previousStatus.current = new Map(t.map((x) => [x.id, x.status]))
      if (justResolved.length) {
        setFreshStamps((s) => new Set([...s, ...justResolved]))
        window.setTimeout(() => setFreshStamps((s) => new Set([...s].filter((id) => !justResolved.includes(id)))), 6000)
      }

      let sel = selectedRef.current
      if (sel === null && t.length) {
        sel = (t.find((x) => x.status === 'open') ?? t[0]).id
        setSelectedId(sel)
      }
      if (sel !== null) {
        try {
          const e = await getEvents(sel)
          if (selectedRef.current === sel) {
            setEvents(e.events)
            setEventsFor(sel)
          }
        } catch {
          // The audit trail can be busy for a moment; keep what is on screen and try again next tick.
        }
      }
      setProblem(null)
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Something went wrong while loading.')
    } finally {
      loading.current = false
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const select = (id: number) => {
    setSelectedId(id)
    selectedRef.current = id
    setEvents([])
    setEventsFor(null)
    refresh()
  }

  const start = async (id: number) => {
    select(id)
    try {
      await runTicket(id)
      setProblem(null)
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not start the agents.')
    }
    refresh()
  }

  const reset = async () => {
    if (!window.confirm('Reset the desk? Cash, tickets and payments go back to the original values. The audit trail is kept.')) return
    try {
      await resetDatabase()
      setToast('Desk reset to the original values.')
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not reset.')
    }
    refresh()
  }

  const ticket = tickets.find((t) => t.id === selectedId) ?? null
  const anyRunning = tickets.some((t) => t.run_status === 'running')
  const run = useMemo(() => {
    const latest = latestRun(eventsFor === selectedId ? events : [])
    // An open slip with no run (for example after a reset) starts clean; old runs stay in the audit trail.
    if (ticket && ticket.status === 'open' && ticket.run_status === 'idle') {
      return { events: [], earlierRuns: latest.events.length ? latest.earlierRuns + 1 : 0 }
    }
    return latest
  }, [events, eventsFor, selectedId, ticket])
  const running = ticket?.run_status === 'running'
  const active = running ? activeAgent(run.events) ?? 'boss' : null
  const pendingTotal = approvals.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="app">
      <header className="top">
        <div className="top__brand">
          <span className="top__logo" aria-hidden="true">CC</span>
          <div>
            <h1>Campus Customs</h1>
            <p>Shop counter - watch the agents, sign the cheques</p>
          </div>
        </div>
        <div className="top__right">
          <span className={`conn${problem && !tickets.length ? ' conn--down' : ''}`} title={API_URL}>
            {problem && !tickets.length ? 'Backend offline' : 'Backend connected'}
          </span>
          <button className="btn" onClick={reset} disabled={anyRunning} title="Put everything back to the original values for a fresh run">
            Reset desk
          </button>
        </div>
      </header>

      {problem && (
        <div className="banner" role="alert">
          {problem}
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}

      <main className="layout">
        <TicketBoard tickets={tickets} selectedId={selectedId} anyRunning={anyRunning} freshStamps={freshStamps} onSelect={select} onRun={start} />

        <div className="center">
          <section className="panel panel--map" aria-label="Delegation map">
            <h2 className="panel__title">Who is calling whom</h2>
            <DelegationMap events={run.events} active={active} running={Boolean(running)} />
          </section>
          <LiveFeed ticket={ticket} events={run.events} earlierRuns={run.earlierRuns} active={active} />
        </div>

        <aside className="right">
          <ApprovalPanel
            approvals={approvals}
            balance={cash?.balance ?? null}
            onApproved={(message) => {
              setToast(message)
              refresh()
            }}
          />
          <CashRegister balance={cash?.balance ?? null} asOf={cash?.date ?? null} pending={pendingTotal} />
          <SummaryPanel ticket={ticket} events={run.events} />
        </aside>
      </main>
    </div>
  )
}
