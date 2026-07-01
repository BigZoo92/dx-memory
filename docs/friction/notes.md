# friction notes

some notes about the friction variant. not complete.

- api is nestjs, port 3101. web is react/vite, port 3100.
- data is generated in memory in each app. the types are copied in a few places (api, web). if you
  change the model you have to change it in more than one file.
- web talks to the api over /api (dev proxy). in docker set VITE_API_BASE.
- run: start the api (`pnpm --filter @signalops/friction-api dev`), then the web
  (`pnpm --filter @signalops/friction-web dev`).
- docker: `docker compose -f docker/friction/docker-compose.yml up --build`.

TODO: write down where the mappers live. there are a few copies.
