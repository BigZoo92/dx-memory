// Les trois voix typographiques du récit :
//   <Affirm>  — la phrase-jalon (sans très gras, très grand)
//   <Lecture> — l'interprétation argumentative (serif italique, marquée « lecture »)
//   les données portent leur propre voix (mono) via les composants d'acte.

import type { CSSProperties, ReactNode } from 'react'
import { useInView } from '../lib/hooks'

export function Affirm({
  children,
  size = 'xl',
  align = 'start'
}: {
  children: ReactNode
  size?: 'xl' | 'lg' | 'md'
  align?: 'start' | 'center'
}) {
  const { ref, inView } = useInView<HTMLParagraphElement>(0.4)
  return (
    <p ref={ref} className={`affirm affirm-${size} align-${align} reveal${inView ? ' is-in' : ''}`}>
      {children}
    </p>
  )
}

export function Lecture({ children, mark = true }: { children: ReactNode; mark?: boolean }) {
  const { ref, inView } = useInView<HTMLElement>(0.5)
  return (
    <aside ref={ref} className={`lecture reveal${inView ? ' is-in' : ''}`}>
      <p>{children}</p>
      {mark && <span className="level-tag level-interpretation">lecture — interprétation de cette expérience</span>}
    </aside>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker">{children}</p>
}

export function Prose({ children }: { children: ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} className={`prose reveal${inView ? ' is-in' : ''}`}>
      {children}
    </div>
  )
}

export function Act({
  id,
  children,
  tone = 'paper',
  style
}: {
  id: string
  children: ReactNode
  tone?: 'paper' | 'dark'
  style?: CSSProperties
}) {
  return (
    <section id={id} className={`act tone-${tone}`} style={style}>
      {children}
    </section>
  )
}

/** Révélation au scroll pour un bloc quelconque. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  return (
    <div ref={ref} className={`reveal${inView ? ' is-in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
