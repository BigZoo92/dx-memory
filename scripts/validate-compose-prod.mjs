#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml'
const envFile = process.env.COMPOSE_ENV_FILE || '.env.production.example'

function fail(message) {
  process.stderr.write(`[FAIL] ${message}\n`)
  process.exitCode = 1
}

function runComposeConfig() {
  const args = ['compose', '--env-file', envFile, '-f', composeFile, 'config', '--format', 'json']
  const result = spawnSync('docker', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout)
    process.exit(result.status ?? 1)
  }
  return JSON.parse(result.stdout)
}

const config = runComposeConfig()
const services = config.services ?? {}

for (const [name, service] of Object.entries(services)) {
  if (service.build) fail(`${name} must not use build in production compose.`)
  if (service.container_name) fail(`${name} must not set container_name.`)
  if (Array.isArray(service.ports) && service.ports.length > 0) {
    fail(`${name} must not publish host ports.`)
  }
  if (!service.image) fail(`${name} must declare an image.`)
  if (typeof service.image === 'string') {
    const tag = service.image.split(':').at(-1)
    if (!tag || tag === 'latest') fail(`${name} must not use an implicit or latest tag.`)
  }

  const networks = service.networks
    ? Array.isArray(service.networks)
      ? service.networks
      : Object.keys(service.networks)
    : []
  const onDokploy = networks.includes('dokploy-network')
  if (onDokploy && name !== 'dx-lab-gateway') {
    fail(`${name} must not be attached to dokploy-network.`)
  }
}

if (!services['dx-lab-gateway']) fail('dx-lab-gateway service is required.')
else {
  const networks = services['dx-lab-gateway'].networks
  const names = Array.isArray(networks) ? networks : Object.keys(networks ?? {})
  if (!names.includes('dokploy-network')) fail('dx-lab-gateway must attach to dokploy-network.')
}

if (!process.exitCode) {
  process.stdout.write('Production compose validation passed.\n')
}
