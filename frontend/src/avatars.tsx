import type { ReactElement } from 'react'
import type { AgentName } from './types'

// The shop's staff are animals, drawn as simple flat SVGs on a 48x48 canvas.
// Each one has its own silhouette and prop, so no two are alike even in black and white.

const ink = '#232a38'

function Bulldog() {
  return (
    <>
      <ellipse cx="10" cy="17" rx="6" ry="9" transform="rotate(-18 10 17)" fill="#a97c50" />
      <ellipse cx="38" cy="17" rx="6" ry="9" transform="rotate(18 38 17)" fill="#a97c50" />
      <rect x="9" y="9" width="30" height="28" rx="13" fill="#e8c99d" />
      <ellipse cx="24" cy="30" rx="10" ry="7" fill="#f6e2c4" />
      <path d="M14.5 17 L20.5 18.8 M33.5 17 L27.5 18.8" stroke="#6b4a2b" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17.5" cy="21.5" r="2.3" fill={ink} />
      <circle cx="30.5" cy="21.5" r="2.3" fill={ink} />
      <circle cx="18.2" cy="20.8" r="0.7" fill="#fff" />
      <circle cx="31.2" cy="20.8" r="0.7" fill="#fff" />
      <ellipse cx="24" cy="26.5" rx="3.4" ry="2.4" fill={ink} />
      <path d="M17 31.5 Q24 37 31 31.5" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M19 32.6 L20.6 35.6 L22.2 33 Z M29 32.6 L27.4 35.6 L25.8 33 Z" fill="#fff" />
      <rect x="13" y="38" width="22" height="5" rx="2.5" fill="#1f3a68" />
      <circle cx="24" cy="44.5" r="2.6" fill="#d4a82f" stroke="#8a6a12" strokeWidth="0.8" />
    </>
  )
}

function Squirrel() {
  return (
    <>
      <path d="M33 42 C47 40 49 18 36 11 C41 20 38 30 31 34 Z" fill="#c9773b" />
      <path d="M34 39.5 C43 36 45 22 37 15.5" stroke="#e5a468" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="15.5" cy="12.5" r="4" fill="#d98c4a" />
      <circle cx="15.5" cy="12.5" r="2" fill="#f2c7a0" />
      <circle cx="29.5" cy="12.5" r="4" fill="#d98c4a" />
      <circle cx="29.5" cy="12.5" r="2" fill="#f2c7a0" />
      <circle cx="22.5" cy="23" r="12" fill="#d98c4a" />
      <ellipse cx="22.5" cy="28" rx="7.5" ry="6" fill="#f6dcc0" />
      <circle cx="17.5" cy="22" r="2" fill={ink} />
      <circle cx="27.5" cy="22" r="2" fill={ink} />
      <circle cx="18.1" cy="21.3" r="0.6" fill="#fff" />
      <circle cx="28.1" cy="21.3" r="0.6" fill="#fff" />
      <ellipse cx="22.5" cy="26" rx="1.8" ry="1.3" fill={ink} />
      <rect x="21.2" y="28" width="2.6" height="3.4" rx="0.8" fill="#fff" stroke="#c9b9a0" strokeWidth="0.5" />
      <path d="M18 39.5 Q22.5 47.5 27 39.5 Z" fill="#b97b3c" />
      <path d="M17 39.5 Q22.5 33.5 28 39.5 Z" fill="#0f7f82" />
      <path d="M22.5 34.5 L22.5 32.8" stroke="#6b4a2b" strokeWidth="1.2" strokeLinecap="round" />
    </>
  )
}

function Owl() {
  return (
    <>
      <path d="M10 20 L9 6 L19 13 Z" fill="#8a6a46" />
      <path d="M38 20 L39 6 L29 13 Z" fill="#8a6a46" />
      <ellipse cx="24" cy="27" rx="15.5" ry="17.5" fill="#9a7b57" />
      <ellipse cx="24" cy="34" rx="9.5" ry="9.5" fill="#ecdcbc" />
      <path d="M19 33 q2 2 4 0 M25 33 q2 2 4 0 M19 38 q2 2 4 0 M25 38 q2 2 4 0" stroke="#b79a70" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="17" cy="23" r="7" fill="#fff" />
      <circle cx="31" cy="23" r="7" fill="#fff" />
      <circle cx="17.5" cy="23.5" r="3" fill={ink} />
      <circle cx="30.5" cy="23.5" r="3" fill={ink} />
      <circle cx="18.4" cy="22.5" r="0.9" fill="#fff" />
      <circle cx="31.4" cy="22.5" r="0.9" fill="#fff" />
      <path d="M8.5 18.5 Q24 7.5 39.5 18.5 L38 21 Q24 12.5 10 21 Z" fill="#2f7d4f" />
      <path d="M22 28 L24 32 L26 28 Z" fill="#e0a020" />
      <path d="M18 43 l-1 3 M21 43.5 l0 3 M27 43.5 l0 3 M30 43 l1 3" stroke="#e0a020" strokeWidth="1.5" strokeLinecap="round" />
    </>
  )
}

function Beaver() {
  return (
    <>
      <ellipse cx="38" cy="41" rx="8" ry="3.8" fill="#5c3a1e" transform="rotate(-20 38 41)" />
      <circle cx="13" cy="18" r="4.5" fill="#8a5a33" />
      <circle cx="13" cy="18" r="2.2" fill="#c99a6b" />
      <circle cx="35" cy="18" r="4.5" fill="#8a5a33" />
      <circle cx="35" cy="18" r="2.2" fill="#c99a6b" />
      <circle cx="24" cy="28" r="13.5" fill="#8a5a33" />
      <ellipse cx="24" cy="33" rx="8.5" ry="6.5" fill="#d2a679" />
      <ellipse cx="24" cy="29.5" rx="3.4" ry="2.3" fill={ink} />
      <rect x="20.8" y="33" width="6.4" height="5.4" rx="1.2" fill="#fff" stroke="#c9b9a0" strokeWidth="0.6" />
      <path d="M24 33 L24 38.4" stroke="#c9b9a0" strokeWidth="0.6" />
      <circle cx="18" cy="25" r="2" fill={ink} />
      <circle cx="30" cy="25" r="2" fill={ink} />
      <circle cx="18.6" cy="24.3" r="0.6" fill="#fff" />
      <circle cx="30.6" cy="24.3" r="0.6" fill="#fff" />
      <path d="M10.5 20.5 Q24 3 37.5 20.5 Z" fill="#f2c230" />
      <rect x="8.5" y="19.5" width="31" height="3.2" rx="1.6" fill="#e0a800" />
      <rect x="22.2" y="8" width="3.6" height="9" rx="1.2" fill="#e0a800" opacity="0.75" />
    </>
  )
}

function Parrot() {
  return (
    <>
      <path d="M17 11 Q18 2 22 8 Q24 0 27 8 Q32 3 31 12 Z" fill="#f0a62c" />
      <circle cx="24" cy="26" r="14" fill="#d9485f" />
      <ellipse cx="19" cy="24" rx="6" ry="6.5" fill="#fff" />
      <circle cx="19.8" cy="24.4" r="2.8" fill={ink} />
      <circle cx="20.6" cy="23.5" r="0.9" fill="#fff" />
      <path d="M27 23 C40 21 42 34 33 36 C32 32 30 30 27 30 Z" fill="#f2c230" stroke="#b98a00" strokeWidth="1" />
      <path d="M10.5 25 Q10 9 24 9 Q38 9 37.5 25" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="7.5" y="23" width="5.5" height="9" rx="2.5" fill={ink} />
      <path d="M10 32 Q11 41 21 39.5" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="22.5" cy="39.4" r="2.2" fill={ink} />
    </>
  )
}

const ART: Record<AgentName, () => ReactElement> = {
  boss: Bulldog,
  inventory: Squirrel,
  accounting: Owl,
  facilities: Beaver,
  customer_service: Parrot,
}

/** The animal's shapes only, so the delegation map can nest it inside its own <svg>. */
export function AvatarArt({ agent }: { agent: AgentName }) {
  const Art = ART[agent] ?? Bulldog
  return <Art />
}

export function Avatar({ agent, size = 40 }: { agent: AgentName; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <AvatarArt agent={agent} />
    </svg>
  )
}
