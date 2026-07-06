# friction notes

some notes about the friction variant. not complete.

- api is nestjs, port 3101. web is react/vite, port 3100.
- data is generated in memory in each app. the types are copied in a few places (api, web). if you
  change the model you have to change it in more than one file.
- web talks to the api over /api (dev proxy). in docker set VITE_API_BASE.
- routes and a few response fields are copied again in
  `apps/friction-web/contract/api-contract.json` and
  `apps/friction-api/contract/api-contract.json`. run `pnpm friction:contract:check` after changing
  an endpoint. this only checks the two notes match; it does not prove the controllers and pages
  really use every field.
- run: start the api (`pnpm --filter @signalops/friction-api dev`), then the web
  (`pnpm --filter @signalops/friction-web dev`).
- docker: `docker compose -f docker/friction/docker-compose.yml up --build`.

TODO: write down where the mappers live. there are a few copies.
