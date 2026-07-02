# Reviewer Matrix and Ownership

This matrix maps each area of the Overfit codebase to a reviewer team and an owner. An AI change (or any change) must route to the correct reviewers for every area it touches. The routing is enforced through the AI governance package and scored by `POST /api/policy/check` (see `ai-policy.md`).

## Reviewer matrix

| Area | Path | Reviewer team | Required review |
| --- | --- | --- | --- |
| Rust domain | `crates/overfit-domain` (aggregates, value objects, enums) | Domain / Backend | Mandatory for any domain change |
| Contracts (Rust) | `overfit-contracts`, `overfit-schema-registry` | API Contracts | Mandatory for DTO or schema change |
| OpenAPI + generated | `generated/overfit/openapi.json`, `packages/overfit/contracts-generated` | API Contracts + Frontend Platform | Mandatory; generated code must be regenerated, not edited |
| API client | `packages/overfit/api-client` | Frontend Platform | Mandatory for client behavior change |
| Feature packages | `packages/overfit/feature-*` | Feature Frontend | Owning feature team per package |
| UI primitives | `packages/overfit/ui` | Design Systems | Mandatory for accessibility-affecting change |
| Read models / queries | `overfit-read-models`, `overfit-queries` | Domain / Backend | Mandatory for projection change |
| Observability / audit / policies | `overfit-observability`, `overfit-audit`, `overfit-policies` | Platform / Security | Mandatory for pipeline, redaction, or policy change |
| Docs | `docs/overfit` | Docs / Tech Writing | Mandatory for docs change |
| Quality gates / governance | `packages/overfit/quality-gates`, `ai-governance`, `generated-manifests` | Platform + Governance | Mandatory for gate or manifest change |

## Ownership matrix

Ownership assigns a single accountable owner per area (the team that maintains it long-term), distinct from reviewers (who approve a specific change):

- Domain / Backend owns the Rust crates that define behavior (domain, read-models, queries, commands, event-store).
- API Contracts owns the contract surface (OpenAPI document, contracts, schema registry) and the drift gates.
- Frontend Platform owns `api-client` and `contracts-generated` consumption.
- Feature Frontend owns the individual `feature-*` packages.
- Design Systems owns `ui` and the accessibility rules.
- Platform / Security owns observability, audit, policies, feature flags.
- Docs / Tech Writing owns `docs/overfit`.
- Governance owns the AI policy, reviewer/ownership matrices, and forbidden-files list.

## Consequence

A single product change like "Add Risk trend" touches domain, contracts, generated code, api-client, feature-signals and signal-detail, ui, read models, docs, and the governance manifests - so it must route through most of the teams above. Correct governance, but a heavy sign-off surface for a trivial product change. This is another dimension of Overfit's high cost of change.
