import type { KeyboardEvent } from 'react'
import type { Ticket } from '../types'

const TYPE_LABEL: Record<string, string> = {
  customer_order: 'Customer order',
  rent_notice: 'Rent notice',
  price_override: 'Discount request',
}

interface Props {
  tickets: Ticket[]
  selectedId: number | null
  anyRunning: boolean
  freshStamps: Set<number>
  onSelect: (id: number) => void
  onRun: (id: number) => void
}

function Slip({ ticket, selected, anyRunning, fresh, onSelect, onRun }: {
  ticket: Ticket
  selected: boolean
  anyRunning: boolean
  fresh: boolean
  onSelect: () => void
  onRun: () => void
}) {
  const resolved = ticket.status === 'resolved'
  const running = ticket.run_status === 'running'
  const item = ticket.sku ? `${ticket.sku}${ticket.size ? ` / ${ticket.size}` : ''}${ticket.qty ? ` x ${ticket.qty}` : ''}` : null
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }
  return (
    <article
      className={`slip${selected ? ' slip--selected' : ''}${resolved ? ' slip--resolved' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Ticket ${ticket.id}: ${ticket.subject}`}
      onClick={onSelect}
      onKeyDown={onKey}
    >
      <span className="slip__tape" aria-hidden="true" />
      <header className="slip__head">
        <span className="slip__no">#{ticket.id}</span>
        <span className="slip__type">{TYPE_LABEL[ticket.type] ?? ticket.type}</span>
      </header>
      <h3 className="slip__title">{ticket.subject}</h3>
      <p className="slip__who">from {ticket.requester}</p>
      {item && <p className="slip__item">{item}</p>}
      {ticket.lease_id && <p className="slip__item">Lease {ticket.lease_id}</p>}
      {ticket.invoice_id && <p className="slip__item">Invoice {ticket.invoice_id}</p>}
      {ticket.notes && <p className="slip__notes">"{ticket.notes}"</p>}
      {!resolved && (
        <footer className="slip__foot">
          <span className={`chip chip--${running ? 'live' : ticket.run_status === 'error' ? 'bad' : 'idle'}`}>
            {running ? 'Agents working' : ticket.run_status === 'error' ? 'Run failed' : 'Open'}
          </span>
          <button
            className="btn btn--primary"
            disabled={anyRunning}
            onClick={(e) => {
              e.stopPropagation()
              onRun()
            }}
            title={anyRunning ? 'An agent run is already in progress' : 'Start the agent team on this ticket'}
          >
            {running ? 'Working...' : ticket.run_status === 'error' ? 'Retry' : 'Start agents'}
          </button>
        </footer>
      )}
      {resolved && <span className={`stamp${fresh ? ' stamp--new' : ''}`}>RESOLVED</span>}
    </article>
  )
}

export function TicketBoard({ tickets, selectedId, anyRunning, freshStamps, onSelect, onRun }: Props) {
  const open = tickets.filter((t) => t.status === 'open')
  const done = tickets.filter((t) => t.status === 'resolved')
  return (
    <section className="panel panel--board" aria-label="Tickets">
      <h2 className="panel__title">Order board</h2>
      <div className="board">
        {open.length === 0 && <p className="empty">Every slip is done. Nice work!</p>}
        {open.map((t) => (
          <Slip key={t.id} ticket={t} selected={t.id === selectedId} anyRunning={anyRunning}
            fresh={false} onSelect={() => onSelect(t.id)} onRun={() => onRun(t.id)} />
        ))}
      </div>
      <h2 className="panel__title panel__title--shelf">Done shelf <span className="count">{done.length}</span></h2>
      <div className="shelf">
        {done.length === 0 && <p className="empty empty--small">Resolved slips land here.</p>}
        {done.map((t) => (
          <Slip key={t.id} ticket={t} selected={t.id === selectedId} anyRunning={anyRunning}
            fresh={freshStamps.has(t.id)} onSelect={() => onSelect(t.id)} onRun={() => onRun(t.id)} />
        ))}
      </div>
    </section>
  )
}
