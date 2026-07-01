# Flow - golden paths report

Short, actionable, step-by-step guides so the good gesture is the easy one. Each has steps, commands,
success criteria, common failures and links. Located in `docs/golden-paths/flow/`.

| Golden path | When you reach for it |
| --- | --- |
| `start-flow-locally.md` | Run the app locally |
| `onboard-flow-developer.md` | Clone -> running app -> green checks |
| `run-flow-ci-locally.md` | Reproduce the pipeline before pushing |
| `debug-flow-error.md` | Find + fix an error via `/ops` |
| `investigate-request-id.md` | Correlate one request across client/API/server |
| `create-flow-feature.md` | Add a `feature-*` package |
| `add-flow-api-route.md` | Add a server endpoint with request-id + logging |
| `add-flow-ui-component.md` | Add a data-agnostic, accessible UI component |
| `use-ai-on-flow-pr.md` | Let an assistant help, governed |
| `review-ai-generated-pr.md` | The human checklist beyond CI |
| `release-and-rollback-flow.md` | Ship the image, recover fast |
| `accessibility-check-flow.md` | Audit routes with Pa11y/Lighthouse |
| `bundle-check-flow.md` | Keep the client bundle honest |
| `security-check-flow.md` | Lightweight local security pass |

## Conventions

- Steps first, prose last. Real commands only.
- Every path ends with success criteria + common failures.
- Paths link to the relevant audit report and source files.
