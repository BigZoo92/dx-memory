/**
 * Tiny, dependency-free, deterministic PRNG (mulberry32).
 *
 * The same seed always produces the same sequence, so the generated dataset is identical
 * on every machine and in CI — a hard requirement for fair cross-variant comparison.
 */
export class Random {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Float in [min, max) rounded to `decimals` places. */
  float(min: number, max: number, decimals = 2): number {
    const value = this.next() * (max - min) + min
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
  }

  /** True with probability `p`. */
  bool(p = 0.5): boolean {
    return this.next() < p
  }

  /** Uniformly pick one element. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]
  }

  /** Pick one element using relative weights. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
    let roll = this.next() * total
    for (const [value, weight] of entries) {
      roll -= weight
      if (roll < 0) return value
    }
    return entries[entries.length - 1][0]
  }

  /** Pick `count` distinct elements (or all of them if `count` exceeds the pool). */
  sampleUnique<T>(items: readonly T[], count: number): T[] {
    const n = Math.min(count, items.length)
    const pool = items.slice()
    const out: T[] = []
    for (let i = 0; i < n; i++) {
      const idx = this.int(0, pool.length - 1)
      out.push(pool[idx])
      pool.splice(idx, 1)
    }
    return out
  }

  /** Zero-padded id, e.g. `id('sig', 7, 5)` → `sig_00007`. */
  static id(prefix: string, index: number, width: number): string {
    return `${prefix}_${String(index).padStart(width, '0')}`
  }
}
