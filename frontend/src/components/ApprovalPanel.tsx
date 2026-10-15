import { useState } from 'react'
import { AgentBadge } from '../agents'
import { ApiError, approvePayment } from '../api'
import { money } from '../events'
import type { PaymentRequest } from '../types'

interface Props {
  approvals: PaymentRequest[]
  balance: number | null
  onApproved: (message: string) => void
}

const label = (p: PaymentRequest) => (p.kind === 'invoice' ? `Invoice ${p.ref_id}` : `Lease ${p.ref_id} rent`)

export function ApprovalPanel({ approvals, balance, onApproved }: Props) {
  const [name, setName] = useState(() => localStorage.getItem('approver') ?? '')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const approve = async (p: PaymentRequest) => {
    setBusyId(p.id)
    setErrors((e) => ({ ...e, [p.id]: '' }))
    try {
      localStorage.setItem('approver', name.trim())
      await approvePayment(p.id, name.trim())
      onApproved(`Paid ${money(p.amount)} for ${label(p)}. Approved by ${name.trim()}.`)
    } catch (err) {
      setErrors((e) => ({ ...e, [p.id]: err instanceof ApiError ? err.message : 'Something went wrong.' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className={`panel panel--approvals${approvals.length ? ' panel--alert' : ''}`} aria-label="Payments waiting for approval">
      <h2 className="panel__title">
        Needs your signature
        {approvals.length > 0 && <span className="count count--alert">{approvals.length}</span>}
      </h2>
      <label className="field">
        <span>Your name (approver)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your name to sign" />
      </label>
      {approvals.length === 0 && <p className="empty empty--small">No payments waiting. Agents prepare them here; only you can pay.</p>}
      {approvals.map((p) => {
        const after = balance === null ? null : balance - p.amount
        const short = after !== null && after < 0
        return (
          <article className={`cheque${short ? ' cheque--short' : ''}`} key={p.id}>
            <header className="cheque__head">
              <span className="cheque__no">Payment #{p.id}</span>
              <AgentBadge name={p.requested_by} small />
            </header>
            <p className="cheque__what">{label(p)}</p>
            {p.reason && <p className="cheque__reason">{p.reason}</p>}
            <p className="cheque__amount">{money(p.amount)}</p>
            {after !== null && (
              <p className="cheque__after">
                Cash {money(balance as number)} &rarr; {short ? <strong className="bad">{money(after)}</strong> : money(after)}
              </p>
            )}
            {short && <p className="cheque__warn">Not enough cash: short by {money(-(after as number))}. This payment cannot be approved.</p>}
            {errors[p.id] && <p className="cheque__warn" role="alert">{errors[p.id]}</p>}
            <button
              className="btn btn--approve"
              disabled={short || busyId === p.id || name.trim() === ''}
              onClick={() => approve(p)}
              title={name.trim() === '' ? 'Type your name above to sign' : short ? 'Not enough cash' : 'Approve and pay'}
            >
              {busyId === p.id ? 'Paying...' : 'Approve & pay'}
            </button>
          </article>
        )
      })}
    </section>
  )
}
