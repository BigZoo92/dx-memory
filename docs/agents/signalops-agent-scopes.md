# SignalOps agent scopes

How Claude Code and Codex agents are scoped per variant in this monorepo, and how the
skills and hooks are wired. This pass configured Flow (Variant B) and Overfit (Variant C).
It did not start any variant's implementation.

## Where the skills live

Skills are local to each app/package and duplicated for both runtimes — `.claude/skills`
for Claude Code, `.agents/skills` for Codex. Same `SKILL.md` content in both.

### Flow (Variant B)

- `apps/flow-app/.claude/skills/` and `apps/flow-app/.agents/skills/`
  - `flow-app-routing` — TanStack Start routes, app shell, server routes; keep routes thin and server-only.
  - `flow-app-visual-qa` — visual/responsive/table/header fixes without touching architecture.
  - `flow-app-tanstack-start` — Router, Query, server routes, generated route tree.
- `packages/flow/.claude/skills/` and `packages/flow/.agents/skills/`
  - `flow-architecture-boundaries` — allowed/forbidden layer edges; run boundaries/cycles.
  - `flow-effect-services` — where Effect TS is worth it (server-data-access/api-client; light in domain; minimal in ui).
  - `flow-bundle-audit` — keep fixtures/server-data-access out of the client; keep the signals Table lazy.

### Overfit (Variant C)

- `apps/overfit-web/.claude/skills/` and `.agents/skills/`
  - `overfit-web-architecture` — Next.js if confirmed by docs; same product as Flow.
  - `overfit-overengineering-control` — deliberate, measured complexity; document Build/Ship/Run/Change costs.
- `apps/overfit-api/.claude/skills/` and `.agents/skills/`
  - `overfit-api-rust-axum` — Rust + Axum if confirmed by docs; OpenAPI/codegen if planned.
  - `overfit-contract-boundaries` — same contracts, fixtures, and visible API as Flow.
- `packages/overfit/.claude/skills/` and `.agents/skills/`
  - `overfit-package-boundaries` — future Overfit packages; no cross-dependency with Flow.

## Local instruction files

Every scoped folder has both `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex), with the
same content: the strict scope, the layer/routing rules, and the recommended commands.

- `apps/flow-app/{CLAUDE,AGENTS}.md`, `packages/flow/{CLAUDE,AGENTS}.md`
- `apps/overfit-web/{CLAUDE,AGENTS}.md`, `apps/overfit-api/{CLAUDE,AGENTS}.md`, `packages/overfit/{CLAUDE,AGENTS}.md`

## Where the hooks live

Hooks are declared **once, at the repo root** — not per variant:

- Claude: `.claude/settings.json` -> `.claude/hooks/signalops-scope-guard.py`,
  `.claude/hooks/signalops-post-edit-dispatch.py`.
- Codex: `.codex/hooks.json` -> `.codex/hooks/signalops-scope-guard.py`,
  `.codex/hooks/signalops-post-edit-dispatch.py` (resolved via `git rev-parse --show-toplevel`).

The Claude and Codex copies of each script are identical.

## Why root hooks with path-based dispatch

A hook must fire regardless of which subfolder the agent is launched from, so it has to be
registered at the root. To keep variant isolation, the **script** — not the registration —
decides scope: it classifies the paths/commands an action would touch and only acts on the
variant concerned. If nothing SignalOps-related is touched, the hooks stay silent.

This keeps the hooks **light**:

- `signalops-scope-guard.py` (PreToolUse) blocks evident cross-variant edits — a Flow task
  touching Overfit, an Overfit task touching Flow, or any edit to `docs/product/` / `maquettes/`
  without an explicit opt-in. Exit 2 blocks, exit 0 allows. Bad/empty input fails open (allows).
- `signalops-post-edit-dispatch.py` (PostToolUse) runs only the *light* architecture checks for
  the touched variant. Flow code -> `pnpm audit:flow:boundaries` + `pnpm audit:flow:cycles`.
  Overfit -> prints "Overfit checks not configured yet" (its commands do not exist yet). It
  **never** runs the full test suite.

### How scope is determined

The guard reads the active scope from the `SIGNALOPS_SCOPE` env var (`flow` | `overfit` |
`friction`) or infers it from the working directory. Env vars that tune behavior:

- `SIGNALOPS_SCOPE=flow|overfit|friction` — force the active variant.
- `SIGNALOPS_ALLOW_PRODUCT=1` — allow editing `docs/product/` / `maquettes/` (only when the user
  explicitly asked).
- `SIGNALOPS_SKIP_AUDIT=1` — skip the post-edit Flow audits.

## Running an agent in the right folder

Launch the agent from the variant's folder so its local `CLAUDE.md`/`AGENTS.md` and skills load,
and the scope guard infers the right scope.

### Claude Code

```bash
cd apps/flow-app      # or packages/flow
claude

cd apps/overfit-web   # or apps/overfit-api, packages/overfit
claude
```

Optionally set the scope explicitly: `SIGNALOPS_SCOPE=flow claude`.

### Codex

```bash
cd apps/flow-app      # or packages/flow
codex

cd apps/overfit-web   # or apps/overfit-api, packages/overfit
codex
```

The root `.codex/hooks.json` is found via `git rev-parse --show-toplevel`, so it applies from any subfolder.

## Installing an external skill into a subfolder

Install from inside the target folder so the skill lands in that folder's scope, not the root:

```bash
cd apps/flow-app
npx skills@latest add mattpocock/skills

cd packages/flow
npx skills@latest add mattpocock/skills

cd apps/overfit-web
npx skills@latest add mattpocock/skills

cd apps/overfit-api
npx skills@latest add mattpocock/skills
```

After installing, confirm the files landed inside the folder's skill directories:

- `.claude/skills/*/SKILL.md`
- `.agents/skills/*/SKILL.md`

## Verifying that skills are correctly localized

```bash
# every scoped SKILL.md, Claude + Codex sides
find apps/flow-app packages/flow apps/overfit-web apps/overfit-api packages/overfit \
  -path "*/.claude/skills/*/SKILL.md" -o \
  -path "*/.agents/skills/*/SKILL.md"

# the hooks must not crash on empty input (they fail open)
python3 .claude/hooks/signalops-scope-guard.py < /dev/null || true
python3 .claude/hooks/signalops-post-edit-dispatch.py < /dev/null || true
python3 .codex/hooks/signalops-scope-guard.py < /dev/null || true
python3 .codex/hooks/signalops-post-edit-dispatch.py < /dev/null || true
```

A correctly localized skill lives under its variant's folder (e.g.
`apps/flow-app/.claude/skills/flow-app-routing/SKILL.md`), never at the repo root.
