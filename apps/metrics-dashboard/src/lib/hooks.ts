import { useCallback, useEffect, useRef, useState } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** True once the element has entered the viewport (sticky: never reverts). */
export function useInView<T extends HTMLElement>(threshold = 0.35, rootMargin = '0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        }
      },
      { threshold, rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin])
  return { ref, inView }
}

/**
 * Scroll-scrubbed progress for a sticky scene. The outer container is tall
 * (`steps` viewport heights); the inner content is `position: sticky`. Returns
 * progress in [0, 1] as the container crosses the viewport.
 */
export function useStickyProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const measure = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      if (total <= 0) {
        setProgress(rect.top < 0 ? 1 : 0)
        return
      }
      const p = Math.min(1, Math.max(0, -rect.top / total))
      setProgress(p)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return { ref, progress }
}

/** Number animated from 0 to `target` once `start` is true (rAF, ease-out). */
export function useCountUp(target: number, start: boolean, durationMs = 1600): number {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (!start || done.current) return
    if (reduced) {
      setValue(target)
      done.current = true
      return
    }
    done.current = true
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, durationMs, reduced])
  return start ? value : 0
}

/** Responsive width of a container element (ResizeObserver). */
export function useWidth<T extends HTMLElement>(initial = 720) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/** Smoothly maps a raw progress to eased sub-ranges: seg(p, a, b) ∈ [0,1]. */
export const seg = (p: number, a: number, b: number): number => {
  if (p <= a) return 0
  if (p >= b) return 1
  return (p - a) / (b - a)
}

export const easeOut = (p: number): number => 1 - Math.pow(1 - p, 3)

export function useHashRoute(): string {
  const get = useCallback(
    () => (typeof window === 'undefined' ? '' : window.location.hash.replace(/^#\/?/, '')),
    []
  )
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const onHash = () => setRoute(get())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [get])
  return route
}
