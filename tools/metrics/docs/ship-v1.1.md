# Ship model v1.1 pre-result freeze

Date: 2026-07-06

This note freezes the Ship construct before recalculating any scores.

## Verdict on v1.0

Ship v1.0 is PARTIALLY ALIGNED.

It measures real shipping costs, but its score is dominated by Docker packaging efficiency:
`docker.image.size` (0.30) plus `docker.build.duration` (0.20). Image size is a real delivery
context signal, but it does not directly measure delivery confidence, rollback capability,
quality gates, or release verification. Docker build duration is relevant packaging cost, but it
also risks overlapping with Build's feedback-cost axis.

## Ship construct v1.1

Ship = the capability to turn a validated change into releasable running software with confidence.

It balances:

- delivery coordination cost: how many deployable components must be built, pushed, deployed, and
  coordinated;
- delivery confidence: whether the release path has objective gates and deploy-time readiness
  checks;
- packaging cost: Docker cost remains measured, but it is contextual and must not dominate the
  construct alone.

Repo-level release, rollback, immutable tags, and provenance are not scored here because the three
variants inherit the same gateway/Dokploy/GHCR release mechanism.

## Selected metrics

| Metric | Weight | Why |
|---|---:|---|
| `ship.healthcheck.coverage` | 0.35 | Direct deploy confidence: the platform can verify a service via a Docker healthcheck that targets a health endpoint, not merely by hoping the process started. |
| `ship.services.count` | 0.25 | Coordination cost: each image is another build, push, deploy, readiness check, and rollback unit. More services is a cost, never a bonus. |
| `variant.docker.build.duration` | 0.15 | Packaging/pipeline cost: still part of turning code into an image, but kept below confidence/coordination to avoid double-counting Build. |
| `variant.ci.errors.count` | 0.15 | Gate cleanliness: compiler/lint/build error output in the variant's own validation path. It measures the release signal result, not how many gates exist. |
| `variant.docker.image.size` | 0.10 | Artifact transfer/storage/pull context. Real cost, but not a direct confidence signal, so it is intentionally minor. |

## Rejected metrics

| Metric | Reason rejected from Ship v1.1 scoring |
|---|---|
| Repo-level GitHub CI/deploy metrics | Shared monorepo/release pipeline; scoring them would attribute the same signal to all variants and dilute real variant-level differences. |
| `variant.ci.feedback.duration` | Observational and unavailable until enough push-to-main runs exist; also duration would blur the Build/Ship boundary. |
| `variant.ci.tests.executed` / `tests.passed` | Rewards volume of tests, which is explicitly not the construct. |
| `variant.ci.tests.failed` | Test-only subset of the gate; `variant.ci.errors.count` covers the broader validation output without rewarding volume. |
| `variant.ci.warnings.count` | Warning policies differ across toolchains; too fragile as a confidence score. |
| `variant.docker.layers.count` / `layer.maxSize` | Packaging implementation detail; useful context, not central to delivery confidence. |
| `variant.docker.startup.duration` | Already belongs to Run as restore/readiness speed; scoring it in Ship would double count. |
| Rollback path | Current rollback is repo-level Dokploy/GHCR tag redeploy for all variants, not variant-level. |

After this note, the next permitted step is a single recalculation from the frozen formula.
