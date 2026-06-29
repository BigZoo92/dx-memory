# 05 — CI strategy

Four GitHub Actions workflows live in `.github/workflows/`:

| Workflow          | Status in socle | Purpose                                                                                                     |
| ----------------- | --------------- | ----------------------------------------------------------------------------------------------------------- |
| `metrics.yml`     | **active**      | install → fixtures → typecheck → test shared packages → collect metrics → upload `metrics-results` artifact |
| `friction-ci.yml` | skeleton        | Variant A build/test/ship pipeline (TODOs)                                                                  |
| `flow-ci.yml`     | skeleton        | Variant B build/test/ship pipeline (TODOs)                                                                  |
| `overfit-ci.yml`  | skeleton        | Variant C (multi-language: pnpm + cargo) pipeline (TODOs)                                                   |

## Why separate workflows per variant

The measurement protocol (`docs/product/02-measurement-protocol.md`) asks for three readable
pipelines so CI duration is comparable per variant. Each variant workflow must expose durations
clearly in logs and upload its metrics JSON as an artifact when implemented.

## `metrics.yml` (what runs today)

The shared-foundation workflow exercises exactly the socle acceptance commands and publishes the
collected (seed) metrics as an artifact named `metrics-results`. This gives us a working CI spine
before any variant exists.

## Measurement fairness

When the variant workflows are implemented they must run on the **same** runner type, Node version,
pnpm version, fixture dataset and cache conditions. Record both cold-cache (clean install, no build
cache) and warm-cache numbers where possible; the defense uses warm-cache for developer
feedback-loop comparison and cold-cache for CI/Docker discussion.

Non-automated metrics (error reproduction steps, docs pages needed) are logged by hand in
[`docs/results-log.md`](../results-log.md).
