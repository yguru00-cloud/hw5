import { useEffect, useRef, useState } from 'react'
import { money } from '../events'

function Digit({ d }: { d: number }) {
  return (
    <span className="digit">
      <span className="digit__strip" style={{ transform: `translateY(${-d * 10}%)` }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  )
}

interface Props {
  balance: number | null
  asOf: string | null
  pending: number
}

export function CashRegister({ balance, asOf, pending }: Props) {
  const previous = useRef<number | null>(null)
  const [delta, setDelta] = useState<{ amount: number; key: number } | null>(null)

  useEffect(() => {
    if (balance === null) return
    const before = previous.current
    previous.current = balance
    if (before !== null && before !== balance) {
      const change = { amount: balance - before, key: Date.now() }
      setDelta(change)
      const timer = window.setTimeout(() => setDelta((d) => (d && d.key === change.key ? null : d)), 3000)
      return () => window.clearTimeout(timer)
    }
  }, [balance])

  const text = balance === null ? null : money(Math.abs(balance))
  return (
    <section className="panel panel--register" aria-label="Checking balance">
      <h2 className="panel__title">Cash register</h2>
      <div className="register">
        <div className="register__label">CHECKING</div>
        <div className="lcd" role="status" aria-label={balance === null ? 'Balance unknown' : `Checking balance ${money(balance)}`}>
          {text === null ? (
            <span className="lcd__off">- - - -</span>
          ) : (
            [...text].map((c, i) =>
              /\d/.test(c) ? <Digit key={`${text.length - i}`} d={Number(c)} /> : <span key={`${text.length - i}`} className="lcd__sep">{c}</span>,
            )
          )}
          {delta && (
            <span key={delta.key} className={`lcd__delta ${delta.amount < 0 ? 'lcd__delta--out' : 'lcd__delta--in'}`}>
              {delta.amount < 0 ? '-' : '+'}{money(Math.abs(delta.amount))}
            </span>
          )}
        </div>
        <div className="register__foot">
          <span>as of {asOf ?? '-'}</span>
          {pending > 0 && <span className="register__pending">{money(pending)} waiting for approval</span>}
        </div>
      </div>
    </section>
  )
}
