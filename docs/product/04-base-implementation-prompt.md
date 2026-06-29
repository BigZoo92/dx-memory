# SignalOps — Base Implementation Prompt for Claude Code

Use this prompt before generating any variant-specific implementation.

```text
You are implementing SignalOps, a B2B SaaS dashboard used as a controlled demo for a thesis defense about Developer Experience, UX and total delivery cost.

You must follow the files below as strict contracts:
- docs/00-product-contract.md
- docs/01-design-spec.md
- docs/02-measurement-protocol.md
- docs/03-ai-task-protocol.md

Critical rule:
The three variants must implement exactly the same product, UI, routes, data, states, features and acceptance criteria. Only internal architecture, tooling, CI, Docker, documentation and DX choices may differ.

Do not simplify the product to make the variant easier.
Do not change the design.
Do not invent new screens.
Do not remove required states.
Do not use fake metrics as final collected metrics.

Build the repository so the product can later be implemented in three variants:
- Variant A — Friction
- Variant B — Flow
- Variant C — Overfit

Start by creating the shared monorepo foundation:
- pnpm workspace
- Nx workspace
- shared fixtures package
- shared contracts package
- shared metrics package
- shared docs
- GitHub Actions skeletons
- Docker folder skeletons

Do not implement all three variants yet unless explicitly requested.
```
