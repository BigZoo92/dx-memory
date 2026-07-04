#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const suffixes = ['gateway', 'flow', 'friction-web', 'friction-api', 'overfit-web', 'overfit-api']
const imageBase = process.env.GHCR_IMAGE_NAME
const tag = process.env.RELEASE_TAG
const sourceSha = process.env.SOURCE_SHA

if (!imageBase || !tag || !sourceSha) {
  throw new Error('GHCR_IMAGE_NAME, RELEASE_TAG and SOURCE_SHA are required.')
}

function inspectRaw(image) {
  const result = spawnSync('docker', ['buildx', 'imagetools', 'inspect', image, '--raw'], {
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    throw new Error(`Image not found or not readable: ${image}`)
  }
  return JSON.parse(result.stdout)
}

function collectAnnotations(node, out = []) {
  if (node && typeof node === 'object') {
    if (node.annotations && typeof node.annotations === 'object') out.push(node.annotations)
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((entry) => collectAnnotations(entry, out))
      else if (value && typeof value === 'object') collectAnnotations(value, out)
    }
  }
  return out
}

let revision = null
let created = null

for (const suffix of suffixes) {
  const image = `${imageBase}-${suffix}:${tag}`
  const raw = inspectRaw(image)
  const annotations = collectAnnotations(raw)
  const imageRevision = annotations.map((a) => a['org.opencontainers.image.revision']).find(Boolean)
  const imageCreated = annotations.map((a) => a['org.opencontainers.image.created']).find(Boolean)
  if (imageRevision && imageRevision !== sourceSha) {
    throw new Error(`${image} revision ${imageRevision} does not match tag commit ${sourceSha}.`)
  }
  revision = revision ?? imageRevision
  created = created ?? imageCreated
  process.stdout.write(`[OK] ${image}\n`)
}

const envPath = process.env.GITHUB_ENV
if (envPath) {
  writeFileSync(
    envPath,
    [
      `APP_IMAGE_TAG=${tag}`,
      `APP_VERSION=${tag}`,
      `APP_COMMIT_SHA=${revision ?? sourceSha}`,
      `APP_BUILD_TIME=${created ?? 'unknown'}`
    ].join('\n') + '\n',
    { flag: 'a' }
  )
}

process.stdout.write('Existing release images validated.\n')
