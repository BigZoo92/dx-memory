# tools/overfit-ci — Overfit CI machinery

Deliberately over-engineered CI tooling for Variant C (Overfit). This directory exists to make a
point: correctness here is pinned down by extra configuration and scripts, at a real maintenance
cost. Flow achieves comparable isolation with one ~40-line script and no manifest.

Compare, before adding anything here, with Flow's equivalent: `scripts/flow/ci-scope-guard.mjs`.

## Files

| File                   | Role                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `scope-manifest.json`  | Declarative isolation contract: roots, allowed/forbidden scopes, required projects, expected count bounds. |
| `verify-isolation.mjs` | Enforces the manifest against the **real Nx graph**. Exits non-zero on any violation; writes `overfit-isolation.json`. |
| `cache-key.mjs`        | Computes content-hash cache keys + restore-key cascades for the six Overfit cache layers. |
| `artifact-manifest.mjs` | Hashes release-critical Docker, lockfile, OpenAPI, manifest and CI inputs into `generated/overfit/artifact-manifest.json`. |

## Isolation guard (`verify-isolation.mjs`)

Run: `pnpm overfit:scope:guard`

It proves, on every CI run:

1. The declared roots (`overfit-web`, `overfit-api`) exist as Nx nodes.
2. Their transitive dependency **closure** contains only `scope:overfit` projects — and equals the
   `tag:scope:overfit` selection (no drift between "what Overfit imports" and "what is tagged").
3. No node in the closure carries a forbidden scope (`flow`, `friction`, `lab`, `metrics`, and —
   because Overfit is self-contained — `shared`).
4. No dependency **edge** crosses from Overfit into another variant.
5. Every `requiredProjects` entry is present and the project count is within `expectedProjectCount`.

Output report: `tools/metrics/results/ci/overfit-isolation.json` (uploaded as a CI artifact).

## Cache key calculator (`cache-key.mjs`)

Run: `pnpm overfit:cache:key` (table) · `--json` · `--layer <name>` · `--github` (writes to `$GITHUB_OUTPUT`).

Six layers, each `<prefix>-<runnerOs>-<sha256(inputs)>` with a two-step restore cascade
(`<prefix>-<os>-` then `<prefix>-`):

| Layer           | Inputs (invalidators)                                        |
| --------------- | ------------------------------------------------------------ |
| `pnpm`          | `pnpm-lock.yaml`                                             |
| `nx`            | `pnpm-lock.yaml`, `nx.json`, `tsconfig.base.json`           |
| `cargoRegistry` | `Cargo.lock`                                                |
| `cargoGit`      | `Cargo.lock`                                                |
| `cargoTarget`   | `Cargo.lock`, `Cargo.toml`, `crates/**`, `apps/overfit-api/src` |
| `next`          | `pnpm-lock.yaml`, `apps/overfit-web/app`, `next.config.ts`  |

### Restoration cascade (how `overfit-ci.yml` uses it)

1. The `warm-cache` job (on `main`) primes all six layers under their **primary** keys after a full
   typecheck+build (Nx) and `cargo build`/`cargo test --no-run`.
2. A PR `gate` run computes the same keys. If its inputs are unchanged it hits the primary key
   (full warm restore). If an input changed, the primary key misses and the `restore-keys` cascade
   pulls the most recent compatible cache for that layer (OS-matched, then any) as a warm base —
   Nx/cargo/Next then only recompute what actually changed. No layer can serve a stale build: each
   tool re-validates its own inputs (Nx task hashes, cargo fingerprints, Next build manifest).
3. Docker images use two independent BuildKit GHA scopes (`overfit-web`, `overfit-api`) via
   `cache-from`/`cache-to type=gha`.

### Why this is "excessive" and Flow is not

Flow caches two things (pnpm store, `.nx/cache`) with two inline keys and stops. Overfit maintains a
manifest, a graph verifier, a key calculator, a warm-up job, six cache layers and two BuildKit
scopes. Both are correct. Only one of them is cheap to understand and change.

## Artifact manifest

Run: `pnpm overfit:artifacts:write` to regenerate, `pnpm overfit:artifacts:check` to verify.

The manifest is a small provenance ledger for the release path. It hashes the Overfit Dockerfiles,
lockfiles, OpenAPI and generated contract locks, endpoint manifest, variant Docker probe config, and
CI cache/isolation scripts. A real release can compare the aggregate hash before publishing; the
cost is that every legitimate change to these inputs now has one more generated artifact to update.
