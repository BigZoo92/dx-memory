# Flow - Plan Run / Accessibilite / Golden Paths / Gouvernance IA

> Statut: PLAN VALIDE POUR REDACTION, EN ATTENTE DE VALIDATION POUR IMPLEMENTATION.
> Aucune implementation n'a ete faite a ce stade (seul ce fichier de plan est cree).
> Aucun autre fichier n'a ete cree ou modifie. Le futur front de comparaison entre les
> trois variantes (Friction / Flow / Overfit) est explicitement hors scope.

## Decisions validees (2026-06-30)

Questions ouvertes tranchees par le porteur du projet :

1. Demo controls : restent dans Settings. On ajoute seulement une carte "Operational health"
   qui renvoie vers `/ops`. `/ops` devient la surface Run dediee.
2. `/api/logs` : accepte uniquement comme endpoint local-first de demonstration. Stockage
   memoire uniquement, aucune persistance, redaction obligatoire, taille de payload bornee,
   pas de secrets, pas de cookies, pas d'`Authorization`, pas de prompts bruts, pas de stack
   complete exposee au client, pas de dump fixtures. La page `/ops` fusionne le memory store
   client et le memory store serveur.
3. CI Chromium : Pa11y CI + Lighthouse CI acceptes, mais seulement dans `flow:ci:full` et dans
   un job CI separe. `flow:ci:fast` reste rapide. Le job a11y ne ralentit pas la boucle quotidienne.
4. `X-Request-Id` : valide. Le requestId est present dans le corps `ApiError` ET dans l'en-tete
   `X-Request-Id`. Aucun changement de contrat partage.

Contraintes obligatoires (a respecter par la passe d'implementation) :

- Rester strictement dans le scope Flow.
- Ne pas modifier `packages/metrics/src/types.ts`. Les nouvelles metriques Run vivent dans
  `packages/flow/domain`, `packages/flow/feature-dx-metrics` ou `packages/flow/observability`.
- Ne pas modifier Friction, Overfit, ni les futurs fichiers du front comparatif.
- Ne pas installer de SDK Sentry. Ne pas installer de stack OpenTelemetry complete.
- Ne pas ajouter Playwright ni Storybook.
- Garder `@signalops/flow-observability` core framework-free et leger.
- Isoler l'integration Effect dans `@signalops/flow-observability/effect` pour ne pas gonfler le bundle client.
- Budget bundle chiffre avant implementation (section 17).
- Audits a11y de `/signals/:id` : utiliser un ID stable ou un script qui recupere un signal existant.
- `flow:ci:fast` reste rapide ; `flow:ci:full` peut etre plus exhaustif.
- Checks IA : bloquants seulement pour secrets, cross-variant et boundaries au depart ; le reste en warning.

## 1. Resume executif

Flow v2 a un socle technique fort sur Build et Change (packagisation par feature, Nx, Project
References, dependency-cruiser, Effect aux edges, erreurs typees exhaustives, requestId isomorphe,
bundle analyzer, Docker, CI). Le diagnostic confirme un trou net sur Run et sur Change gouverne :

- erreurs parfaitement typees et mappees vers un `ApiError` unique, mais aucun log nulle part
  (zero `console.*`, zero `Effect.Logger`), aucun handler global (`window.onerror` /
  `unhandledrejection`), requestId transporte dans le corps mais pas en en-tete (correlation
  client/serveur impossible automatiquement) ;
- pas d'Error Boundary React, pas de surface operationnelle (inbox d'erreurs, alertes, pack de diagnostic) ;
- metriques Run cote produit limitees au perf frontend (bundle, Lighthouse, table render) :
  pas de MTTD / MTTR / compteurs d'erreurs ;
- accessibilite globalement saine (landmarks, labels, focus-visible, badges texte+couleur,
  reduced-motion) mais avec quelques risques concrets (table virtualisee, en-tetes `div` au lieu
  de `th scope`, pas de `aria-sort`, contrastes de badges, pas de skip link, menus type dialog
  sans semantique) ;
- gouvernance IA presente au niveau protocole et skills (hooks scope-guard, `03-ai-task-protocol.md`,
  skill `analyzing-total-delivery-cost`) mais aucun check automatise (secret scan, fichiers
  interdits, manifest PR IA, politique OWASP LLM).

Le plan ajoute cinq blocs strictement dans le scope Flow : (1) un package
`@signalops/flow-observability` leger et local-first inspire d'OpenTelemetry/Sentry/Effect ;
(2) une surface Ops (`/ops` + `@signalops/flow-feature-ops`) ; (3) une section Run dans `/dx-metrics` ;
(4) un appareil d'accessibilite verifiable (Pa11y CI + Lighthouse CI + assertions de roles) avec
corrections ciblees ; (5) une gouvernance IA executable (`pnpm flow:ai-pr-check`, manifest, politique
OWASP LLM) ; le tout cable dans des commandes one-shot (`flow:doctor`, `flow:onboard`, `flow:ci`,
`flow:a11y`, `flow:ai-pr-check`) et la CI. Chaque ajout est mesure contre le modele de cout total de
livraison (skill `analyzing-total-delivery-cost`) avec des stop rules pour ne pas glisser vers Overfit.

## 2. Perimetre exact

- `apps/flow-app` et `packages/flow/*` uniquement.
- Nouveaux packages `packages/flow/observability` et `packages/flow/feature-ops`.
- Nouvelles primitives et composants dans `packages/flow/ui`.
- Nouvelle route `/ops` et route serveur `/api/logs`, plus durcissement de `__root.tsx`,
  `server/respond.ts`, `api-client`, `server-data-access`.
- Scripts racine `scripts/flow/*.mjs` et alias `pnpm` (prefixe `flow:`).
- Docs `docs/golden-paths/flow/*` et rapports `docs/audit/flow/*`.
- Outillage a11y dev/CI (Pa11y CI, Lighthouse CI) en devDependencies + config + job CI separe.
- Regles `.dependency-cruiser.cjs` pour les deux nouveaux packages.
- `X-Request-Id` : ajout additif (header) cote api-client + lecture serveur, sans changer le contrat `ApiError`.

## 3. Hors perimetre

- Friction et Overfit (aucune dependance, aucun fichier).
- Le front comparatif inter-variantes et le dashboard global inter-variantes (plus tard).
- Toute integration SaaS obligatoire (Sentry hote, OTel collector, base de donnees).
- Modification de `packages/metrics` (et en particulier de `packages/metrics/src/types.ts`).
- Modification des contrats partages `packages/contracts` (l'en-tete requestId ne necessite pas de changement de contrat).
- Changement des routes produit existantes ou du comportement produit visible (contrat de
  `docs/product/00-product-contract.md` respecte).
- Storybook, Playwright, stack E2E lourde, chart library lourde, SDK Sentry, stack OpenTelemetry complete.

## 4. Docs officielles consultees

| Source | URL | Choix qu'elle informe |
| --- | --- | --- |
| OWASP Top 10 for LLM Applications 2025 | https://genai.owasp.org/llm-top-10/ , https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/ | Politique IA et checks `flow:ai-pr-check` mappes sur LLM01..LLM10 |
| OpenTelemetry Logs Data Model | https://opentelemetry.io/docs/specs/otel/logs/data-model/ | Schema de `FlowLogEvent`, mapping SeverityNumber (DEBUG 5-8, INFO 9-12, WARN 13-16, ERROR 17-20, FATAL 21-24), TraceId/SpanId optionnels |
| Sentry React - Sensitive Data / Breadcrumbs | https://docs.sentry.io/platforms/javascript/guides/react/data-management/sensitive-data/ | Modele breadcrumbs + redaction type `beforeSend`/`beforeBreadcrumb`, scrubbing avant emission |
| Effect - Observability / Logging | https://effect.website/docs/observability/logging/ | Adapter Effect Logger (`Logger.replace`, `Effect.annotateLogs`, `Effect.withLogSpan`), reuse server-data-access et api-client |
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | Criteres cibles : 1.3.1, 1.4.1, 1.4.3, 2.1.1, 2.4.1, 2.4.7, 2.4.11 Focus Not Obscured (AA), 2.5.8 Target Size 24x24 (AA), 4.1.2, 4.1.3 |
| vitest-axe (chaance/vitest-axe) | https://github.com/chaance/vitest-axe | Constat bloquant : incompatible happy-dom (bug `isConnected`) ; oriente vers Pa11y/Lighthouse au niveau route |
| Pa11y CI | https://github.com/pa11y/pa11y-ci | Gate a11y principal (Chromium headless, axe-core + HTML_CodeSniffer, detecte le contraste) |
| Lighthouse CI (@lhci/cli) | https://github.com/GoogleChrome/lighthouse-ci | Score a11y + budgets perf/bundle Run en une passe (`assert` `categories:accessibility`) |
| nektos/act | https://github.com/nektos/act , https://nektosact.com/usage/runners.html | `flow:ci:act` optionnel ; limites (linux only, images partielles, conflits de ports, dependance Docker) |
| TanStack Router/Start - Error boundaries | https://tanstack.com/start/latest/docs/framework/react/guide/error-boundaries , https://tanstack.com/router/latest/docs/guide/not-found-errors | `defaultErrorComponent`, `errorComponent`, `notFoundComponent`, `reset()` pour `FlowErrorBoundary` |

Choix de fond justifie par ces sources : pas de SDK Sentry ni de SDK OTel cote client. On reprend
le modele de donnees d'OTel (champs, severites) et le modele d'usage de Sentry (breadcrumbs,
scrubbing, grouping par signature) dans un runtime maison minimal, et on reutilise le Logger d'Effect
deja present aux edges. Cote a11y, le bug happy-dom de vitest-axe rend l'axe au niveau composant
couteux ; on privilegie Pa11y CI + Lighthouse CI (vrai Chromium, contraste inclus) plus des
assertions de roles Testing Library sans dependance supplementaire.

## 5. Diagnostic de l'existant (Partie 1)

Reponses aux 17 questions, ancrees fichier:ligne.

1. Erreurs creees : six `Data.TaggedError` dans `packages/flow/effect/src/errors.ts`
   (`FlowValidationError`, `FlowNotFoundError`, `FlowApiError`, `FlowNetworkError`,
   `FlowTimeoutError`, `FlowUnexpectedError`). Sites de `fail` : `server-data-access/src/query/parse.ts`
   (validation), `server-data-access/src/effect/errors.ts` (`failNotFound`/`failValidation`),
   `server-data-access/src/effect/run.ts:43-48` (defects -> `FlowUnexpectedError`),
   `api-client/src/client.ts` (network/timeout/api).
2. Erreurs catchees : serveur dans `packages/flow/server-data-access/src/effect/run.ts`
   (`runApiEffect`, `Exit.match` + `Cause.failureOption`), client dans
   `packages/flow/api-client/src/client.ts` (`run()`), React via `QueryState`
   (`packages/flow/ui/src/states/QueryState.tsx`) et `SignalsScreen` (instanceof `ApiRequestError`).
3. Mapping `ApiError` : point unique `packages/flow/effect/src/api-error.ts` (`toApiErrorPayload`,
   switch exhaustif sur `_tag` + statut). Forme du contrat dans `packages/contracts/src/api.ts` :
   `{ code, message, details?, requestId }`. Reutilise cote serveur (`server/respond.ts` `handleEffect`)
   et client (`toApiRequestError`).
4. requestId genere : `packages/flow/effect/src/request-id.ts` (`makeRequestId`, `crypto.randomUUID`,
   prefixe `req_`), appele une fois par requete serveur (`run.ts`) et client (`client.ts`).
5. requestId propage : present dans le corps JSON de l'enveloppe (`api-error.ts` `envelope()`),
   pas d'en-tete `X-Request-Id`. Gap de correlation (corrige par ce plan).
6. requestId affiche : `packages/flow/ui/src/states/ErrorState.tsx:23`, passe par `QueryState`, et `SignalsScreen`.
7. L'utilisateur voit les erreurs : `ErrorState` (plein ecran, `role="alert"`), `QueryState`
   (wrapper loading/error/data), `Banner` (`role="status"`). Pas de toast, pas d'Error Boundary React.
8. Erreurs perdues : defects reduits au message sans stack dans `run.ts:43-48` (jamais logue cote
   serveur) ; timeout client sans cause d'origine ; retries intermediaires non traces.
9. Logs manquants : entree/sortie de route serveur, echecs de validation, not-found, retry client,
   timeout client, parsing d'erreur API, defect 500, changements d'etat demo (detaille en 7.3).
10. Demo controls : etat module dans `packages/flow/api-client/src/demo-controls.ts` (`slowNetwork`
    3000 ms, `forceError`), `useSyncExternalStore`, applique dans `client.ts` `applyDemoControls`.
    UI dans `packages/flow/feature-settings/src/SettingsScreen.tsx`. Route serveur
    `apps/flow-app/src/routes/api/simulate-error.ts`. Health : `apps/flow-app/src/routes/api/health.ts`.
11. Metriques Run : `packages/flow/feature-dx-metrics/src/DxMetricsScreen.tsx` montre
    Build/Ship/Run(perf)/Change ; l'historique CI est du mock. Aucune metrique operationnelle (MTTD/MTTR/compteurs).
12. A11y deja bonne : `html lang`, landmarks `main`/`nav`/`header`/`footer`, `nav aria-label`,
    breadcrumb `aria-current`, labels de formulaires associes, `Toggle role="switch"`, `Icon aria-hidden`,
    `role="alert|status|img"`, `:focus-visible` orange global (`packages/flow/ui/src/styles/tokens.css`),
    reduced-motion present.
13. A11y risquee : table virtualisee qui sort les lignes du DOM
    (`packages/flow/feature-signals/src/SignalsTable.tsx`), en-tetes `div` non `th scope`, pas de
    `aria-sort`, contrastes badges blue/amber/grey, pas de skip link, menu notifications sans semantique
    dialog/focus trap, `NewSignalDialog` sans `aria-invalid`/`aria-describedby`, `RiskScoreCell` couleur
    seule, sidebar active sans `aria-current`.
14. Golden paths existants : `docs/engineering/01-local-setup.md` et `05-ci-strategy.md` jouent ce role
    implicitement ; pas de `docs/golden-paths/`.
15. Commandes DX existantes : `dev:flow`, `build:flow`, `test:flow`, `typecheck:flow`, `lint:flow`,
    `ci:flow`, `docker:build:flow`, `metrics:flow`, `analyze:flow`, `audit:flow:bundle`,
    `audit:flow:boundaries`, `audit:flow:cycles` (voir `package.json`). Manquent : doctor, onboard,
    a11y, ai-pr-check, ci:fast/full, ops:test.
16. Gouvernance IA presente : hooks `.claude/hooks/signalops-scope-guard.py` +
    `signalops-post-edit-dispatch.py` (via `.claude/settings.json`), `docs/product/03-ai-task-protocol.md`,
    `docs/agents/signalops-agent-scopes.md`, CLAUDE.md/AGENTS.md par variante, skills
    (`flow-architecture-boundaries`, `flow-effect-services`, `flow-bundle-audit`, `analyzing-total-delivery-cost`).
17. Gouvernance IA manquante : aucun check automatise (secret scan, fichiers interdits au-dela du
    scope-guard, diff de dependances, manifest PR IA, politique OWASP LLM, preuve attendue par PR).

Note d'etat : `packages/flow-data-access`, `packages/flow-domain`, `packages/flow-ui` au niveau racine
ne contiennent que `dist-types/` (artefacts stale, non packages) ; ne pas les confondre avec les
packages v2 sous `packages/flow/`.

## 6. Architecture proposee

Trois ajouts de noeuds au graphe, alignes sur la convention `@signalops/flow-*` :

```txt
@signalops/flow-observability   packages/flow/observability   (framework-free core + subpath /effect)
@signalops/flow-feature-ops     packages/flow/feature-ops     (ecran Ops)
flow-ui (etendu)                packages/flow/ui              (primitives a11y + composants Ops, data-agnostic)
```

Flux de donnees (texte) :

```txt
server-data-access --(Effect Logger adapter)--> flow-observability (memory store serveur) --> /api/logs (GET)
api-client --------(client logger + breadcrumbs)--> flow-observability (memory store client)
window.onerror / unhandledrejection / route change --> flow-observability (client)
flow-observability (client) --(POST borne + redacted, optionnel)--> /api/logs --> memory store serveur
feature-ops --(useQuery)--> /api/logs (server store) + store client local + /api/health
            --> fusion client + serveur --> flow-ui composants Ops (props plain)
feature-dx-metrics --(compteurs live observability + seed flow/domain)--> section Run
```

Arbitrages structurants :

- Package observability separe (et non extension de `flow-effect`) : RETENU. `flow-effect` est
  volontairement minuscule et isomorphe (contracts + effect), importe par client ET serveur ; y
  empiler memory store, breadcrumbs, alertes, redaction et pack diagnostic le ferait grossir et
  risquerait des fuites dans le bundle client. Un noeud `observability` distinct rend le graphe plus
  demonstratif et permet des boundaries nettes. Le core reste framework-free ; un subpath
  `@signalops/flow-observability/effect` isole l'adaptateur Effect (seul a importer `effect`).
- Surface Ops dediee `/ops` + `feature-ops` : RETENU. Settings garde ses demo controls et gagne une
  carte compacte "Operational health" qui lie vers `/ops`. `/ops` fusionne memory store client + serveur.
- En-tete `X-Request-Id` client -> serveur : RETENU (ajout additif a `api-client` + lecture dans
  `RequestContext`), pour correler logs client et serveur. requestId present dans le corps `ApiError`
  ET dans l'en-tete. Aucun changement du contrat `ApiError`.

## 7. Observability / logging / alerting (Partie 2)

### 7.1 Package `@signalops/flow-observability`

Responsabilites : types d'evenements, logger structure, breadcrumbs, alert rules, diagnostic pack,
redaction, severity mapping, helpers client/server, adaptateur Effect Logger. Dependances autorisees :
`@signalops/contracts`, et en option `@signalops/flow-effect` + `effect` (uniquement dans le subpath
`/effect`). Interdictions : React, flow-ui, feature-*, server-data-access, fixtures, app, api-client.

Arborescence proposee :

```txt
packages/flow/observability/
  package.json            exports: "." (core, framework-free) + "./effect" (adapter)
  project.json            targets typecheck/build/test/lint
  tsconfig.json
  vitest.config.ts        environment: node
  src/index.ts
  src/types.ts            FlowLogEvent, FlowLogLevel, FlowRuntime, FlowBreadcrumb, FlowAlert, AlertRule, DiagnosticPack, RunCounters
  src/severity.ts         level <-> OTel SeverityNumber
  src/redact.ts           redaction cles/valeurs + troncature
  src/memory-store.ts     ring buffer borne (logs + breadcrumbs) + snapshot
  src/logger.ts           createLogger(): console (dev) + memory store, applique redact
  src/breadcrumbs.ts      trail borne
  src/alerts.ts           moteur de regles fenetrees + dedup + reset
  src/diagnostic-pack.ts  assemble un pack JSON redige
  src/run-counters.ts     compteurs Run derives du store (handled/unhandled/timeouts/retries/coverage/alertes)
  src/effect.ts           subpath /effect: Logger.replace + annotate helpers
  src/*.test.ts
```

### 7.2 Modele d'evenement (2.2)

```ts
type FlowLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
type FlowRuntime  = 'client' | 'server' | 'api-client' | 'effect' | 'ci' | 'demo'

type FlowBreadcrumb = {
  timestamp: string
  category: 'route' | 'filter' | 'request' | 'retry' | 'ui' | 'demo'
  message: string
  level?: FlowLogLevel
  data?: Record<string, unknown> // redige
}

type FlowLogEvent = {
  id: string                 // requis
  timestamp: string          // requis (ISO)
  level: FlowLogLevel        // requis
  runtime: FlowRuntime       // requis
  variant: 'Variant B - Flow'// requis (constante)
  message: string            // requis (redige)
  severityNumber?: number    // optionnel (mapping OTel, derive)
  requestId?: string         // optionnel
  route?: string             // optionnel
  method?: string            // optionnel
  status?: number            // optionnel
  errorTag?: string          // optionnel (_tag Flow*)
  errorCode?: string         // optionnel (code ApiError)
  durationMs?: number        // optionnel
  retryCount?: number        // optionnel
  userAction?: string        // optionnel
  breadcrumbs?: FlowBreadcrumb[] // optionnel (snapshot redige)
  safeContext?: Record<string, unknown> // optionnel (redige)
}
```

- Champs requis : `id`, `timestamp`, `level`, `runtime`, `variant`, `message`.
- Champs optionnels : tous les autres (presents selon la source).
- Champs interdits / a rediger : `Authorization`, `Cookie`, tokens/bearer/JWT, cles API, mots de
  passe, prompts bruts, dump complet de fixtures, PII (emails, noms issus de donnees reelles),
  variables d'env secretes, stack trace dans tout evenement expose au client (la stack reste cote
  serveur uniquement, jamais renvoyee ni postee).
- Redaction (`redact.ts`) : denylist par cle (`authorization`, `cookie`, `token`, `apikey`,
  `password`, `secret`, `prompt`, `email`), regex de valeurs (bearer, JWT), troncature des valeurs
  longues, allowlist pour les cles connues sures (`requestId` au format `req_*` conserve). Le module
  n'emet jamais sans passer par `redact`.
- Severity mapping (`severity.ts`, d'apres OTel) : debug=5, info=9, warn=13, error=17, fatal=21 ;
  mapping inverse pour l'affichage.

### 7.3 Logger (2.3)

- Console structuree en dev, ecriture dans un memory store borne (par defaut 100 logs + 50 breadcrumbs)
  pour la demo, export JSON via diagnostic pack. Aucun SaaS, aucun stockage persistant lourd.
- Utilisable depuis `handleEffect` (`apps/flow-app/src/server/respond.ts`), `flow-api-client`,
  l'Error Boundary React, les etats d'erreur Query, les demo controls Settings, et les scripts CI simples.
- Cote serveur, l'adaptateur Effect (`/effect`) installe un `Logger.replace` qui ecrit dans le memory
  store serveur, plus `Effect.annotateLogs({ requestId, route, method, status })` et `Effect.withLogSpan`
  pour `durationMs`. On logue explicitement dans le chemin d'echec de `run.ts:43-48` (defect 500),
  `failNotFound`/`failValidation`, et a l'entree/sortie de `runApiEffect`.
- Cote client, `api-client` logue retry (avec `retryCount`), timeout, parsing d'erreur API, et depose
  des breadcrumbs. Les handlers globaux capturent `unhandledrejection` et `window.onerror`. Capture :
  erreurs API, reseau, timeouts, retries, validation, not found, defects, unhandledrejection,
  window.onerror, slow request, forced demo error.

### 7.4 Breadcrumbs (2.4)

Trail leger borne, alimente aux points clefs : `route changed to /signals`,
`filter changed severity=critical`, `request started GET /api/signals`,
`request failed requestId=...`, `retry scheduled`, `partial-error displayed`, `user clicked reset`.
Snapshot redige inclus dans `FlowLogEvent.breadcrumbs` au moment d'une erreur et dans le pack diagnostic.

### 7.5 Error Inbox UI (2.5)

Route `/ops` servie par `feature-ops`, plus une carte "Operational health" dans Settings qui lie vers
`/ops`. La page fusionne le memory store client (local) et le memory store serveur (via `/api/logs`
GET), dedup par `id`. Elle affiche : erreurs recentes, niveau, route, requestId, tag Effect, status,
nombre d'occurrences, premiere/derniere occurrence, impact, etat new/investigating/resolved (etat local
en memoire demo), bouton copy requestId, bouton copy diagnostics, bouton download diagnostic pack,
bouton clear demo logs, lien runbook. Le grouping (occurrences) se fait par signature
`errorTag + route + status` (modele Sentry adapte). Style coherent SignalOps (cards, badges texte,
table lisible, alert panels, responsive).

### 7.6 Alert rules (2.6)

Regles simples evaluees dans `alerts.ts`, sur le memory store (fenetres glissantes) :

| Regle | Condition | Severite |
| --- | --- | --- |
| Spike 500 | 3 erreurs status 500 en 60 s | critical |
| Timeouts | 3 timeouts en 60 s | warning |
| Validation repetee | 1 validation echouee 5 fois | warning |
| Impact produit | echec sur route `/signals` | product-impact |
| Client non gere | 1 erreur client non geree | critical |
| Forced demo | forced demo error declenchee | demo-only |

- Ou evaluees : cote client a chaque insertion dans le memory store et au montage de `/ops` ; cote
  serveur a l'ecriture d'un log d'echec (recompute leger). Pas de timer permanent : evaluation a
  l'evenement (cout borne).
- Affichage : `OperationalAlertCard` sur `/ops`, avec `aria-live="assertive"` pour les nouvelles
  alertes critiques.
- Anti-bruit : dedup par signature + fenetre, cooldown par regle (une alerte active n'est pas re-emise
  tant qu'elle n'est pas resolue ou expiree).
- Reset : bouton "clear demo logs" vide le store et les alertes ; reset auto a l'expiration de fenetre.

### 7.7 Diagnostic pack (2.7)

Export `signalops-diagnostic-pack.json` assemble par `diagnostic-pack.ts` (cote client, download Blob) :
variant, timestamp, app version, requestId courant, route courante, 20 derniers logs, 20 derniers
breadcrumbs, demo flags actifs, health status, resume des metriques bundle si disponible, user agent
(sur), sans secrets, prompt brut, token, cookie, Authorization, stack complete, ni dump complet de
fixtures. Tout passe par `redact`.

### 7.8 Run metrics (2.8)

Section Run renforcee dans `/dx-metrics` : MTTD, MTTDx (time to diagnose), MTTR (simule), handled errors,
unhandled errors, timeouts, retries, requestId coverage, alert count, diagnostic pack available. Les
compteurs derivables (handled/unhandled/timeouts/retries/alert count/requestId coverage) sont calcules
par `run-counters.ts` dans `@signalops/flow-observability` a partir du memory store client ; MTTD/MTTR
sont des valeurs seed clairement labellisees `demo/seed`. Les types de metriques Run vivent dans
`packages/flow/domain` (types purs) ; l'affichage dans `packages/flow/feature-dx-metrics`. Aucune
modification de `packages/metrics`.

## 8. Error handling complet (Partie 3)

Matrice par categorie (catchee / loguee / affichee / correlee / testee) :

| Categorie | Catchee (fichier) | Loguee (ajout) | Affichee | Correlee | Testee |
| --- | --- | --- | --- | --- | --- |
| Server error | run.ts `runApiEffect` | Effect Logger annotate (server store) | ErrorState via Query | requestId (header+body) | unit run.ts + route |
| API client error | client.ts `run()` | client logger | QueryErrorPanel / ErrorState | requestId | unit api-client |
| React render error | nouveau `FlowErrorBoundary` | onError -> observability | fallback Boundary | requestId si dispo | unit boundary |
| Query partial error | feature screens via QueryState | client logger | `QueryErrorPanel` (inline) | requestId | unit ui |
| Validation | parse.ts | server logger + `details` | ErrorState + `ErrorMessage` (details) | requestId | unit parse |
| Not found | effect/errors.ts `failNotFound` | server logger | notFoundComponent / ErrorState | requestId | unit + route 404 |
| Timeout | client.ts `timeoutFail` | client logger (durationMs) | ErrorState (retry) | requestId | unit api-client |
| Abort | client.ts (signal) | breadcrumb seulement | silencieux (volontaire) | requestId | unit api-client |
| Demo forced error | simulate-error.ts + demo-controls | logger demo + breadcrumb | Banner + ErrorState | requestId | unit + ui settings |
| Unexpected defect | run.ts:43-48 | server logger (stack server-only) | ErrorState 500 | requestId | unit run.ts |

`X-Request-Id` : ajoute par `api-client` sur chaque requete et renvoye par `server/respond.ts` sur
chaque reponse (succes et erreur). Le requestId reste aussi dans le corps `ApiError`.

Composants a creer (decrits, non codes) :

- `FlowErrorBoundary` : branche sur `defaultErrorComponent` de TanStack Start + une classe React
  `componentDidCatch` pour les erreurs hors routeur ; reporte a observability, propose `reset()`.
- `QueryErrorPanel` : panneau d'erreur inline (non plein ecran) pour erreurs partielles, avec requestId et retry.
- `RequestIdBadge` : pill mono avec bouton copy (`aria-label`, feedback `aria-live`).
- `CopyDiagnosticsButton` : copie le pack redige dans le presse-papier.
- `OperationalAlertCard` : carte d'alerte (severite texte+couleur, `aria-live`).

## 9. Ops UI plan (Partie 9)

Surface : `/ops` (home Run) + carte "Operational health" dans Settings. Style : design system Flow
(fond clair, cards blanches, accent orange `--so-accent`, badges texte, tables propres, timeline legere,
petits graphes SVG sans lib lourde, responsive). Composants (presentationnels dans `flow-ui`,
data-agnostic) : `ErrorInboxTable`, `OperationalAlertCard`, `RequestIdBadge`, `DiagnosticPackButton`,
`BreadcrumbTimeline`, `RunHealthSummary`, `AccessibilityScoreCard`, `AiGovernanceChecklist`,
`GoldenPathCard`. Le cablage data (`useQuery` vers `/api/logs` et `/api/health`, fusion client+serveur,
assemblage du pack) vit dans `feature-ops`. `flow-ui` n'importe jamais `flow-observability` : chaque
composant definit ses propres props plain, `feature-ops` adapte les types observability vers ces props
(coherent avec la regle existante no-ui-to-flow-effect).

## 10. Accessibility plan (Partie 4)

### 10.1 Audit automatique (4.1)

Combo retenu, sans lourdeur :

- Pa11y CI (gate principal) : vrai Chromium headless, axe-core + HTML_CodeSniffer, detecte le contraste.
  Config `.pa11yci.json` (standard WCAG2AA) sur les routes principales servies localement.
- Lighthouse CI (`@lhci/cli`) : score accessibilite + budgets perf/bundle Run en une passe, sur 2-3
  routes clefs. Config `.lighthouserc.json` avec assertions `categories:accessibility` minScore et
  budgets de ressources.
- Assertions de roles Testing Library dans les tests happy-dom existants (`getByRole`,
  `toHaveAccessibleName`) pour name/role/value au niveau composant, sans dependance nouvelle.
- vitest-axe : NON adopte par defaut (incompatible happy-dom). Si un axe composant s'avere necessaire
  plus tard, l'isoler dans un projet vitest jsdom dedie aux seuls composants Ops/a11y (cout explicite, optionnel).
- Pas de Playwright, pas de stack E2E lourde.

Routes auditees : `/`, `/signals`, `/signals/:id`, `/incidents`, `/compare`, `/dx-metrics`,
`/settings`, `/ops`. Pour `/signals/:id`, le script `scripts/flow/a11y.mjs` recupere d'abord un ID de
signal existant via `GET /api/signals` (ou un ID stable connu des fixtures deterministes) avant de
lancer l'audit, pour eviter une URL morte.

### 10.2 Criteres verifies (4.2)

Contrastes, labels de formulaires, aria-label des boutons-icones, focus visible, skip link, landmarks,
hierarchie de titres, semantique de table, accessibilite de la table virtualisee, navigation clavier,
reduced motion, target size (24x24, WCAG 2.5.8), messages d'erreur accessibles, badges avec texte,
pas d'info par couleur seule, responsive mobile, focus non masque (2.4.11).

### 10.3 Corrections UI ciblees (4.3)

Primitives a ajouter dans `flow-ui` : `SkipLink`, `VisuallyHidden` (exporte, sur la base de `.srOnly`),
`LiveRegion`, `ErrorMessage` (erreur de champ), plus `FocusRing` documente (le token global existe deja).
Corrections : `SkipLink` dans `__root.tsx` ; `SignalsTable` en `role="grid"` avec `aria-rowcount` /
`aria-rowindex` pour conserver le total malgre la virtualisation (pattern grille fenetree accepte, sans
de-virtualiser : on ne sacrifie pas le Run), en-tetes `th scope="col"` + `aria-sort`, `RiskScoreCell`
avec label texte ; `aria-current="page"` sur la sidebar ; relevement des tokens de contraste badges
blue/amber/grey ; semantique dialog + focus trap + restitution de focus pour le menu notifications et
`NewSignalDialog`, avec `aria-invalid`/`aria-describedby` + `ErrorMessage` ; option reduced-motion qui
desactive entierement l'animation.

### 10.4 Documentation (4.4)

`docs/audit/flow/accessibility-report.md` : routes auditees, outils, criteres, problemes corriges,
limites (happy-dom/axe, contraste hors DOM virtuel), commandes (`pnpm flow:a11y`).

## 11. Golden paths plan (Partie 5)

Dossier `docs/golden-paths/flow/`, 14 fiches courtes et actionnables, chacune avec etapes, commandes,
"success criteria", "common failures", liens vers rapports :

```txt
start-flow-locally.md        onboard-flow-developer.md     run-flow-ci-locally.md
debug-flow-error.md          investigate-request-id.md     create-flow-feature.md
add-flow-api-route.md        add-flow-ui-component.md       use-ai-on-flow-pr.md
review-ai-generated-pr.md    release-and-rollback-flow.md   accessibility-check-flow.md
bundle-check-flow.md         security-check-flow.md
```

## 12. One-shot commands plan (Parties 6, 11)

Scripts reels en Node ESM (`scripts/flow/*.mjs`), sans dependance nouvelle (`node:child_process`,
`node:fs`, `node:process`), plus alias `pnpm`.

| Commande | Type | Fait quoi |
| --- | --- | --- |
| `flow:doctor` | script `scripts/flow/doctor.mjs` | versions Node/pnpm, lockfile, fixtures, ports, env, graph Nx, boundaries, dist stale, Docker dispo, act dispo (optionnel) |
| `flow:onboard` | script `scripts/flow/onboard.mjs` | doctor -> rappel install (pas d'install auto) -> fixtures -> verif env -> typecheck minimal -> imprime prochaines commandes + lien golden path |
| `flow:setup` | alias | install + fixtures (variante sure d'onboard) |
| `flow:dev` | alias -> `dev:flow` | fixtures si absentes, lance l'app, affiche URL, ne lance pas les autres variantes |
| `flow:dev:clean` | alias | purge dist/cache puis dev |
| `flow:dev:docker` | alias -> docker run | dev via image Docker (optionnel) |
| `flow:ci` | script `scripts/flow/ci.mjs` | lint, typecheck, test, build, boundaries, cycles, observability tests, ai-pr-check (mode mixte) ; PAS d'a11y/Chromium par defaut ; flags `--fast` / `--full` / `--docker` |
| `flow:ci:fast` | alias | `ci.mjs --fast` : lint + typecheck + tests affected + boundaries + cycles. Rapide, pas de Chromium, pas de docker, pas d'a11y |
| `flow:ci:full` | alias | `ci.mjs --full` : tout `flow:ci` + a11y (Pa11y + Lighthouse, Chromium) + analyze + docker |
| `flow:ci:docker` | alias | `ci.mjs --docker` |
| `flow:ci:act` | alias | `act` sur le workflow (optionnel, voir 13) |
| `flow:a11y` | script `scripts/flow/a11y.mjs` | build + serve ephemere + recuperation ID signal + pa11y-ci + lhci, ecrit le rapport |
| `flow:ai-pr-check` | script `scripts/flow/ai-pr-check.mjs` | checks gouvernance IA (voir 14) |
| `flow:ops:test` | alias | tests des packages observability + feature-ops |
| `flow:diagnostics` | alias | genere un pack diagnostic depuis le store serveur (dev) |
| `audit:flow:boundaries` / `:cycles` / `analyze:flow` | existants | mis a jour pour inclure les nouveaux packages |

Reels vs alias : creer reellement `doctor`, `onboard`, `ci`, `a11y`, `ai-pr-check` (logique). Garder
en alias : `dev`, `ci:fast/full/docker`, `ops:test`, `diagnostics`, et les `audit:*`/`analyze:*` existants.

## 13. Local CI plan (Partie 7)

Recommandation : `pnpm flow:ci` (scripts Nx/pnpm) comme commande officielle, portable et rapide ;
`pnpm flow:ci:act` optionnelle pour verifier le YAML GitHub Actions.

- Option A (`flow:ci`) : avantages portable, rapide, lisible, pas de Docker requis ; inconvenient ne
  teste pas le YAML lui-meme.
- Option B (`flow:ci:act`) : avantages proche de GitHub Actions, teste le workflow ; inconvenients
  dependance Docker, plus lent, images partielles, linux only, conflits de ports sur matrices (limites
  documentees par nektos/act). A reserver a la verification du workflow.

L'a11y (Pa11y + Lighthouse, Chromium) n'est jamais dans `flow:ci` ni `flow:ci:fast` ; uniquement dans
`flow:ci:full` et dans un job CI separe (section 18), pour ne pas ralentir la boucle quotidienne.

## 14. AI security / governance plan (Partie 8)

Docs a creer : `docs/golden-paths/flow/use-ai-on-flow-pr.md`,
`docs/golden-paths/flow/review-ai-generated-pr.md`, `docs/audit/flow/ai-governance-report.md`,
`docs/audit/flow/ai-pr-check-policy.md`, `docs/audit/flow/ai-pr-manifest.example.md`.

Risques OWASP LLM 2025 pertinents, avec regle Flow / check auto / niveau / check humain / preuve :

| Risque | Regle Flow | Check auto (`flow:ai-pr-check`) | Niveau | Check humain | Preuve PR |
| --- | --- | --- | --- | --- | --- |
| LLM01 Prompt Injection | pas d'execution auto de commande destructive depuis un contenu IA | scan patterns dangereux (`rm -rf`, `curl|sh`) dans diffs/scripts | warning | revue des nouveaux scripts | diff scripts revu |
| LLM02 Sensitive Information Disclosure | pas de secret/donnee client/log sensible dans prompt ou code | secret scan leger (regex cles/tokens), pas de logs bruts avec tokens | bloquant | verifier absence de PII | rapport secret scan vert |
| LLM03 Supply Chain | pas de nouvelle dependance sans justification | diff de dependances (package.json / lockfile) | warning | justification de chaque ajout | note de decision |
| LLM04 Data/Model Poisoning | fixtures deterministes uniquement, pas de donnees reelles | check fichiers fixtures/data interdits | warning | revue source des donnees | confirmation fixtures |
| LLM05 Improper Output Handling | sortie IA jamais inseree sans validation/typage | boundaries + typecheck + tests sur zones touchees | bloquant (boundaries) | revue d'integration | CI verte |
| LLM06 Excessive Agency | pas de modif cross-variant ni CI sans demande explicite | check cross-variant + fichiers CI modifies signales | bloquant (cross-variant) | validation portee | scope-guard + check |
| LLM07 System Prompt Leakage | pas de fichiers de prompts avec secrets | check no-prompt-files-with-secrets | bloquant (si secret) | revue | scan vert |
| LLM09 Misinformation (overreliance) | toute architecture generee exige un rapport de decision | check doc mise a jour si archi touchee | warning | revue d'architecture | rapport de decision present |
| LLM10 Unbounded Consumption | store en memoire borne, pas de dump complet | check budget bundle + bornes memory store | warning | revue | bundle diff |

Politique de niveaux au demarrage : bloquant seulement pour secrets (LLM02/LLM07), cross-variant (LLM06)
et boundaries (LLM05). Tout le reste en warning, a durcir progressivement une fois le bruit maitrise.

Regles IA Flow (8.1), reprises dans `ai-pr-check-policy.md` : pas de secret dans prompt ; pas de donnee
client reelle ; pas de copier-coller de logs sensibles ; pas d'execution auto de commande destructive ;
pas de modif cross-variant sans demande explicite ; pas de modif CI sans justification ; pas de nouvelle
dependance sans justification ; pas d'architecture generee sans rapport de decision ; toute PR IA
touchant API/errors/security lance `flow:ci:full` ; toute PR IA touchant l'UI lance le check a11y ;
toute PR IA touchant le bundle fournit un bundle diff.

AI PR manifest (8.2) : `docs/audit/flow/ai-pr-manifest.example.md` avec objectif, prompt resume, zones
touchees, commandes lancees, risques, fichiers sensibles, tests, bundle diff, a11y diff, revue humaine,
rollback plan.

Checks automatiques (8.3) de `flow:ai-pr-check` : secret scan leger (bloquant), forbidden file patterns
(`docs/product/`, `maquettes/`, `.env`, cles) (bloquant), cross-variant import/edit (bloquant),
package boundary check (bloquant), dependency diff (warning), bundle budget (warning), docs-updated check
si archi touchee (warning), no TODO dangereux (warning), pas de code genere dans dossiers critiques sans
test (warning), pas de prompt files avec secrets (bloquant), pas de logs bruts avec tokens (bloquant).
Implementation : reutilise `git diff` + `depcruise` + un petit scanner regex ; complete (ne remplace pas)
les hooks Python existants.

## 15. Boundaries plan (Partie 10)

Regles `.dependency-cruiser.cjs` a ajouter :

- `no-observability-to-react` : `packages/flow/observability/src` -/-> react/react-dom.
- `no-observability-to-tanstack` : -/-> @tanstack.
- `no-observability-to-ui` : -/-> `packages/flow/ui/src`.
- `no-observability-to-features` : -/-> `packages/flow/feature-*`.
- `no-observability-to-server` : -/-> `packages/flow/server-data-access/src` (le serveur logue VERS
  observability, jamais l'inverse).
- `no-observability-to-apiclient` : -/-> `packages/flow/api-client/src` (api-client logue VERS observability).
- `no-observability-to-fixtures` / `no-observability-to-app`.
- `no-ui-to-observability` : `packages/flow/ui/src` -/-> `packages/flow/observability/src` (miroir de
  no-ui-to-flow-effect ; l'UI reste data-agnostic, props plain).

Autorise (pas de regle bloquante) : observability -> contracts ; observability/effect -> flow-effect +
effect ; server-data-access -> observability ; api-client -> observability ; feature-* -> observability
(types) ; feature-ops -> flow-ui + api-client + observability ; app -> observability (handlers globaux).
`feature-ops` est couvert par les regles `feature-*` existantes (pas de server-data-access, pas de
fixtures, pas de cross-variant).

Mettre a jour les listes de chemins de `audit:flow:boundaries` (depcruise inclut deja `packages/flow`)
et `audit:flow:cycles` (ajouter `packages/flow/observability/src` et `packages/flow/feature-ops/src` a
la commande madge), ainsi que `tsconfig.base.json` (paths) et les Project References.

## 16. Tests plan (Partie 11)

- Unitaires : redaction du logger, alert rules (fenetres, dedup, reset), diagnostic pack (redaction,
  bornes), severity mapping, requestId mapping (header+body), breadcrumbs (bornes), run-counters,
  parser/checker de politique IA, helpers des scripts golden path.
- UI legers (happy-dom + Testing Library) : Error inbox rend les logs, severite d'alerte, copie
  requestId, controles operationnels Settings, primitives a11y (SkipLink, VisuallyHidden, LiveRegion,
  ErrorMessage) via `getByRole`/`toHaveAccessibleName`.
- Accessibilite : Pa11y CI + Lighthouse CI sur les routes, rapport genere (job separe).
- Commandes a faire passer : `flow:doctor`, `flow:onboard`, `flow:dev`, `flow:ci:fast`, `flow:ci:full`,
  `flow:ai-pr-check`, `flow:a11y`, `flow:ops:test`, `audit:flow:boundaries`, `audit:flow:cycles`,
  `analyze:flow`. A creer reellement : doctor, onboard, ci, a11y, ai-pr-check ; le reste en alias.

## 17. Bundle / performance plan (Partie 12)

Contraintes respectees : pas de SDK Sentry, pas d'OTel SDK client complet, pas de chart lib lourde, pas
de runtime a11y lourd dans le bundle app (axe/Pa11y/Lighthouse en devDependencies uniquement), runtime
observability minimal, logs en memoire bornee, pas de gros JSON fixture cote client, pas de dump
diagnostic complet.

Budget propose (gzip, mesure sur `dist/client`) :

| Element | Cible | Plafond dur |
| --- | --- | --- |
| Core observability client (logger + store + redact + breadcrumbs + handlers), importe par api-client + app | 4 KB | 6 KB |
| Primitives a11y flow-ui (SkipLink, VisuallyHidden, LiveRegion, ErrorMessage, RequestIdBadge), tree-shakeables | 1 KB | 2 KB |
| FlowErrorBoundary + QueryErrorPanel (shared/root) | 2 KB | 3 KB |
| Adapter Effect `/effect` dans le bundle client | 0 KB (server + api-client uniquement) | 0 KB |
| Chunk route `/ops` (feature-ops + composants Ops) | lazy, <= 25 KB | 35 KB |
| Augmentation nette de l'entree client partagee | <= 7 KB | 10 KB |

Mesure : `pnpm analyze:flow` (compare bundle-stats avant/apres ; rappel : bundle-stats mesure le build
serveur, le vrai bundle client est `dist/client`), plus une assertion de budget de ressources dans
Lighthouse CI. Le chunk `/ops` doit rester separe (route-level code-splitting TanStack deja en place) et
ne pas etre charge sur les autres routes. Rapport post-implementation : `docs/audit/flow/run-observability-bundle-report.md`.

## 18. CI integration plan

`.github/workflows/flow-ci.yml` : ajouter un job `ai-pr-check` (sur PR, rapide, mode bloquant restreint a
secrets/cross-variant/boundaries) et un job `a11y` SEPARE (build + serve + recuperation ID signal +
pa11y-ci + lhci, Chromium dans le runner) qui ne bloque pas la boucle quotidienne (par exemple sur PR
labellisee `a11y` ou sur main, et toujours dans `flow:ci:full`). Les tests observability passent via les
targets Nx existants (`nx affected -t test`). Garder boundaries/cycles/metrics deja presents. Le bundle
analyze peut etre ajoute en job optionnel (artefact) sur main. Documenter la dependance Chromium en CI.

## 19. Fichiers a creer / modifier (Partie 14)

Creer (packages) : `packages/flow/observability/**`, `packages/flow/feature-ops/**`.

Creer (flow-ui) : `src/ops/{RequestIdBadge,OperationalAlertCard,ErrorInboxTable,BreadcrumbTimeline,RunHealthSummary,DiagnosticPackButton,AccessibilityScoreCard,AiGovernanceChecklist,GoldenPathCard}.tsx`,
`src/a11y/{SkipLink,VisuallyHidden,LiveRegion}.tsx`, `src/states/{ErrorMessage,QueryErrorPanel}.tsx`,
`src/error/FlowErrorBoundary.tsx` (+ modules CSS + tests).

Creer (app) : `apps/flow-app/src/routes/ops.tsx`, `apps/flow-app/src/routes/api/logs.ts`,
`apps/flow-app/src/app/observability-client.ts`, `apps/flow-app/src/server/observability-server.ts`.

Creer (scripts) : `scripts/flow/{doctor,onboard,ci,ai-pr-check,a11y}.mjs`, `scripts/flow/lib/*`.

Creer (config) : `.pa11yci.json`, `.lighthouserc.json`.

Creer (docs) : `docs/golden-paths/flow/*` (14), `docs/audit/flow/{observability-report,accessibility-report,ai-governance-report,ai-pr-check-policy,golden-paths-report,run-readiness-report,command-reference,run-observability-bundle-report,ai-pr-manifest.example}.md`,
et ce plan.

Modifier : `package.json` (scripts `flow:*`), `.dependency-cruiser.cjs` (nouvelles regles + cycles),
`tsconfig.base.json` (paths + refs), `apps/flow-app/src/routes/__root.tsx` (SkipLink,
defaultErrorComponent, notFoundComponent, handlers), `apps/flow-app/src/server/respond.ts` (log + header
`X-Request-Id`), `packages/flow/api-client/src/client.ts` (header + logs + breadcrumbs),
`packages/flow/server-data-access/src/effect/run.ts` + `layers.ts` (Effect Logger),
`packages/flow/feature-signals/src/SignalsTable.tsx` (a11y table),
`packages/flow/ui/src/styles/tokens.css` (contrastes/motion),
`packages/flow/feature-settings/src/SettingsScreen.tsx` (carte Operational health + aria-pressed),
`packages/flow/feature-dx-metrics/src/DxMetricsScreen.tsx` (section Run),
`packages/flow/domain/**` (types metriques Run, purs),
`.github/workflows/flow-ci.yml` (jobs a11y separe + ai-pr-check).

Ne pas modifier : `packages/metrics/**`, `packages/contracts/**`, Friction, Overfit.

## 20. Phasage d'implementation (Partie 13)

| Phase | Objectif | Fichiers (creer/modifier) | Tests | Commandes | Risques | Acceptation |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Observability core | package framework-free + adapter Effect | creer observability/**, modifier run.ts/layers.ts/client.ts/respond.ts (logs + X-Request-Id) | redaction, alerts, pack, severity, requestId, run-counters | `flow:ops:test`, `audit:flow:boundaries` | fuite Effect dans client | logs structures client+serveur, requestId correle (body+header), zero secret, boundaries vertes |
| 2. Error inbox / Ops UI | `/ops` + feature-ops + composants | creer feature-ops/**, ui/ops/**, routes/ops.tsx, api/logs.ts | UI inbox, alert card, copy requestId | `flow:dev`, `flow:ops:test` | scope creep UI | `/ops` fusionne stores client+serveur, affiche logs/alertes/pack, responsive |
| 3. Run metrics | section Run dans dx-metrics | modifier DxMetricsScreen.tsx, domain (types Run) | compteurs live, labels seed | `flow:dev` | metriques trompeuses | section Run labellisee, compteurs corrects, sans toucher packages/metrics |
| 4. Accessibilite | primitives + corrections + outillage | creer a11y/**, ErrorMessage, modifier SignalsTable/tokens/__root | role assertions UI | `flow:a11y` | regression perf table | Pa11y/Lighthouse verts, table virtualisee accessible sans de-virtualiser |
| 5. Golden paths docs | 14 fiches | creer docs/golden-paths/flow/* | n/a | revue manuelle | docs qui derivent | chaque fiche a etapes + success criteria |
| 6. One-shot commands | scripts + alias | creer scripts/flow/*, modifier package.json | tests helpers | toutes `flow:*` | install auto risquee | doctor/onboard/ci/a11y/ai-pr-check verts ; fast reste rapide |
| 7. AI governance | politique + manifest + checks | creer ai-* docs, ai-pr-check.mjs | parser/checker | `flow:ai-pr-check` | faux positifs | bloquant restreint a secrets/cross-variant/boundaries, reste en warning |
| 8. CI integration + rapports | jobs CI + rapports finaux | modifier flow-ci.yml, creer rapports audit | CI verte | `flow:ci:full`, `flow:ci:act` | Chromium en CI | a11y en job separe, ai-pr-check en PR, rapports ecrits |

## 21. Criteres d'acceptation

- Toute erreur (10 categories) est loguee, correlee par requestId (corps + en-tete `X-Request-Id`),
  affichee proprement, et testee.
- `/ops` fusionne memory store client + serveur ; affiche inbox, alertes, breadcrumbs, RunHealthSummary,
  download pack ; pack sans secret/cookie/Authorization/prompt/stack/dump fixtures.
- `/api/logs` : memoire seule, sans persistance, redaction obligatoire, payload borne.
- `/dx-metrics` a une section Run labellisee (seed/live), sans modifier `packages/metrics`.
- Pa11y CI et Lighthouse CI passent sur les routes cibles (job separe) ; corrections a11y appliquees
  (skip link, th scope, aria-sort, contraste, dialog).
- `flow:doctor`, `flow:onboard`, `flow:ci`, `flow:a11y`, `flow:ai-pr-check` fonctionnent localement ;
  `flow:ci:fast` reste rapide ; `flow:ci:full` est exhaustif.
- `audit:flow:boundaries` et `audit:flow:cycles` verts avec les nouveaux packages ; aucune dependance cross-variant.
- Budget bundle respecte (table section 17) ; rapport bundle ecrit.
- Politique IA documentee et executable ; manifest fourni ; bloquant restreint au demarrage.

## 22. Risques et arbitrages

- happy-dom vs axe : vitest-axe inutilisable en l'etat ; mitige par Pa11y/Lighthouse (route, Chromium) +
  assertions de roles. Pas de jsdom global (ne pas destabiliser la suite existante).
- Table virtualisee : tension Run (perf) vs a11y. `role="grid"` + `aria-rowcount`/`aria-rowindex` plutot
  que de-virtualiser ; on garde la perf et on expose le total.
- Effect dans observability : risque de fuite dans le bundle client/UI. Core framework-free + subpath
  `/effect` isole, boundaries dediees.
- Scope creep vers Overfit : chaque ajout passe le filtre cout total de livraison (skill
  `analyzing-total-delivery-cost`), avec stop rules (voir 24).
- Chromium en CI : Pa11y/Lighthouse demandent un navigateur ; cout CI accepte, job separe pour ne pas
  ralentir le chemin critique ; jamais dans `flow:ci`/`flow:ci:fast`.
- Faux positifs `ai-pr-check` : bloquant restreint a secrets/cross-variant/boundaries au depart, le reste
  en warning, durcissement progressif.

## 23. Questions ouvertes (resolues)

Les quatre questions ouvertes de la passe d'analyse ont ete tranchees par le porteur du projet (voir
"Decisions validees" en tete de document). Aucune question bloquante ne reste ouverte pour demarrer
l'implementation une fois ce plan valide.

## 24. Recommandation : Flow renforce, pas Overfit

Ce plan renforce Flow sur Run et Change gouverne tout en restant fidele a la variante equilibree :

- local-first, sans SaaS, sans backend supplementaire, sans base de donnees (fixtures + memoire bornee) ;
- on reutilise l'existant (Effect Logger, requestId, demo controls, route splitting) au lieu d'ajouter des stacks ;
- chaque surface reste simple, esthetique et mesurable ; les outils a11y/IA vivent en dev/CI, pas dans le bundle ;
- stop rules explicites (issues du modele de cout total de livraison) : pas de SDK Sentry/OTel, pas de
  chart lib lourde, pas de persistence, pas de de-virtualisation, memory store borne, modification de
  `packages/metrics` interdite, faux positifs IA en warning d'abord. Si une de ces lignes est franchie,
  c'est le signe d'un point de bascule vers Overfit et on s'arrete.

Resultat attendu : Flow devient une reference DX complete sur Build, Ship, Run et Change, sans devenir
une usine a gaz.

> Rappels : aucune implementation n'a ete faite (hors ce fichier de plan) ; ce plan doit etre valide
> avant code ; le futur front de comparaison entre les trois variantes est hors scope.
