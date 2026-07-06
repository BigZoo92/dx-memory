// Artifact-provenance gate. Fails if release-critical inputs changed without regenerating the
// committed Overfit artifact manifest.
import { spawnSync } from 'node:child_process'
import { fail, pass, REPO_ROOT } from './_lib.mjs'

const GATE = 'artifacts'

const res = spawnSync(process.execPath, ['tools/overfit-ci/artifact-manifest.mjs', '--check'], {
  cwd: REPO_ROOT,
  encoding: 'utf8'
})

if (res.status === 0) {
  pass(GATE, 'artifact manifest is current')
} else {
  fail(GATE, (res.stderr || res.stdout || 'artifact manifest check failed').trim())
}

process.exit(process.exitCode ?? 0)
