# @signalops/test-scenarios

Ten typed user scenarios that **every variant must satisfy identically**. They are the shared
acceptance checklist: each variant implements them with its own test stack, but the behavior and
expected result are fixed here.

```ts
import { SCENARIOS, getScenario, scenariosByAxis } from '@signalops/test-scenarios'
```

Each scenario carries:

| Field               | Meaning                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `id`                | stable kebab-case id                                             |
| `title`             | human title                                                      |
| `route`             | the product route it exercises                                   |
| `steps`             | ordered user steps                                               |
| `expectedResult`    | the assertion the variant must satisfy                           |
| `relatedMetricAxis` | `Build` · `Ship` · `Run` · `Change` (ties back to `/dx-metrics`) |

## The scenarios

1. Dashboard loads summary
2. User filters critical signals
3. User opens a signal detail
4. User handles empty table result
5. User sees partial error on timeline
6. User compares before/after signal data
7. User checks DX metrics
8. User simulates API error
9. User simulates slow network
10. User validates the future **Risk trend** feature (the shared AI cost-of-change task)

Scenario 10 is special: it describes the change defined in
[`docs/product/03-ai-task-protocol.md`](../../docs/product/03-ai-task-protocol.md) and is used to
measure the cost of change across the three variants.
