#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const command = process.argv[2]
const dokployUrl = (process.env.DOKPLOY_URL ?? '').replace(/\/+$/, '')
const apiKey = process.env.DOKPLOY_API_KEY
const composeId = process.env.DOKPLOY_COMPOSE_ID
const composePath = process.env.DOKPLOY_COMPOSE_FILE ?? 'docker-compose.prod.yml'
const smokeBaseUrl = (process.env.SMOKE_BASE_URL ?? 'https://dx-memory.enzogivernaud.fr').replace(/\/+$/, '')

if (!command || !['sync', 'deploy', 'wait-public'].includes(command)) {
  throw new Error('Usage: node scripts/release/dokploy.mjs <sync|deploy|wait-public>')
}

if (command !== 'wait-public' && (!dokployUrl || !apiKey || !composeId)) {
  throw new Error('DOKPLOY_URL, DOKPLOY_API_KEY and DOKPLOY_COMPOSE_ID are required.')
}

const releaseEnv = {
  GHCR_IMAGE_NAME: requiredEnv('GHCR_IMAGE_NAME'),
  APP_IMAGE_TAG: requiredEnv('APP_IMAGE_TAG'),
  APP_VERSION: requiredEnv('APP_VERSION'),
  APP_COMMIT_SHA: requiredEnv('APP_COMMIT_SHA'),
  APP_BUILD_TIME: requiredEnv('APP_BUILD_TIME')
}

function requiredEnv(key) {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is required.`)
  return value
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function api(path, body, { retries = 3, method = 'POST' } = {}) {
  const url = new URL(`${dokployUrl}${path}`)
  const headers = {
    accept: 'application/json',
    'x-api-key': apiKey
  }
  const init = { method, headers }
  if (method === 'GET') {
    for (const [key, value] of Object.entries(body ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  } else {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let lastError
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      if (!response.ok) {
        throw new Error(`${path} returned HTTP ${response.status}`)
      }
      return await response.json().catch(() => ({}))
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(1500 * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError
}

function pickCompose(payload) {
  return payload?.compose ?? payload?.data ?? payload?.result ?? payload
}

function mergeEnv(existing, next) {
  const lines = String(existing ?? '').split(/\r?\n/)
  const seen = new Set()
  const out = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)
    if (!match) return line
    const key = match[1]
    if (!(key in next)) return line
    seen.add(key)
    return `${key}=${next[key]}`
  })
  for (const [key, value] of Object.entries(next)) {
    if (!seen.has(key)) out.push(`${key}=${value}`)
  }
  return out.filter((line, index, arr) => line.length > 0 || index < arr.length - 1).join('\n')
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

async function sync() {
  const composeFile = readFileSync(composePath, 'utf8')
  const before = pickCompose(await api('/api/compose.one', { composeId }))
  const existingEnv = before?.env ?? before?.environment ?? ''
  const env = mergeEnv(existingEnv, releaseEnv)

  await api('/api/compose.update', {
    composeId,
    sourceType: 'raw',
    composeFile,
    env
  })

  const after = pickCompose(await api('/api/compose.one', { composeId }))
  const persistedEnv = String(after?.env ?? after?.environment ?? '')
  for (const [key, value] of Object.entries(releaseEnv)) {
    if (!persistedEnv.includes(`${key}=${value}`)) {
      throw new Error(`Dokploy env verification failed for ${key}.`)
    }
  }

  const persistedCompose = after?.composeFile ?? after?.compose ?? after?.rawCompose ?? null
  if (typeof persistedCompose === 'string') {
    if (sha256(persistedCompose) !== sha256(composeFile)) {
      throw new Error('Dokploy compose verification failed: persisted compose hash differs.')
    }
  } else {
    const services = ['dx-lab-gateway', 'flow-app', 'friction-web', 'friction-api', 'overfit-web', 'overfit-api']
    await api('/api/compose.loadServices', { composeId, type: 'fetch' }, { method: 'GET' }).then((payload) => {
      const text = JSON.stringify(payload)
      for (const service of services) {
        if (!text.includes(service)) throw new Error(`Dokploy service verification failed for ${service}.`)
      }
    })
  }

  process.stdout.write('Dokploy compose synchronized.\n')
}

async function deploy() {
  await api('/api/compose.deploy', {
    composeId,
    title: `release ${releaseEnv.APP_VERSION}`,
    description: `${process.env.GITHUB_REPOSITORY ?? 'repository'}@${releaseEnv.APP_COMMIT_SHA}`
  })
  process.stdout.write('Dokploy deploy triggered.\n')
}

async function waitPublic() {
  const deadline = Date.now() + 15 * 60 * 1000
  const healthUrl = `${smokeBaseUrl}/health`
  const releaseUrl = `${smokeBaseUrl}/release.json`
  while (Date.now() < deadline) {
    try {
      const health = await fetch(healthUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if (health.ok) {
        const release = await fetch(releaseUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
        if (release.ok) {
          const body = await release.json().catch(() => null)
          if (!releaseEnv.APP_VERSION || body?.version === releaseEnv.APP_VERSION) {
            process.stdout.write('Public deployment is responding with the expected release.\n')
            return
          }
          process.stdout.write(`Waiting for release ${releaseEnv.APP_VERSION}; current ${body?.version ?? 'unknown'}.\n`)
        }
      }
    } catch {
      process.stdout.write('Waiting for public gateway...\n')
    }
    await sleep(15000)
  }
  throw new Error('Timed out waiting for public deployment.')
}

if (command === 'sync') await sync()
if (command === 'deploy') await deploy()
if (command === 'wait-public') await waitPublic()
