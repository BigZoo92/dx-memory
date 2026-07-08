// Provenance : chaque valeur du récit peut être interrogée. Un clic ouvre la fiche
// (niveau de vérité, source, formule, limite associée). C'est l'outil de réponse
// aux questions du jury — « d'où sort ce chiffre ? » a toujours une réponse.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { EvidenceLevel } from '../bench/types'

export interface ProvInfo {
  /** Ce que la valeur mesure, en une phrase. */
  what: string
  level: EvidenceLevel
  /** Chemin de la source primaire (archive ou repo). */
  source: string
  /** Formule exacte si dérivée. */
  formula?: string
  /** Nuance ou limite attachée à la valeur. */
  note?: string
}

export const LEVEL_LABEL: Record<EvidenceLevel, string> = {
  direct: 'mesure directe',
  derived: 'dérivé reproductible',
  reviewable: 'post-hoc revu',
  interpretation: 'lecture'
}

interface OpenState {
  info: ProvInfo
  x: number
  y: number
}

const ProvContext = createContext<{ open: (info: ProvInfo, el: HTMLElement) => void }>({
  open: () => {}
})

export function ProvHost({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenState | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const open = useCallback((info: ProvInfo, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    setState({ info, x: r.left + r.width / 2, y: r.bottom })
  }, [])

  useEffect(() => {
    if (!state) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof PointerEvent && cardRef.current?.contains(e.target as Node)) return
      setState(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    window.addEventListener('scroll', () => setState(null), { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [state])

  const clampedX = state ? Math.min(Math.max(state.x, 190), window.innerWidth - 190) : 0
  const ctx = useMemo(() => ({ open }), [open])

  return (
    <ProvContext.Provider value={ctx}>
      {children}
      {state && (
        <div
          ref={cardRef}
          className="prov-card"
          role="dialog"
          aria-label="Provenance de la valeur"
          style={{ left: clampedX, top: Math.min(state.y + 10, window.innerHeight - 40) }}
        >
          <p className="prov-what">{state.info.what}</p>
          <p className={`level-tag level-${state.info.level}`}>{LEVEL_LABEL[state.info.level]}</p>
          <p className="prov-line">
            <span>source</span> <code>{state.info.source}</code>
          </p>
          {state.info.formula && (
            <p className="prov-line">
              <span>formule</span> <code>{state.info.formula}</code>
            </p>
          )}
          {state.info.note && <p className="prov-note">{state.info.note}</p>}
        </div>
      )}
    </ProvContext.Provider>
  )
}

/** Une valeur interrogeable : bouton discret qui ouvre la fiche de provenance. */
export function N({ info, children, className }: { info: ProvInfo; children: ReactNode; className?: string }) {
  const { open } = useContext(ProvContext)
  return (
    <button
      type="button"
      className={`prov-n${className ? ` ${className}` : ''}`}
      onClick={(e) => open(info, e.currentTarget)}
      title="Provenance de la valeur"
    >
      {children}
    </button>
  )
}

/** Étiquette de niveau de vérité, posée près d'une composition entière. */
export function LevelTag({ level, children }: { level: EvidenceLevel; children?: ReactNode }) {
  return (
    <span className={`level-tag level-${level}`}>
      {children ?? LEVEL_LABEL[level]}
    </span>
  )
}
