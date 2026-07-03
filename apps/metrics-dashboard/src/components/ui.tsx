import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'

/* ---------------------------------------------------------------- Reveal ---- */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* --------------------------------------------------------------- Tooltip ---- */
type TipContent = ReactNode | null
type TipState = { content: TipContent; x: number; y: number }
const TipCtx = createContext<{ show: (c: TipContent, e: { clientX: number; clientY: number }) => void; hide: () => void }>({
  show: () => {},
  hide: () => {}
})

export function TooltipHost({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>({ content: null, x: 0, y: 0 })
  const show = (content: TipContent, e: { clientX: number; clientY: number }) =>
    setTip({ content, x: e.clientX, y: e.clientY })
  const hide = () => setTip((t) => (t.content ? { ...t, content: null } : t))
  const flipX = tip.x > window.innerWidth - 300
  const flipY = tip.y > window.innerHeight - 160
  return (
    <TipCtx.Provider value={{ show, hide }}>
      {children}
      {tip.content && (
        <div
          className="tooltip"
          style={{
            left: flipX ? tip.x - 16 : tip.x + 16,
            top: flipY ? tip.y - 16 : tip.y + 16,
            transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`
          }}
        >
          {tip.content}
        </div>
      )}
    </TipCtx.Provider>
  )
}
export const useTip = () => useContext(TipCtx)

/* ------------------------------------------------------------------ bits ---- */
export function Chip({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <span className="chip">
      {color && <span className="chip-dot" style={{ background: color }} />}
      {children}
    </span>
  )
}

export function ScoreMeter({ value, color }: { value: number | null; color: string }) {
  return (
    <div className="meter" role="img" aria-label={`score ${value ?? 'pending'} of 100`}>
      <span style={{ width: `${value ?? 0}%`, background: color }} />
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span className="legend-item" key={i.label}>
          <span className="legend-swatch" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** A single KPI tile: big value, small label, optional sub-line and accent. */
export function StatTile({
  label,
  value,
  sub,
  accent,
  title
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: string
  title?: string
}) {
  return (
    <div className="stat-tile" title={title}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

/** A colored confidence/status pill (e.g. GitHub signal confidence). */
export function StatusBadge({ color, children, title }: { color: string; children: ReactNode; title?: string }) {
  return (
    <span className="status-badge" style={{ color, borderColor: color }} title={title}>
      <span className="status-badge-dot" style={{ background: color }} />
      {children}
    </span>
  )
}

/**
 * A pill declaring whether a section/metric compares the three variants (`variant-level`)
 * or reads the shared repo delivery chain (`repo-level`, ties across variants). This is the
 * core distinction of pass 2.5 — surfaced everywhere the two kinds of signal appear.
 */
export function ScopeBadge({ scope, title }: { scope: 'variant' | 'repo'; title?: string }) {
  const isVariant = scope === 'variant'
  const color = isVariant ? '#38e8c6' : '#7aa2ff'
  return (
    <span
      className="status-badge"
      style={{ color, borderColor: color }}
      title={
        title ??
        (isVariant
          ? 'Variant-level: measured per app, so it compares Flow / Friction / Overfit directly.'
          : 'Repo-level: the shared monorepo delivery chain — identical across the three variants, so it ties (context, not comparison).')
      }
    >
      <span className="status-badge-dot" style={{ background: color }} />
      {isVariant ? 'variant-level' : 'repo-level'}
    </span>
  )
}

export function SectionHead({
  kicker,
  title,
  lede,
  badge
}: {
  kicker: string
  title: string
  lede?: ReactNode
  badge?: ReactNode
}) {
  return (
    <Reveal className="sec-head">
      <div className="sec-kicker" style={badge ? { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } : undefined}>
        {kicker}
        {badge}
      </div>
      <h2 className="sec-title">{title}</h2>
      {lede && <p className="sec-lede">{lede}</p>}
    </Reveal>
  )
}
