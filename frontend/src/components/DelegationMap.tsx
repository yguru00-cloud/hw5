import { AGENTS, AGENT_ORDER } from '../agents'
import { AvatarArt } from '../avatars'
import { delegationEdges } from '../events'
import type { AgentEvent, AgentName } from '../types'

// Five desks around the shop floor. Lines show who handed work to whom in the current run,
// and a paper slip flies along the newest handoff while the run is going.
const CENTER = { x: 150, y: 118 }
const RADIUS = 88
const NODE_R = 21
const POS = Object.fromEntries(
  AGENT_ORDER.map((name, i) => {
    const angle = (-90 + i * 72) * (Math.PI / 180)
    return [name, { x: CENTER.x + RADIUS * Math.cos(angle), y: CENTER.y + RADIUS * Math.sin(angle) }]
  }),
) as Record<AgentName, { x: number; y: number }>

function curve(from: AgentName, to: AgentName) {
  const a = POS[from]
  const b = POS[to]
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  // Pull the line toward the middle and sideways, so A->B and B->A do not overlap.
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const cx = mx + (CENTER.x - mx) * 0.25 + (-dy / len) * 12
  const cy = my + (CENTER.y - my) * 0.25 + (dx / len) * 12
  // Stop short of the avatar circles so the arrowhead stays visible.
  const trim = (p: { x: number; y: number }, q: { x: number; y: number }, by: number) => {
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1
    return { x: p.x + ((q.x - p.x) / l) * by, y: p.y + ((q.y - p.y) / l) * by }
  }
  const start = trim(a, { x: cx, y: cy }, NODE_R + 2)
  const end = trim(b, { x: cx, y: cy }, NODE_R + 5)
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Props {
  events: AgentEvent[]
  active: string | null
  running: boolean
}

export function DelegationMap({ events, active, running }: Props) {
  const edges = delegationEdges(events).filter((e) => e.from in POS && e.to in POS)
  const worked = new Set(events.map((e) => e.agent))
  const animate = !reducedMotion()
  return (
    <figure className="map" aria-label="Delegation map">
      <svg viewBox="0 0 300 262" role="img" aria-label="Who handed work to whom">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {edges.map((e) => {
          const id = `edge-${e.from}-${e.to}`
          const flying = e.latest && running && !e.refused
          return (
            <g key={id}>
              <path
                id={id}
                d={curve(e.from as AgentName, e.to as AgentName)}
                className={`map__edge${flying ? ' map__edge--live' : ''}${e.refused ? ' map__edge--refused' : ''}`}
                stroke={e.refused ? '#b3261e' : AGENTS[e.from as AgentName].color}
                strokeWidth={1.6 + Math.min(e.count, 4) * 0.6}
                markerEnd="url(#arrow)"
                fill="none"
              />
              {flying && animate && (
                <g className="map__slip" aria-hidden="true">
                  <rect x="-7" y="-5" width="14" height="10" rx="1.2" fill="#fffdf6" stroke="#14305a" strokeWidth="1.1" />
                  <path d="M-4 -1.8H4M-4 0.8H2.5M-4 3H3" stroke="#14305a" strokeWidth="0.8" strokeLinecap="round" />
                  <animateMotion dur="1.5s" repeatCount="indefinite">
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </g>
              )}
            </g>
          )
        })}
        {AGENT_ORDER.map((name) => {
          const a = AGENTS[name]
          const p = POS[name]
          const isActive = running && active === name
          const hasWorked = worked.has(name)
          return (
            <g key={name} transform={`translate(${p.x} ${p.y})`} className={`map__node${isActive ? ' map__node--active' : ''}${hasWorked ? ' map__node--worked' : ''}`}>
              {isActive && <circle r={NODE_R} className="map__pulse" fill={a.color} />}
              <circle r={NODE_R} fill={hasWorked || isActive ? a.soft : '#fffdf6'} stroke={a.color} strokeWidth={isActive ? 3 : 2} />
              <svg x={-19} y={-19} width={38} height={38} viewBox="0 0 48 48" overflow="visible">
                <AvatarArt agent={name} />
              </svg>
              <text y={NODE_R + 12} textAnchor="middle" className="map__label">{a.persona}</text>
              <text y={NODE_R + 22} textAnchor="middle" className="map__role">{a.label}</text>
            </g>
          )
        })}
      </svg>
      {edges.length === 0 && <figcaption className="map__hint">Handoffs light up here as the staff pass slips to each other.</figcaption>}
    </figure>
  )
}
