import type { CSSProperties } from 'react'
import styles from './States.module.css'

/** Slow-network spinner + message. */
export function Spinner({ message = 'Loading…' }: { message?: string }) {
  return (
    <span className={styles.spinner} role="status">
      <span className={styles.ring} aria-hidden="true" />
      {message}
    </span>
  )
}

export type SkeletonProps = {
  width?: number | string
  height?: number | string
  radius?: number | string
}

/** Shimmer placeholder used while data loads. */
export function LoadingSkeleton({ width = '100%', height = 16, radius }: SkeletonProps) {
  const style: CSSProperties = {
    width,
    height,
    ...(radius === undefined ? {} : { borderRadius: radius })
  }
  return <span className={styles.skeleton} style={style} aria-hidden="true" />
}

/** A stack of skeleton lines, for list/table loading states. */
export function SkeletonRows({ rows = 6, height = 18 }: { rows?: number; height?: number }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: 'grid', gap: 10, padding: '12px 0' }}>
      {Array.from({ length: rows }, (_, i) => (
        <LoadingSkeleton key={i} height={height} />
      ))}
    </div>
  )
}
