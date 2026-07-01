# docker/friction

Single-stage Docker for the Friction variant. The Dockerfiles live next to each app
(`apps/friction-api/Dockerfile`, `apps/friction-web/Dockerfile`); build context is the repo root.

```
docker compose -f docker/friction/docker-compose.yml up --build
```

Web on http://localhost:3100, API on http://localhost:3101.
