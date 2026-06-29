# docker/overfit — Variant C (Overfit)

> ⏳ **Placeholder.** No Dockerfile is shipped in the socle pass.

Planned for the Variant C pass: a more complex **multi-stage, multi-language** build (Rust/Axum
backend + Next.js frontend, generated client). Smaller runtime image but heavier, more intricate
build pipeline — part of the Overfit cost story.

Expected files (later): `Dockerfile` (multi-stage, Rust + Node builders), `docker-compose.yml` for
`overfit-web` + `overfit-api`.
