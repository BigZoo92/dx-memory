#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..', '..')

const webContractPath = resolve(repoRoot, 'apps/friction-web/contract/api-contract.json')
const apiContractPath = resolve(repoRoot, 'apps/friction-api/contract/api-contract.json')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function normalizePath(path) {
  const withoutApi = path.replace(/^\/api(?=\/|$)/, '')
  return withoutApi.startsWith('/') ? withoutApi : `/${withoutApi}`
}

function routeKey(route) {
  return `${route.name}:${route.method}`
}

function routeMap(contract) {
  return new Map(
    contract.routes.map((route) => [
      routeKey(route),
      { ...route, method: route.method.toUpperCase(), path: normalizePath(route.path) }
    ])
  )
}

function sameArray(name, left, right, errors) {
  const l = left.join('|')
  const r = right.join('|')
  if (l !== r) {
    errors.push(`${name} mismatch\n  web: ${left.join(', ')}\n  api: ${right.join(', ')}`)
  }
}

const web = readJson(webContractPath)
const api = readJson(apiContractPath)
const errors = []

if (web.contractVersion !== api.contractVersion) {
  errors.push(`contractVersion mismatch: web=${web.contractVersion} api=${api.contractVersion}`)
}

const webRoutes = routeMap(web)
const apiRoutes = routeMap(api)
const allRouteKeys = [...new Set([...webRoutes.keys(), ...apiRoutes.keys()])].sort()

for (const key of allRouteKeys) {
  const webRoute = webRoutes.get(key)
  const apiRoute = apiRoutes.get(key)
  if (!webRoute || !apiRoute) {
    errors.push(`route ${key} exists on ${webRoute ? 'web only' : 'api only'}`)
    continue
  }
  if (webRoute.path !== apiRoute.path) {
    errors.push(`route ${key} path mismatch: web=${webRoute.path} api=${apiRoute.path}`)
  }
}

sameArray('signalsQueryParams', web.signalsQueryParams, api.signalsQueryParams, errors)
sameArray('signalFields', web.signalFields, api.signalFields, errors)
sameArray(
  'errorEnvelopeRequiredFields',
  web.errorEnvelopeRequiredFields,
  api.errorEnvelopeRequiredFields,
  errors
)

if (errors.length > 0) {
  console.error(`Friction manual contract copies drifted (${errors.length} issue(s)):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `Friction manual contract copies aligned (${allRouteKeys.length} routes, ${web.signalFields.length} signal fields)`
)
