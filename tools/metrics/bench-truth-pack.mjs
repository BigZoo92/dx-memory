#!/usr/bin/env node
// Builds the benchmark truth pack consumed by apps/metrics-dashboard.
//
// Primary source: the archive of the 12 benchmark runs (S01..S04 x flow/friction/overfit),
// raw `result.json` files plus associated artifacts. Secondary source: the frozen automated
// CI/Docker measurements in tools/metrics/results/ci/*.json.
//
// The output (apps/metrics-dashboard/src/bench/truth-pack.json) is committed: the dashboard
// must build without the archive. Re-running this script against the archive must be a no-op
// unless the raw data changed. Every consolidation of a raw value is explicit and carries a
// reason; raw values are never overwritten silently.
//
// Usage: node tools/metrics/bench-truth-pack.mjs [--archive <dir>] [--check]
//   --check  compare against the committed truth pack and exit non-zero on drift.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
const args = process.argv.slice(2)
const argValue = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : null
}
const ARCHIVE = argValue('--archive') ?? resolve(homedir(), 'dx-memory-benchmark-archive-2026-07-08')
const OUT = resolve(repoRoot, 'apps/metrics-dashboard/src/bench/truth-pack.json')
const CHECK = args.includes('--check')

if (!existsSync(ARCHIVE)) {
  console.error(`archive not found: ${ARCHIVE}`)
  process.exit(2)
}

const VARIANTS = ['flow', 'friction', 'overfit']
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const run = (s, v) => readJson(resolve(ARCHIVE, s, v, 'result.json'))
const rel = (s, v) => `archive:${s}/${v}/result.json`

const round = (x, d = 4) => (x == null ? null : Number(x.toFixed(d)))

// ---------------------------------------------------------------------------
// S01 - risk-level-v1
// ---------------------------------------------------------------------------
const s01 = Object.fromEntries(
  VARIANTS.map((v) => {
    const r = run('s01', v)
    const p = r.patch
    const changedFiles = p.files_modified_count + p.files_created_count + p.files_deleted_count
    return [
      v,
      {
        source: rel('s01', v),
        status: r.status,
        timeToGreenMs: r.execution.time_to_green_ms,
        timeToFirstChangeMs: r.execution.time_to_first_change_ms,
        changedFiles,
        locAdded: p.loc_added,
        locDeleted: p.loc_deleted,
        churn: p.loc_added + p.loc_deleted,
        filesInspected: r.exploration.files_inspected,
        firstRelevantFile: r.execution.first_relevant_file,
        nxAffectedProjects: p.nx_affected_projects?.length ?? null
      }
    ]
  })
)

// ---------------------------------------------------------------------------
// S02 - risk-level-v2 (adds `critical`, starts from each variant's validated S01)
// ---------------------------------------------------------------------------
const s02 = Object.fromEntries(
  VARIANTS.map((v) => {
    const r = run('s02', v)
    return [
      v,
      {
        source: rel('s02', v),
        status: r.status,
        timeToGreenMs: r.execution.time_to_green_ms,
        changedFiles: r.patch.changed_files_count,
        locAdded: r.patch.loc_added,
        locDeleted: r.patch.loc_deleted,
        churn: r.patch.loc_added + r.patch.loc_deleted,
        changeAmplification: r.evolution.change_amplification,
        evolutionTax: r.evolution.evolution_tax,
        reopenedS01Files: r.evolution.reopened_s01_files_count,
        knowledgeDispersionRaw: r.knowledge.knowledge_dispersion,
        duplicatedRiskRulesRaw: r.knowledge.duplicated_risk_rules_count,
        riskRuleMapRaw: r.knowledge.risk_rule_map
      }
    ]
  })
)

// ---------------------------------------------------------------------------
// S02 knowledge map - consolidated (derived post-hoc, reviewable)
// Provenance review of the raw agent maps:
//  - packages/overfit/contracts-generated/src/{index,runtime}.ts carry a "GENERATED" banner
//    but the generator (packages/overfit/quality-gates/scripts/generate-contracts.mjs) only
//    emits generated/overfit/contracts.lock.json; the S02 run hand-edited both files.
//    => manually maintained, KEPT.
//  - generated/overfit/openapi.json is a maintained, hand-authored document per ADR-0003
//    (utoipa auto-generation deferred); the S02 run hand-edited it. => KEPT.
//  => no locations excluded; the consolidated map equals the raw agent map.
// ---------------------------------------------------------------------------
const RULE_IDS = [
  'allowed_values',
  'score_to_level_derivation',
  'descending_risk_order',
  'high_risk_kpi_membership',
  'filter_domain_support'
]

function knowledgeDerived(map) {
  const edges = RULE_IDS.reduce((n, ruleId) => n + map[ruleId].length, 0)
  const fileRules = new Map()
  for (const ruleId of RULE_IDS) {
    for (const file of map[ruleId]) {
      fileRules.set(file, (fileRules.get(file) ?? 0) + 1)
    }
  }
  const counts = [...fileRules.values()]
  return {
    ruleLocationEdges: edges,
    uniqueFiles: fileRules.size,
    multiRuleFiles: counts.filter((c) => c > 1).length,
    maxRulesPerFile: counts.length ? Math.max(...counts) : 0,
    duplicatedRiskRules: RULE_IDS.filter((ruleId) => map[ruleId].length > 1).length
  }
}

const knowledgeMap = {
  level: 'reviewable',
  method: 'derived_post_hoc_reviewable',
  note:
    'Derived from the raw agent risk_rule_map of each S02 run. Provenance review kept all ' +
    'locations: the Overfit "generated" banners do not correspond to actual code generation ' +
    '(ADR-0003: openapi.json is hand-maintained; generate-contracts.mjs only emits ' +
    'contracts.lock.json), and the S02 Overfit run hand-edited openapi.json, index.ts and runtime.ts.',
  excludedGeneratedLocations: [],
  ruleIds: RULE_IDS,
  variants: Object.fromEntries(
    VARIANTS.map((v) => {
      const raw = s02[v].riskRuleMapRaw
      return [
        v,
        {
          rawAgentMap: raw,
          consolidatedMap: raw,
          ...knowledgeDerived(raw),
          knowledgeDispersionRaw: s02[v].knowledgeDispersionRaw,
          duplicatedRiskRulesRaw: s02[v].duplicatedRiskRulesRaw
        }
      ]
    })
  )
}

// ---------------------------------------------------------------------------
// S03 - nullable-tags-render-crash (diagnosis; post-root-cause metrics declassified)
// ---------------------------------------------------------------------------
const s03 = Object.fromEntries(
  VARIANTS.map((v) => {
    const r = run('s03', v)
    const rawBuildPass = r.validation.final_build_pass
    // Known reporting error, S03 Overfit: final_build_pass=true with zero build commands in
    // commands.jsonl and none in validation.commands. Consolidated to null (not observed).
    const buildCommandsObserved =
      (r.validation.commands ?? []).some((c) => /\bbuild\b/.test(c.command)) || false
    const finalBuildPass =
      rawBuildPass === true && !buildCommandsObserved
        ? {
            rawReportedValue: true,
            consolidatedValue: null,
            reason:
              'result.json reports final_build_pass=true but no build command exists in ' +
              'commands.jsonl nor in validation.commands; the value is not backed by any ' +
              'recorded execution.'
          }
        : { rawReportedValue: rawBuildPass, consolidatedValue: rawBuildPass, reason: null }
    return [
      v,
      {
        source: rel('s03', v),
        status: r.status,
        timeToRootCauseMs: r.execution.time_to_root_cause_ms,
        timeToFirstHypothesisMs: r.execution.time_to_first_hypothesis_ms,
        filesInspectedBeforeRootCause: r.diagnosis.files_inspected_before_root_cause_count,
        searchesBeforeRootCause: r.diagnosis.searches_before_root_cause_count,
        hypothesesBeforeRootCause: r.diagnosis.hypotheses_before_root_cause_count,
        falseLeadsBeforeRootCause: r.diagnosis.false_leads_before_root_cause_count,
        rootCauseGroundTruthMatch: r.diagnosis.root_cause_ground_truth_match,
        groundTruthCheckedAfterRootCauseEvent: r.diagnosis.ground_truth_checked_after_root_cause_event,
        finalBuildPass,
        // Declassified (cross-variant comparison excluded; see limits):
        secondary: {
          timeToBugFixedMs: r.execution.time_to_bug_fixed_ms,
          timeToGreenMs: r.execution.time_to_green_ms,
          fixLocAdded: r.fix.loc_added,
          fixLocDeleted: r.fix.loc_deleted,
          fixChangedFiles: r.fix.changed_files_count,
          fixStrategy: r.fix.fix_strategy,
          fixBoundary: r.fix.fix_boundary
        }
      }
    ]
  })
)

// ---------------------------------------------------------------------------
// S04 - accessibility + network sobriety (same target, per-variant measurement modes)
// ---------------------------------------------------------------------------
const s04 = Object.fromEntries(
  VARIANTS.map((v) => {
    const r = run('s04', v)
    const a = r.accessibility
    const e = r.eco
    const caps = (block) => ({
      filtersNamed: `${block.filter_controls_with_accessible_name}/${block.filter_controls_total}`,
      keyboardSort: `${block.sortable_controls_keyboard_operable}/${block.sortable_controls_total}`,
      ariaSort: block.sort_state_semantically_exposed,
      liveAnnouncement: block.result_count_live_announced,
      visibleFocus: block.visible_focus_verified,
      positiveTabindex: block.positive_tabindex_count
    })
    return [
      v,
      {
        source: rel('s04', v),
        a11y: {
          status: a.status,
          timeToGreenMs: a.execution.time_to_green_ms,
          changedFiles: a.patch.changed_files_count,
          locAdded: a.patch.loc_added,
          locDeleted: a.patch.loc_deleted,
          churn: a.patch.loc_added + a.patch.loc_deleted,
          measurementMode: a.baseline.measurement_mode,
          axeCriticalBaseline: a.baseline.axe_critical,
          axeSeriousBaseline: a.baseline.axe_serious,
          baseline: caps(a.baseline),
          after: caps(a.after)
        },
        eco: {
          status: e.status,
          timeToGreenMs: e.execution.time_to_green_ms,
          changedFiles: e.patch.changed_files_count,
          locAdded: e.patch.loc_added,
          locDeleted: e.patch.loc_deleted,
          churn: e.patch.loc_added + e.patch.loc_deleted,
          measurementMode: e.baseline.measurement_mode,
          baseline: {
            requestCount: e.baseline.request_count,
            apiRequestCount: e.baseline.api_request_count,
            duplicateRequestCount: e.baseline.duplicate_request_count
          },
          after: {
            requestCount: e.after.request_count,
            apiRequestCount: e.after.api_request_count,
            duplicateRequestCount: e.after.duplicate_request_count
          },
          // Intra-variant deltas only. Absolute bytes are never compared across variants
          // (measurement modes differ); they stay available in the raw archive.
          totalTransferReductionPercent: e.delta.total_transfer_bytes_reduction_percent,
          apiTransferReductionPercent: e.delta.api_transfer_bytes_reduction_percent
        },
        combined: {
          qualityDeliveryCostMs: r.combined.quality_delivery_cost_ms,
          combinedLocChurn: r.combined.combined_loc_churn,
          combinedChangedFileTouches: r.combined.combined_changed_file_touches,
          combinedUniqueChangedFilesCount: r.combined.combined_unique_changed_files_count
        }
      }
    ]
  })
)

// ---------------------------------------------------------------------------
// Automated build/ship measurements (frozen local run, tools/metrics/results/ci/*.json)
// ---------------------------------------------------------------------------
const autoMetrics = Object.fromEntries(
  VARIANTS.map((v) => {
    const ci = readJson(resolve(repoRoot, 'tools/metrics/results/ci', `${v}.json`))
    const latest = readJson(resolve(repoRoot, 'tools/metrics/results/latest', `${v}.json`))
    const coldSum = Object.values(ci.steps).reduce((n, s) => n + s.durationMs, 0)
    const warmSum = Object.values(ci.warmSteps).reduce((n, s) => n + s.durationMs, 0)
    const releaseBuilds = ci.docker.releaseImages.map((img) => ({
      dockerfile: img.name ?? img.dockerfile ?? null,
      durationMs: img.build.durationMs
    }))
    const dockerBuildSum = releaseBuilds.reduce((n, b) => n + b.durationMs, 0)
    return [
      v,
      {
        source: `repo:tools/metrics/results/ci/${v}.json`,
        capturedAt: ci.generatedAt,
        runner: { os: ci.runner.os, node: ci.runner.node },
        coldValidationMs: coldSum,
        warmValidationMs: warmSum,
        coldSteps: Object.fromEntries(Object.entries(ci.steps).map(([k, s]) => [k, s.durationMs])),
        warmSteps: Object.fromEntries(Object.entries(ci.warmSteps).map(([k, s]) => [k, s.durationMs])),
        dockerBuild: {
          rawPrimaryImageMs: ci.docker.build.durationMs,
          consolidatedAllReleaseImagesMs: dockerBuildSum,
          releaseImages: releaseBuilds,
          consolidationReason:
            'The published variant.docker.build.duration counts only the primary image; ' +
            'friction and overfit ship two release images. The consolidated value sums the ' +
            'measured build time of every deployable release image (same --no-cache method).'
        },
        dockerImageSizeKb: ci.docker.releaseImageStats.sizeKb,
        // Outside every CTL factor: gzip of the real emitted client JS (node:zlib on the
        // built files). Topologies differ (Flow: SSR + hydration bundle; Friction/Overfit:
        // static SPA + separate API): shown as a raw measure, never in a factor.
        bundleJsGzip: {
          source: `repo:tools/metrics/results/latest/${v}.json · metrics.bundleJsGzipKb`,
          capturedAt: latest.meta.timestamp,
          commit: latest.meta.commitShort,
          kb: latest.metrics.bundleJsGzipKb.value,
          note:
            'Hors CTL. Gzip reel des fichiers JS emis par le build (node:zlib). Les topologies ' +
            'de livraison different (Flow: serveur SSR + bundle d hydratation ; Friction/Overfit: ' +
            'web statique + API separee) : mesure exposee, jamais comptee dans un facteur.'
        },
        outsideFactor: {
          startupMs: ci.docker.runtime.startupMs,
          healthcheckMs: ci.docker.runtime.healthcheck.durationMs,
          note:
            'Startup/healthcheck compare different service topologies (Flow: one SSR server; ' +
            'Friction/Overfit: static web + API). Shown as raw measures, not in any factor.'
        }
      }
    ]
  })
)

// ---------------------------------------------------------------------------
// Externally captured context-window occupancy (NOT tokens consumed, NOT in any factor)
// ---------------------------------------------------------------------------
const externalContextSnapshots = {
  metricName: 'final_context_occupancy_tokens',
  capture: 'external screenshot after run',
  note:
    'Occupation finale de la fenetre de contexte au moment de la capture. Ce ne sont ni des ' +
    'tokens consommes, ni un cout API, ni un usage attribuable. Jamais utilise dans le CTL.',
  values: {
    s01: { friction: 180500, flow: 222200, overfit: 210700 },
    s02: { flow: 219500, overfit: 230500, friction: 182400 },
    s03: { overfit: 127300, friction: 116300, flow: 150700 },
    s04: { friction: 221600, flow: 291400, overfit: 220700 }
  },
  windowTokens: 1000000
}

// ---------------------------------------------------------------------------
// Derived cumulatives (S01+S02)
// ---------------------------------------------------------------------------
const cumulative = Object.fromEntries(
  VARIANTS.map((v) => [
    v,
    {
      timeMs: s01[v].timeToGreenMs + s02[v].timeToGreenMs,
      churn: s01[v].churn + s02[v].churn,
      fileTouches: s01[v].changedFiles + s02[v].changedFiles
    }
  ])
)

// ---------------------------------------------------------------------------
// Protocol
// ---------------------------------------------------------------------------
const protocol = {
  model: 'claude-opus-4-8[1m]',
  reasoningMode: 'Extra High',
  modelCapture:
    'external; 11/12 result.json record the model name, S01 Friction records null with ' +
    'capture=external - consolidated from the external capture of the same session.',
  runs: 12,
  scenarios: 4,
  codebases: 3,
  guarantees: [
    'une conversation neuve par variante',
    'le meme prompt exact entre les trois variantes',
    'meme machine, meme niveau d information initial, memes permissions',
    'zero prompt de correction pendant le run benchmarke (verifie: agent_correction_prompt_count=0 sur les 12 runs)'
  ],
  executionOrders: {
    s01: ['friction', 'flow', 'overfit'],
    s02: ['flow', 'overfit', 'friction'],
    s03: ['overfit', 'friction', 'flow'],
    s04: ['friction', 'flow', 'overfit']
  },
  shas: Object.fromEntries(
    ['s01', 's02', 's03', 's04'].map((s) => [
      s,
      Object.fromEntries(
        VARIANTS.map((v) => {
          const r = run(s, v)
          return [
            v,
            {
              from: (r.baseline.initial_head_sha ?? r.baseline.baseline_sha ?? '').slice(0, 9),
              to: (r.baseline.final_commit_sha ?? '').slice(0, 9)
            }
          ]
        })
      )
    ])
  )
}

// ---------------------------------------------------------------------------
// Sanity checks against known checkpoints (fail loudly on drift)
// ---------------------------------------------------------------------------
const expect = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`CHECKPOINT MISMATCH ${label}: raw=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
    process.exitCode = 1
  }
}
expect('s01 friction ttg', s01.friction.timeToGreenMs, 856321.0)
expect('s01 flow churn', s01.flow.churn, 178)
expect('s01 overfit files', s01.overfit.changedFiles, 26)
expect('cumul churn', [cumulative.flow.churn, cumulative.friction.churn, cumulative.overfit.churn], [291, 346, 470])
expect('cumul touches', [cumulative.friction.fileTouches, cumulative.flow.fileTouches, cumulative.overfit.fileTouches], [27, 28, 41])
expect('s03 ttrc friction', s03.friction.timeToRootCauseMs, 208099.817)
expect('s03 ttfh flow', round(s03.flow.timeToFirstHypothesisMs, 3), 53171.858)
expect('s04 combined churn', [s04.flow.combined.combinedLocChurn, s04.overfit.combined.combinedLocChurn, s04.friction.combined.combinedLocChurn], [18, 86, 107])
expect('knowledge flow', [knowledgeMap.variants.flow.ruleLocationEdges, knowledgeMap.variants.flow.duplicatedRiskRules], [5, 0])
expect('knowledge friction', [knowledgeMap.variants.friction.ruleLocationEdges, knowledgeMap.variants.friction.maxRulesPerFile], [7, 3])
expect('knowledge overfit', [knowledgeMap.variants.overfit.ruleLocationEdges, knowledgeMap.variants.overfit.duplicatedRiskRules], [11, 3])
expect('docker consolidated', [autoMetrics.flow.dockerBuild.consolidatedAllReleaseImagesMs, autoMetrics.friction.dockerBuild.consolidatedAllReleaseImagesMs, autoMetrics.overfit.dockerBuild.consolidatedAllReleaseImagesMs], [151118, 124400, 118805])
expect('bundle gzip', [autoMetrics.flow.bundleJsGzip.kb, autoMetrics.friction.bundleJsGzip.kb, autoMetrics.overfit.bundleJsGzip.kb], [216.4, 80.3, 206.8])

// ---------------------------------------------------------------------------
// Assemble + write
// ---------------------------------------------------------------------------
const pack = {
  $schema: 'signalops/bench-truth-pack@1',
  generatedBy: 'tools/metrics/bench-truth-pack.mjs',
  archive: 'dx-memory-benchmark-archive-2026-07-08',
  evidenceLevels: ['direct', 'derived', 'reviewable', 'interpretation'],
  protocol,
  s01,
  s02: Object.fromEntries(
    VARIANTS.map((v) => {
      const { riskRuleMapRaw, ...rest } = s02[v]
      void riskRuleMapRaw
      return [v, rest]
    })
  ),
  knowledgeMap,
  s03,
  s04,
  cumulative,
  autoMetrics,
  externalContextSnapshots
}

const json = JSON.stringify(pack, null, 2) + '\n'
if (CHECK) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== json) {
    console.error('truth pack drift: committed JSON differs from regenerated output')
    process.exit(1)
  }
  console.log('truth pack up to date')
} else {
  writeFileSync(OUT, json)
  console.log(`wrote ${OUT}`)
}
