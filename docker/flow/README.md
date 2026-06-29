# docker/flow — Variant B (Flow)

> ⏳ **Placeholder.** No Dockerfile is shipped in the socle pass.

Planned for the Variant B pass: a clean **multi-stage** build (small final image, good layer
caching, fast rebuilds) for the single `flow-app`. Its `dockerBuildTimeMs` is expected to be the
balanced reference.

Expected files (later): `Dockerfile` (multi-stage), optional `docker-compose.yml`.
