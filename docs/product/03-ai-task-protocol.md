# SignalOps — AI Task Protocol

This protocol defines the common AI-assisted change used to compare the three variants.

## Goal

Run the exact same change request on the three variants and compare cost of change, review effort, errors introduced and performance impact.

## Common AI task prompt

```text
You are working on the SignalOps codebase.

Add a new "Risk trend" capability across the app.

Requirements:
- Add a `riskTrend` field to signals with the values `up`, `stable`, or `down`.
- Show a new "Risk trend" column in `/signals`.
- The column must display a readable badge with text, not color alone.
- Add a "Risk trend" filter in `/signals`.
- Show the risk trend in `/signals/:id`.
- Update fixtures and API responses.
- Update types and validation.
- Update relevant tests.
- Update `/dx-metrics` so it can report how many files were changed for this task.
- The Signals table must remain usable with 10,000 rows.

Do not change the visual design, routes, product scope or unrelated features.
Keep the implementation consistent with the architecture of this variant.
```

## Data collection after the task

For each variant, record:

| Metric                         | How to measure                                              |
| ------------------------------ | ----------------------------------------------------------- |
| Files touched                  | `git diff --name-only                                       | wc -l` |
| Lines changed                  | `git diff --stat`                                           |
| Tests impacted                 | count changed/added test files and failing tests before fix |
| Time to first working result   | stopwatch or tool logs                                      |
| Type errors introduced         | `pnpm typecheck`                                            |
| Test failures introduced       | `pnpm test`                                                 |
| Build result                   | `pnpm build`                                                |
| Table performance after change | metrics script                                              |
| Review readability             | short qualitative note                                      |

## Fairness rule

The AI assistant must receive the same product request, with only one variant-specific repository context. Do not give extra hints to one variant unless the same hint is given to all variants.

## Defense framing

This task does not prove universal truth. It demonstrates a controlled situation where the same product change has different delivery cost depending on architecture, tooling, documentation and feedback loops.
