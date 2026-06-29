# docker/friction — Variant A (Friction)

> ⏳ **Placeholder.** No Dockerfile is shipped in the socle pass.

Planned for the Variant A pass: a deliberately **simple, single-stage** Docker setup (large image,
no layer optimization, slow rebuilds) — part of the Friction cost story measured as
`dockerBuildTimeMs` in `@signalops/metrics`.

Expected files (later): `Dockerfile`, optional `docker-compose.yml` for `friction-web` +
`friction-api`.
