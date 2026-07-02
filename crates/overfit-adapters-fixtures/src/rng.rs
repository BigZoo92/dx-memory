//! mulberry32 PRNG, ported bit-for-bit from the shared TypeScript generator so the Rust backend
//! produces the same deterministic dataset from the same seed. JS 32-bit integer semantics map to
//! wrapping `u32` arithmetic (`Math.imul` -> `wrapping_mul`, `>>>` -> logical shift, `| 0` is a
//! no-op on the bit pattern once truncated to 32 bits).

pub struct Rng {
    state: u32,
}

impl Rng {
    pub fn new(seed: u32) -> Rng {
        Rng { state: seed }
    }

    /// Returns a float in [0, 1), identical to the TypeScript `next()`.
    pub fn next_f64(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6d2b79f5);
        let mut t = (self.state ^ (self.state >> 15)).wrapping_mul(1 | self.state);
        t = (t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t))) ^ t;
        ((t ^ (t >> 14)) as f64) / 4294967296.0
    }

    /// Inclusive integer in [min, max].
    pub fn int(&mut self, min: i64, max: i64) -> i64 {
        (self.next_f64() * (max - min + 1) as f64).floor() as i64 + min
    }

    /// Rounded float in [min, max] with `decimals` places.
    pub fn float(&mut self, min: f64, max: f64, decimals: i32) -> f64 {
        let value = self.next_f64() * (max - min) + min;
        let factor = 10f64.powi(decimals);
        (value * factor).round() / factor
    }

    pub fn boolean(&mut self, p: f64) -> bool {
        self.next_f64() < p
    }

    pub fn pick<'a, T>(&mut self, items: &'a [T]) -> &'a T {
        let idx = self.int(0, items.len() as i64 - 1) as usize;
        &items[idx]
    }

    /// Weighted choice over `(value, weight)` pairs.
    pub fn weighted<T: Copy>(&mut self, entries: &[(T, i64)]) -> T {
        let total: i64 = entries.iter().map(|(_, w)| *w).sum();
        let mut roll = self.next_f64() * total as f64;
        for (value, weight) in entries {
            roll -= *weight as f64;
            if roll < 0.0 {
                return *value;
            }
        }
        entries[entries.len() - 1].0
    }

    /// Sample `count` unique items (by index) preserving the TS `splice` behaviour.
    pub fn sample_unique<T: Clone>(&mut self, items: &[T], count: usize) -> Vec<T> {
        let n = count.min(items.len());
        let mut pool: Vec<T> = items.to_vec();
        let mut out = Vec::with_capacity(n);
        for _ in 0..n {
            let idx = self.int(0, pool.len() as i64 - 1) as usize;
            out.push(pool.remove(idx));
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_sequence() {
        let mut a = Rng::new(20260629);
        let mut b = Rng::new(20260629);
        for _ in 0..1000 {
            assert_eq!(a.next_f64().to_bits(), b.next_f64().to_bits());
        }
    }

    #[test]
    fn int_stays_in_range() {
        let mut r = Rng::new(1);
        for _ in 0..10_000 {
            let v = r.int(5, 9);
            assert!((5..=9).contains(&v));
        }
    }
}
