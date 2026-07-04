import { writeFileSync } from 'node:fs'

const out = process.argv[2]
if (!out) {
  throw new Error('Usage: node write-release-json.mjs <output>')
}

const release = {
  service: 'dx-memory',
  version: process.env.APP_VERSION ?? '0.0.0',
  commitSha: process.env.APP_COMMIT_SHA ?? 'unknown',
  buildTime: process.env.APP_BUILD_TIME ?? 'unknown'
}

writeFileSync(out, `${JSON.stringify(release, null, 2)}\n`, 'utf8')
