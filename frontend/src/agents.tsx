import type { ReactElement } from 'react'
import type { AgentName } from './types'

// Every agent gets a colour, an icon, a bubble shape and a name label, so they can be told
// apart without relying on colour alone.
export interface AgentStyle {
  label: string
  persona: string // the staff member's own name
  species: string
  thinking: string // what they are doing while a run waits on them
  role: string
  color: string
  soft: string
  bubble: 'clip' | 'box' | 'ticker' | 'notch' | 'round'
  icon: ReactElement
}

const svg = (children: ReactElement) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const AGENTS: Record<AgentName, AgentStyle> = {
  boss: {
    label: 'Boss',
    persona: 'Chief',
    species: 'bulldog',
    thinking: 'Chief is reading the slip',
    role: 'Reads tickets, decides who works on them',
    color: '#1f3a68',
    soft: '#e4eaf6',
    bubble: 'clip',
    icon: svg(
      <>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4h6v3H9z" />
        <path d="M9 12l2 2 4-4" />
      </>,
    ),
  },
  inventory: {
    label: 'Inventory',
    persona: 'Acorn',
    species: 'squirrel',
    thinking: 'Acorn is counting boxes',
    role: 'Stock, shortfalls and vendors',
    color: '#0f7f82',
    soft: '#dcf1f1',
    bubble: 'box',
    icon: svg(
      <>
        <path d="M3 8l9-5 9 5-9 5z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </>,
    ),
  },
  accounting: {
    label: 'Accounting',
    persona: 'Ledger',
    species: 'owl',
    thinking: 'Ledger is punching the calculator',
    role: 'Cash, invoices, margins, payments',
    color: '#a56a12',
    soft: '#f8ecd3',
    bubble: 'ticker',
    icon: svg(
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <rect x="8" y="6" width="8" height="3" />
        <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" />
      </>,
    ),
  },
  facilities: {
    label: 'Facilities',
    persona: 'Chip',
    species: 'beaver',
    thinking: 'Chip is jingling the keys',
    role: 'The shop space: lease and rent',
    color: '#6a4aa0',
    soft: '#ebe4f6',
    bubble: 'notch',
    icon: svg(
      <>
        <circle cx="8" cy="14" r="4" />
        <path d="M11 11l9-9" />
        <path d="M16 6l3 3M14 8l2 2" />
      </>,
    ),
  },
  customer_service: {
    label: 'Customer Service',
    persona: 'Polly',
    species: 'parrot',
    thinking: 'Polly is drafting a note',
    role: 'Drafts messages (never sends them)',
    color: '#c43d58',
    soft: '#f9e1e6',
    bubble: 'round',
    icon: svg(
      <>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8 9h8M8 12h5" />
      </>,
    ),
  },
}

export const AGENT_ORDER: AgentName[] = ['boss', 'inventory', 'accounting', 'facilities', 'customer_service']

export function agentStyle(name: string): AgentStyle {
  return AGENTS[name as AgentName] ?? AGENTS.boss
}

export function AgentBadge({ name, small = false }: { name: string; small?: boolean }) {
  const a = agentStyle(name)
  return (
    <span
      className={`badge${small ? ' badge--small' : ''}`}
      style={{ background: a.soft, color: a.color, borderColor: a.color }}
    >
      <span className="badge__icon">{a.icon}</span>
      {a.label}
    </span>
  )
}
