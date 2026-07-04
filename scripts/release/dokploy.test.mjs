import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeDokployApiBase,
  patchComposeEnv,
  selectComposeCandidate,
  collectComposes,
  maskId
} from './dokploy.mjs'

test('normalizeDokployApiBase yields exactly one /api', () => {
  assert.equal(normalizeDokployApiBase('https://dokploy.test'), 'https://dokploy.test/api')
  assert.equal(normalizeDokployApiBase('https://dokploy.test/'), 'https://dokploy.test/api')
  assert.equal(normalizeDokployApiBase('https://dokploy.test/api'), 'https://dokploy.test/api')
  assert.equal(normalizeDokployApiBase('https://dokploy.test/api/'), 'https://dokploy.test/api')
  assert.equal(normalizeDokployApiBase('https://dokploy.test/api///'), 'https://dokploy.test/api')
  // subpath-hosted Dokploy is preserved
  assert.equal(normalizeDokployApiBase('https://host/dokploy'), 'https://host/dokploy/api')
  assert.equal(normalizeDokployApiBase('https://host/dokploy/api'), 'https://host/dokploy/api')
  assert.throws(() => normalizeDokployApiBase(''), /empty/)
})

test('patchComposeEnv patches only managed keys and preserves everything else', () => {
  const existing = [
    '# secrets below',
    'DATABASE_URL=postgres://secret@db/app', // unmanaged secret -> preserved
    'APP_VERSION=v0.9.0', // managed, existing -> replaced
    'GATEWAY_DOMAIN=dx-memory.example', // unmanaged -> preserved
    '' // trailing blank
  ].join('\n')
  const patch = {
    APP_IMAGE_TAG: 'v1.0.1', // absent -> added
    APP_VERSION: 'v1.0.1', // present -> replaced
    APP_COMMIT_SHA: 'abc123',
    APP_BUILD_TIME: '2026-07-04T00:00:00.000Z',
    GHCR_IMAGE_NAME: 'ghcr.io/x/dx-memory'
  }
  const out = patchComposeEnv(existing, patch)
  const lines = out.split('\n')
  // preserved
  assert.ok(lines.includes('# secrets below'))
  assert.ok(lines.includes('DATABASE_URL=postgres://secret@db/app'))
  assert.ok(lines.includes('GATEWAY_DOMAIN=dx-memory.example'))
  // replaced (not duplicated)
  assert.equal(lines.filter((l) => l.startsWith('APP_VERSION=')).length, 1)
  assert.ok(lines.includes('APP_VERSION=v1.0.1'))
  assert.ok(!lines.includes('APP_VERSION=v0.9.0'))
  // added
  assert.ok(lines.includes('APP_IMAGE_TAG=v1.0.1'))
  assert.ok(lines.includes('APP_COMMIT_SHA=abc123'))
  // no key appears twice
  const keys = lines.map((l) => l.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1]).filter(Boolean)
  assert.equal(keys.length, new Set(keys).size)
})

test('patchComposeEnv on empty env just adds the managed keys', () => {
  const out = patchComposeEnv('', { APP_VERSION: 'v1.0.1' })
  assert.equal(out, 'APP_VERSION=v1.0.1')
})

const projectAll = [
  {
    name: 'dx-memory',
    applications: [{ applicationId: 'app1', name: 'something-else' }],
    compose: [
      { composeId: 'cmp_flow_9f3a2b7c', name: 'dx-lab', appName: 'dx-lab-prod' },
      { composeId: 'cmp_other_1234abcd', name: 'scratch', appName: 'scratch' }
    ]
  },
  { name: 'empty-project', compose: [] }
]

test('collectComposes finds nested composes across the payload', () => {
  const all = collectComposes(projectAll)
  assert.equal(all.length, 2)
  assert.deepEqual(
    all.map((c) => c.name).sort(),
    ['dx-lab', 'scratch']
  )
})

test('selectComposeCandidate: exact name match -> composeId', () => {
  const r = selectComposeCandidate(projectAll, 'dx-lab')
  assert.equal(r.status, 'ok')
  assert.equal(r.composeId, 'cmp_flow_9f3a2b7c')
})

test('selectComposeCandidate: match by appName too', () => {
  const r = selectComposeCandidate(projectAll, 'dx-lab-prod')
  assert.equal(r.status, 'ok')
  assert.equal(r.composeId, 'cmp_flow_9f3a2b7c')
})

test('selectComposeCandidate: zero matches -> none + inventory (no arbitrary pick)', () => {
  const r = selectComposeCandidate(projectAll, 'does-not-exist')
  assert.equal(r.status, 'none')
  assert.equal(r.inventory.length, 2)
})

test('selectComposeCandidate: multiple matches -> ambiguous (never picks one)', () => {
  const dup = [{ name: 'p', compose: [{ composeId: 'a', name: 'dup' }, { composeId: 'b', name: 'dup' }] }]
  const r = selectComposeCandidate(dup, 'dup')
  assert.equal(r.status, 'ambiguous')
  assert.equal(r.matches.length, 2)
})

test('collectComposes tolerates {data:[...]} and {result:[...]} wrappers', () => {
  assert.equal(collectComposes({ data: projectAll }).length, 2)
  assert.equal(collectComposes({ result: projectAll }).length, 2)
  assert.equal(collectComposes(null).length, 0)
})

test('maskId never leaks the full id', () => {
  assert.equal(maskId('cmp_flow_9f3a2b7c'), 'cmp_…2b7c')
  assert.equal(maskId('short'), 'sh…')
  assert.equal(maskId(''), '(unset)')
})
