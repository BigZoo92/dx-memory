# Risk Trend Change Surface - The Key Proof

This is the central document of the Overfit variant. It enumerates, file by file, every place a single trivial product change - adding a "Risk trend" column (`riskTrend: up | stable | down`, shown as a text badge Rising / Stable / Falling, with a Risk trend filter in `/signals`) - forced a coordinated edit in Overfit.

The product change is tiny. The change surface is not. This is the demonstrable proof that over-optimized DX raises the cost of change.

## The checklist (Overfit)

Backend - Rust:

1. `overfit-domain` - add the `RiskTrend` enum (`Up | Stable | Down`).
2. `overfit-domain` - value objects / signal entity: add the `risk_trend` field and its validation.
3. `overfit-domain` - `SignalAggregate`: include `risk_trend` in state and in the emitted domain event.
4. `overfit-events` - if the event payload shape changes, bump/adjust the EventEnvelope schema version.
5. `overfit-contracts` - add `riskTrend` to the signal transport DTO (camelCase).
6. `overfit-contracts` - update the domain-to-DTO mapper to carry `risk_trend` -> `riskTrend`.
7. `overfit-contracts` - `SignalsQuery`: add the Risk trend filter parameter.
8. `overfit-adapters-fixtures` - derive `risk_trend` from the risk score in the mulberry32 generator (no extra RNG, to stay deterministic and match the shared TS generator).
9. `overfit-read-models` - signals query projector: project `riskTrend`.
10. `overfit-read-models` - signal detail projector: project `riskTrend`.
11. `overfit-read-models` - apply the Risk trend filter in the query projector.
12. `overfit-read-models` - dx-metrics projector: reflect the new capability if surfaced there.
13. `overfit-queries` - handle the new filter parameter in the signals query handler.
14. `overfit-adapters-http` - accept and pass through the Risk trend query parameter.
15. `overfit-schema-registry` - update the schema entry for the signals endpoints.
16. Rust tests - domain enum + value object tests.
17. Rust tests - mapper tests (DTO carries `riskTrend`).
18. Rust tests - projector tests (query + detail).
19. Rust tests - filter tests (query handler + read model).
20. Rust tests - fixtures determinism test (risk_trend derivation).

Contract:

21. `generated/overfit/openapi.json` - add `riskTrend` to the signal schema and the filter to the signals operation (maintained document, ADR 0003).
22. Regenerate `packages/overfit/contracts-generated` DTOs via `pnpm overfit:contracts:generate`.
23. Regenerate the `contracts-generated` runtime validators (same command) to accept `riskTrend`.
24. `generated/overfit/contracts.lock.json` - rewritten by the generate command; verified by `overfit:contracts:check`.

Frontend - TypeScript:

25. `packages/overfit/api-client` - ensure the typed client exposes `riskTrend` and the filter param, with runtime validation.
26. `packages/overfit/feature-signals` - view-model mapper: map `riskTrend`.
27. `packages/overfit/feature-signals` - add the Risk trend column to the table.
28. `packages/overfit/feature-signals` - add the Risk trend filter control.
29. `packages/overfit/feature-signal-detail` - view-model + view: show Risk trend.
30. `packages/overfit/feature-dx-metrics` - reflect the capability where relevant.
31. `packages/overfit/ui` - if a badge primitive is needed, add/extend it (text label, never color alone; accessibility metadata).
32. `packages/overfit/generated-manifests` - regenerate the endpoint/route/architecture manifests.

Tests - TypeScript:

33. `contracts-generated` validator tests - accept `riskTrend`, reject invalid.
34. `api-client` tests - filter param + field round-trip.
35. `feature-signals` tests - column + filter behavior.
36. `feature-signal-detail` tests - Risk trend display.

Governance, docs, and gates:

37. `docs/overfit` - update the relevant docs (this variant tracks 8 docs pages).
38. ADR - record the change decision / update the affected ADR.
39. `packages/overfit/ai-governance` - update the AI change manifest for the task.
40. Changelog / release notes - record the change (release policy).
41. `packages/overfit/quality-gates` - update the snapshot / budget baselines the gates compare against.

## The total

Approximately 41 files touched, about 72 tests impacted, 9 error-repro steps, and 8 docs pages - for one product column.

## Contrast with Flow

In Flow, the same "Risk trend" change is about 6 files, about 9 tests, and 1 doc. Flow expresses the domain concept once, in a single language, without an OpenAPI codegen boundary, without event sourcing, without a per-request policy/audit/telemetry pipeline to keep in step, and without a heavy governance ceremony.

## Conclusion

Every one of the 41 edits is individually justified by a real practice - strong typing, clean boundaries, generated contracts, event sourcing, full observability, AI governance. Stacked together over a trivial product change, they produce a disproportionate change surface. That disproportion, roughly 41 files versus 6, is the thesis proof: over-optimized DX does not just cost build time or bundle size (where Overfit actually wins) - it raises the cost of change, and cost of change is what dominates the real lifetime of a product. Flow is the more balanced choice precisely because it keeps that number small while keeping the product identical.
