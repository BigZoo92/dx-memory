# DX Memory Production Deployment

Production is served from one public domain:

```text
https://dx-memory.enzogivernaud.fr
```

Only `dx-lab-gateway` is public. Flow, Friction, Overfit and their APIs stay on the internal Compose network.

## Architecture

```text
Internet
  |
  v
Dokploy / Traefik
  host: dx-memory.enzogivernaud.fr
  service: dx-lab-gateway
  port: 8080
  |
  v
dx-lab-gateway (nginx, public)
  |-- /                 -> static DX Lab shell
  |-- /flow/            -> flow-app:3000
  |-- /flow/assets/     -> static Flow client assets embedded in gateway
  |-- /friction/        -> friction-web:8080
  |-- /overfit/         -> overfit-web:3300
  |-- /metrics/         -> static metrics dashboard
  |-- /api/flow/*       -> flow-app:3000/api/*
  |-- /api/friction/*   -> friction-api:3101/api/*
  |-- /api/overfit/*    -> overfit-api:3200/api/*
  |-- /health           -> gateway health
  `-- /healthz/*        -> upstream health checks
```

## Images

The release workflow publishes six GHCR images from `GHCR_IMAGE_NAME`:

```text
ghcr.io/bigzoo92/dx-memory-gateway:<tag>
ghcr.io/bigzoo92/dx-memory-flow:<tag>
ghcr.io/bigzoo92/dx-memory-friction-web:<tag>
ghcr.io/bigzoo92/dx-memory-friction-api:<tag>
ghcr.io/bigzoo92/dx-memory-overfit-web:<tag>
ghcr.io/bigzoo92/dx-memory-overfit-api:<tag>
```

Each image also gets `sha-<commit>` and OCI revision/version/created metadata.

## Compose

Production uses:

```text
docker-compose.prod.yml
```

This file has no `build`, no `container_name`, and no host `ports`. `dx-lab-gateway` is the only service attached to `dokploy-network`; all app services are internal only.

Local smoke uses:

```text
docker-compose.prod.local.yml
```

It only adds `127.0.0.1:18080:8080` for the gateway and replaces the external Dokploy network with a local network.

## Dokploy

Required secrets in GitHub Actions:

```text
DOKPLOY_URL        origin of the Dokploy instance (https://host). A trailing /api is fine —
                   the script normalizes it, so /api/api can never happen.
DOKPLOY_API_KEY    sent as the x-api-key header
DOKPLOY_COMPOSE_ID fallback identity (validated; used only if DOKPLOY_COMPOSE_NAME is unset)
```

Required GitHub repository variables:

```text
GHCR_IMAGE_NAME=ghcr.io/bigzoo92/dx-memory
DOKPLOY_COMPOSE_NAME=<the Dokploy Compose service name>   # recommended, stable identity
```

Compose resolution is deterministic (`scripts/release/dokploy.mjs`):

1. If `DOKPLOY_COMPOSE_NAME` is set, the script calls `GET /api/project.all` and resolves the
   `composeId` by an EXACT match on the compose `name` (or `appName`). This survives a compose
   being removed/recreated (the id changes; the name does not) — the least-maintenance option.
2. Otherwise it validates `DOKPLOY_COMPOSE_ID` via `GET /api/compose.one`.
3. On a 404 (stale id) it prints the available composes (names + masked ids) so you can set
   `DOKPLOY_COMPOSE_NAME`. It never guesses or picks arbitrarily; 0 or >1 matches fail loudly.

> If you don't know the exact compose name, run the release once — the 404 diagnostic prints the
> inventory of visible composes; copy the right `name` into the `DOKPLOY_COMPOSE_NAME` variable.

The workflow then calls the current Dokploy API in this order:

```text
project.all (resolve, if NAME) OR compose.one (validate, if ID)
compose.one         # read current env
compose.update      # patch ONLY the release env keys + push docker-compose.prod.yml (sourceType: raw)
compose.one         # verify the release env persisted
compose.deploy      # trigger a fresh deployment (re-pulls the new immutable APP_IMAGE_TAG)
deployment.allByCompose   # best-effort: fail fast on an explicit deployment error
```

Success is then gated authoritatively by the public gateway serving the expected release
(`wait-public`: polls `/health` + `/release.json` until `version === APP_VERSION`, 15-min timeout →
fail), after which `pnpm smoke:prod` runs. `compose.deploy` alone is never treated as success.

`scripts/release/dokploy.mjs` updates only these env keys and preserves every other Dokploy env
line (secrets, domains, internal URLs):

```text
GHCR_IMAGE_NAME
APP_IMAGE_TAG
APP_VERSION
APP_COMMIT_SHA
APP_BUILD_TIME
```

## Manual Dokploy Domain Setup

Configure the domain once in Dokploy:

```text
Host: dx-memory.enzogivernaud.fr
Path: /
Service: dx-lab-gateway
Container Port: 8080
```

Do not publish ports on the Compose services. Dokploy/Traefik should reach `dx-lab-gateway` through `dokploy-network`.

## Release

Automatic release:

```text
git tag vX.Y.Z
git push origin vX.Y.Z
```

Manual redeploy of an existing tag:

```text
GitHub Actions -> Release DX Memory -> Run workflow -> release_tag=vX.Y.Z
```

For a new tag, the workflow validates builds, builds and pushes all six images, syncs Dokploy, deploys, waits for the public release metadata, then runs smoke tests against:

```text
https://dx-memory.enzogivernaud.fr
```

Manual redeploy does not rebuild images. It validates that the existing GHCR images exist and that their revision metadata matches the tag commit when the annotation is present.

## Smoke Tests

Run against production:

```powershell
$env:SMOKE_BASE_URL='https://dx-memory.enzogivernaud.fr'
$env:SMOKE_EXPECTED_RELEASE_TAG='vX.Y.Z'
pnpm smoke:prod
```

Run against local Docker:

```powershell
$env:GHCR_IMAGE_NAME='dx-memory-local'
$env:APP_IMAGE_TAG='local-smoke'
$env:APP_VERSION='local-smoke'
$env:APP_COMMIT_SHA=(git rev-parse HEAD).Trim()
$env:APP_BUILD_TIME=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
docker compose --env-file .env.production.example -f docker-compose.prod.yml -f docker-compose.prod.local.yml up -d

$env:SMOKE_BASE_URL='http://127.0.0.1:18080'
$env:SMOKE_EXPECTED_RELEASE_TAG='local-smoke'
pnpm smoke:prod

docker compose --env-file .env.production.example -f docker-compose.prod.yml -f docker-compose.prod.local.yml down
```

The smoke checks gateway health, release metadata, all public pages, first CSS/JS asset for each app, representative deep links, upstream health checks and API health routes.

## Rollback

Redeploy an older tag from GitHub Actions:

```text
Release DX Memory -> Run workflow -> release_tag=vX.Y.Z
```

The workflow validates that the older images exist before updating Dokploy.

## Known Limits

The global lint script currently has unrelated pre-existing failures in packages outside this deployment surface. The deployment workflow does not use that global lint gate; it uses focused build/typecheck/test/quality gates and the production smoke test.
