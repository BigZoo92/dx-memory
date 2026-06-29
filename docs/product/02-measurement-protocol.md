# SignalOps — Measurement Protocol

This protocol exists to keep the three variants comparable.

## Principle

Measure the same actions, on the same repository, with the same machine type, same Node version, same pnpm version, same fixture dataset and same cache conditions.

Do not manually invent final numbers. If design placeholder values are used for UI preview, mark them as seed/demo values and replace them with collected metrics before the defense.

## Required metrics

| Axis   | Metric                     |    Unit | Lower is better |
| ------ | -------------------------- | ------: | --------------- |
| Build  | Install time               | seconds | Yes             |
| Build  | Typecheck time             | seconds | Yes             |
| Build  | Test time                  | seconds | Yes             |
| Build  | Build time                 | seconds | Yes             |
| Ship   | Docker build time          | seconds | Yes             |
| Ship   | GitHub Actions CI duration | seconds | Yes             |
| Front  | Bundle size                |      KB | Yes             |
| Front  | Main chunk size            |      KB | Yes             |
| Front  | Lighthouse performance     |   score | No              |
| Front  | Signals table render time  |      ms | Yes             |
| Change | Files touched for AI task  |   count | Yes             |
| Change | Tests impacted             |   count | Yes             |
| Run    | Error reproduction steps   |   count | Yes             |
| Change | Docs pages needed          |   count | Yes             |

## Recommended root scripts

```json
{
  "scripts": {
    "ci:friction": "pnpm --filter friction-web --filter friction-api ci",
    "ci:flow": "pnpm --filter flow-app ci",
    "ci:overfit": "pnpm --filter overfit-web --filter overfit-api ci",
    "metrics:all": "node packages/metrics/src/collect-all.mjs",
    "metrics:bundle": "node packages/metrics/src/bundle.mjs",
    "metrics:perf": "node packages/metrics/src/perf.mjs"
  }
}
```

## Output files

Every metrics run should write:

```txt
packages/metrics/results/friction.json
packages/metrics/results/flow.json
packages/metrics/results/overfit.json
packages/metrics/results/summary.json
```

The app page `/dx-metrics` must read from the generated JSON when available, and fall back to seed demo data only when metrics have not been collected yet.

## Cold and warm cache

Record two runs when possible:

- Cold cache: clean install, no build cache.
- Warm cache: normal developer path after dependency install and cache reuse.

The defense should primarily use warm-cache numbers for developer feedback-loop comparison, and mention cold-cache numbers for CI/Docker discussion.

## GitHub Actions

Use three separate workflows for readability:

```txt
.github/workflows/friction-ci.yml
.github/workflows/flow-ci.yml
.github/workflows/overfit-ci.yml
```

Each workflow must expose durations clearly in logs and upload metrics JSON as an artifact.

## Manual measurement log

For non-automated metrics such as error reproduction steps and docs pages needed, create a `docs/results-log.md` entry with:

- date;
- variant;
- task;
- operator;
- exact command or scenario;
- observed value;
- short note.
