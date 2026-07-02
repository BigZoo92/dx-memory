# AI Policy

Overfit governs AI-assisted changes with a formal process: a task manifest, generated-code labels, forbidden files, reviewer and ownership matrices, and policy scoring. Like the rest of the variant, this is a legitimate practice applied at a scale that is heavy for the size of the product. The definitions live in `packages/overfit/ai-governance` and are validated by `pnpm overfit:policy:check`.

## Task manifest

Every AI change starts from a task manifest describing the intent, the scope, the files expected to change, and the artifacts to regenerate. The manifest is the record of what the change is allowed to touch. See `ai-change-manifest.md` for the concrete manifest of the "Add Risk trend" task.

## Generated-code labels

Generated artifacts are labeled and must not be hand-edited:

- `packages/overfit/contracts-generated` is marked DO NOT EDIT; it is produced by `overfit:contracts:generate`.
- `generated/overfit/openapi.json`, `contracts.lock.json`, and the JSON manifests under `generated-manifests` are generated or maintained-and-regenerated artifacts.

An AI change must regenerate these through the scripts, never patch them directly.

## Forbidden files

The AI governance package enforces a forbidden-files list. An AI change to Overfit must never touch:

- Any Flow code (`apps/flow-app`, `packages/flow`).
- Any Friction code (`apps/friction-*`).
- The shared product / design docs (`docs/product`) or the mockups (maquettes).

This keeps the variants isolated so a change to Overfit cannot silently alter Flow or the shared product.

## Reviewer and ownership matrices

Each area of the codebase maps to a reviewer team and an owner. An AI change must route to the correct reviewers for every area it touches. See `reviewer-matrix.md` for the full mapping.

## Policy scoring

The `ai` policy (in `overfit-policies`, reachable via `POST /api/policy/check`) scores a proposed change against the rules: is it within manifest scope, does it avoid forbidden files, are generated artifacts regenerated rather than edited, are the right reviewers assigned. A change that fails scoring is blocked.

## Consequence

The governance is thorough and safe. It is also one more layer that every product change must satisfy - a manifest to write, artifacts to regenerate, matrices to route through, and a score to pass. It is part of why a trivial product change is expensive in Overfit, and part of what this variant is built to demonstrate.
