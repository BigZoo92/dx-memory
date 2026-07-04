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
DOKPLOY_URL
DOKPLOY_API_KEY
DOKPLOY_COMPOSE_ID
```

Required GitHub repository variable:

```text
GHCR_IMAGE_NAME=ghcr.io/bigzoo92/dx-memory
```

The workflow calls Dokploy in this order:

```text
compose.one
compose.update
compose.loadServices
compose.deploy
```

`scripts/release/dokploy.mjs` updates only these env keys and preserves unknown Dokploy env lines:

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
