import { AgentBadge, agentStyle } from '../agents'
import { reportOf } from '../events'
import type { AgentEvent, Ticket } from '../types'

interface Props {
  ticket: Ticket | null
  events: AgentEvent[]
}

export function SummaryPanel({ ticket, events }: Props) {
  const finals = events.filter((e) => e.step_type === 'final_answer' && !e.error)
  const boss = finals.find((e) => e.agent === 'boss' && e.depth === 0)
  const others = finals.filter((e) => e !== boss)
  const toolsBy = (agent: string) => [...new Set(events.filter((e) => e.step_type === 'tool_call' && e.agent === agent).map((e) => e.tool_name))]
  const resolved = ticket?.status === 'resolved'

  return (
    <section className="panel panel--summary" aria-label="Ticket summary">
      <h2 className="panel__title">
        Ticket summary
        {ticket && <span className="panel__sub">#{ticket.id}</span>}
        {resolved && <span className="chip chip--done">resolved</span>}
      </h2>
      {!ticket && <p className="empty empty--small">Select a ticket.</p>}
      {ticket && finals.length === 0 && <p className="empty empty--small">A short summary of what each agent did appears here when they finish.</p>}
      {boss && (
        <article className="sum sum--boss">
          <AgentBadge name="boss" small />
          <p className="sum__lead">{reportOf(boss).headline}</p>
          {reportOf(boss).detail && <p className="sum__detail">{reportOf(boss).detail}</p>}
          {reportOf(boss).actions.length > 0 && (
            <ul className="sum__list sum__list--warn">
              {reportOf(boss).actions.map((a) => <li key={a}>Waiting for you: {a}</li>)}
            </ul>
          )}
        </article>
      )}
      {others.map((e, i) => {
        const r = reportOf(e)
        const tools = toolsBy(e.agent)
        return (
          <article className="sum" key={`${e.agent}-${i}`} style={{ borderLeftColor: agentStyle(e.agent).color }}>
            <AgentBadge name={e.agent} small />
            <p className="sum__lead">{r.headline}</p>
            {tools.length > 0 && <p className="sum__tools">Used: {tools.join(', ')}</p>}
            {r.needsApproval && <p className="sum__flag">Needs human approval</p>}
          </article>
        )
      })}
    </section>
  )
}
