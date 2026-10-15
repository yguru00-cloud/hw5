import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { agentStyle, AgentBadge } from '../agents'
import { Avatar } from '../avatars'
import { reportOf, summarizeResult } from '../events'
import type { AgentEvent, AgentName, Ticket } from '../types'

interface Props {
  ticket: Ticket | null
  events: AgentEvent[]
  earlierRuns: number
  active: string | null
}

function Face({ agent }: { agent: string }) {
  const a = agentStyle(agent)
  return (
    <div
      className="line__avatar"
      style={{ background: a.soft, borderColor: a.color }}
      title={`${a.persona} the ${a.species} (${a.label})`}
    >
      <Avatar agent={agent as AgentName} size={36} />
    </div>
  )
}

function Bubble({ agent, depth, children, kind = 'say' }: {
  agent: string
  depth: number
  children: ReactNode
  kind?: 'say' | 'final' | 'error'
}) {
  const a = agentStyle(agent)
  return (
    <div className="line" style={{ marginLeft: depth * 16 }}>
      <Face agent={agent} />
      <div className="line__body">
        <AgentBadge name={agent} small />
        <div
          className={`bubble bubble--${a.bubble} bubble--${kind}`}
          style={{ ['--agent' as string]: a.color, ['--agent-soft' as string]: a.soft }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** Polly's saved message: an envelope-style card stamped so nobody thinks it went out. */
function DraftCard({ e }: { e: AgentEvent }) {
  const args = e.arguments ?? {}
  const result = (e.result ?? {}) as Record<string, unknown>
  return (
    <div className="line line--tool" style={{ marginLeft: e.depth * 16 + 44 }}>
      <div className="draft">
        <div className="draft__meta">
          <span>To: <strong>{String(args.recipient ?? '')}</strong></span>
          <span>Draft #{String(result.draft_id ?? '?')}</span>
        </div>
        <p className="draft__subject">{String(args.subject ?? '')}</p>
        <p className="draft__body">{String(args.body ?? '')}</p>
        <span className="draft__stamp">DRAFT - NOT SENT</span>
      </div>
    </div>
  )
}

function EventLine({ e }: { e: AgentEvent }) {
  if (e.step_type === 'agent_step') {
    if (!e.model_text) return null
    return <Bubble agent={e.agent} depth={e.depth}>{e.model_text}</Bubble>
  }
  if (e.step_type === 'delegation') {
    const target = e.delegation_target ?? '?'
    const task = String(e.arguments?.task ?? '')
    return (
      <Bubble agent={e.agent} depth={e.depth}>
        <span className="handoff">
          <span className="handoff__slip" aria-hidden="true" />
          Passing this slip to <AgentBadge name={target} small />
        </span>
        {task && <span className="bubble__task">{task}</span>}
        {e.error && <span className="bubble__warn">Refused: {e.error}</span>}
      </Bubble>
    )
  }
  if (e.step_type === 'tool_call') {
    if (e.tool_name === 'save_customer_draft' && !e.error) return <DraftCard e={e} />
    const failed = Boolean(e.error)
    const args = e.arguments && Object.keys(e.arguments).length ? JSON.stringify(e.arguments) : ''
    return (
      <div className="line line--tool" style={{ marginLeft: e.depth * 16 + 44 }}>
        <details className={`receipt receipt--${e.agent}${failed ? ' receipt--bad' : ''}`}>
          <summary>
            <span className="receipt__tool">{e.tool_name}</span>
            <span className="receipt__text">{summarizeResult(e.tool_name ?? '', e.result, e.error)}</span>
          </summary>
          <pre>{`arguments: ${args || '{}'}\nresult: ${JSON.stringify(e.result ?? e.error, null, 2)}`}</pre>
        </details>
      </div>
    )
  }
  // final_answer
  if (e.error) return <Bubble agent={e.agent} depth={e.depth} kind="error">{e.error}</Bubble>
  const r = reportOf(e)
  return (
    <Bubble agent={e.agent} depth={e.depth} kind="final">
      <strong className="bubble__lead">{e.depth === 0 ? 'Final call: ' : 'Report: '}</strong>
      {r.headline}
    </Bubble>
  )
}

export function LiveFeed({ ticket, events, earlierRuns, active }: Props) {
  const feedRef = useRef<HTMLDivElement>(null)
  const seen = useRef(0)
  const running = ticket?.run_status === 'running'

  useEffect(() => {
    // Scroll only the feed itself (scrollIntoView would also drag the whole page down).
    // Opening a ticket jumps straight to the latest line; new lines then scroll in smoothly.
    const el = feedRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: seen.current === 0 ? 'auto' : 'smooth' })
    seen.current = events.length
  }, [events.length, running])

  return (
    <section className="panel panel--feed" aria-label="Live agent feed" aria-live="polite">
      <h2 className="panel__title">
        Live feed
        {ticket && <span className="panel__sub">Ticket #{ticket.id}</span>}
        {running && <span className="chip chip--live">live</span>}
      </h2>
      <div className="feed" ref={feedRef}>
        {!ticket &&<p className="empty">Pick a slip on the left to watch the staff.</p>}
        {ticket?.run?.status === 'error' && (
          <div className="run-error" role="alert">
            <strong>The run failed before the staff could finish.</strong>
            <span>{ticket.run.error}</span>
            <span className="run-error__hint">Nothing was changed. Press "Retry" on the slip to try again.</span>
          </div>
        )}
        {ticket && events.length === 0 && ticket.run?.status !== 'error' && (
          <p className="empty">
            {running ? 'Chief is reading the slip...' : 'Nobody has worked on this ticket yet. Press "Start agents".'}
          </p>
        )}
        {earlierRuns > 0 && (
          <p className="feed__older">
            {events.length > 0 ? 'Showing the latest run. ' : ''}
            {earlierRuns} earlier run{earlierRuns > 1 ? 's are' : ' is'} kept in the audit trail.
          </p>
        )}
        {events.map((e, i) => (
          <EventLine key={`${e.timestamp}-${i}`} e={e} />
        ))}
        {running && active && (
          <div className="line" style={{ marginLeft: 0 }}>
            <Face agent={active} />
            <div className="line__body">
              <AgentBadge name={active} small />
              <div className="typing" aria-label={agentStyle(active).thinking}>
                <span className="typing__text">{agentStyle(active).thinking}</span>
                <i /><i /><i />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
