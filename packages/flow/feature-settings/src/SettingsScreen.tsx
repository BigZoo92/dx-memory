import { useState } from 'react'
import type { VariantId } from '@signalops/contracts'
import {
  Banner,
  Button,
  Card,
  CardHeader,
  PageHeader,
  Toggle,
  type BannerTone
} from '@signalops/flow-ui'
import { appHref, useDemoControls, useHealth } from '@signalops/flow-api-client'
import styles from './SettingsScreen.module.css'

export type SettingsVariant = {
  id: VariantId
  label: string
  datasetVersion: string
  region: string
}

type FlagKey = 'ai' | 'grouping' | 'dense' | 'autoEscalate' | 'experimental'
const FLAGS: Array<{ key: FlagKey; label: string; description: string }> = [
  {
    key: 'ai',
    label: 'AI recommendations',
    description: 'Show mock AI recommendations on Overview and Signal detail'
  },
  {
    key: 'grouping',
    label: 'Incident grouping',
    description: 'Suggest grouping related signals into a single incident'
  },
  {
    key: 'dense',
    label: 'Dense tables',
    description: 'Use compact row height in Signals Explorer'
  },
  {
    key: 'autoEscalate',
    label: 'Auto-escalation',
    description: 'Automatically escalate signals scoring above 90'
  },
  {
    key: 'experimental',
    label: 'Experimental scoring',
    description: 'Use baseline model v2.5 (preview) for risk scores'
  }
]
const DEFAULT_FLAGS: Record<FlagKey, boolean> = {
  ai: true,
  grouping: true,
  dense: true,
  autoEscalate: false,
  experimental: false
}

export function SettingsScreen({ variant }: { variant: SettingsVariant }) {
  const health = useHealth()
  const { controls, setControl, reset } = useDemoControls()
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(DEFAULT_FLAGS)
  const [banner, setBanner] = useState<{ tone: BannerTone; text: string } | null>(null)

  const toggleError = () => {
    const next = !controls.forceError
    setControl('forceError', next)
    setBanner(
      next
        ? {
            tone: 'danger',
            text: 'Simulated API error — data widgets now show a partial-error state.'
          }
        : { tone: 'success', text: 'API error simulation cleared — widgets will refetch normally.' }
    )
  }

  const toggleSlow = () => {
    const next = !controls.slowNetwork
    setControl('slowNetwork', next)
    setBanner(
      next
        ? { tone: 'warning', text: 'Simulated slow network — responses are delayed by ~3s.' }
        : { tone: 'success', text: 'Slow-network simulation cleared.' }
    )
  }

  const resetDemo = () => {
    reset()
    setFlags(DEFAULT_FLAGS)
    setBanner({ tone: 'success', text: 'Demo state has been reset to defaults.' })
  }

  return (
    <div className="so-page">
      <PageHeader
        title="Settings"
        subtitle="API status, dataset, feature flags and demo controls."
      />

      {banner ? (
        <Banner tone={banner.tone} onRetry={() => setBanner(null)} retryLabel="Dismiss">
          {banner.text}
        </Banner>
      ) : null}

      <div className="so-grid-2">
        <Card>
          <CardHeader title="Environment" />
          <div className={styles.envRow}>
            <span className={styles.envLabel}>API status</span>
            <span className={styles.envValue}>
              <span
                className={styles.dot}
                style={{ background: health.data?.status === 'ok' ? '#12b76a' : '#d9a200' }}
              />
              {health.data?.status === 'ok' ? 'Operational' : (health.data?.status ?? 'checking…')}
            </span>
          </div>
          <div className={styles.envRow}>
            <span className={styles.envLabel}>Dataset version</span>
            <span className={`${styles.envValue} ${styles.envMono}`}>{variant.datasetVersion}</span>
          </div>
          <div className={styles.envRow}>
            <span className={styles.envLabel}>Variant name</span>
            <span className={styles.envValue}>
              <span className={styles.dot} style={{ background: '#ef7e00' }} />
              {variant.label}
            </span>
          </div>
          <div className={styles.envRow}>
            <span className={styles.envLabel}>Region</span>
            <span className={`${styles.envValue} ${styles.envMono}`}>{variant.region}</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Feature flags" />
          {FLAGS.map((flag) => (
            <Toggle
              key={flag.key}
              label={flag.label}
              description={flag.description}
              checked={flags[flag.key]}
              onChange={(value) => setFlags((prev) => ({ ...prev, [flag.key]: value }))}
            />
          ))}
        </Card>
      </div>

      <Card>
        <CardHeader title="Demo controls" />
        <div className={styles.demoButtons}>
          <Button variant={controls.forceError ? 'primary' : 'danger'} onClick={toggleError}>
            {controls.forceError ? 'Stop API error' : 'Simulate API error'}
          </Button>
          <Button variant="secondary" onClick={toggleSlow}>
            {controls.slowNetwork ? 'Stop slow network' : 'Simulate slow network'}
          </Button>
          <Button variant="secondary" onClick={resetDemo}>
            Reset demo state
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Operational health"
          subtitle="Errors, alerts and diagnostics captured during this demo session."
        />
        <p style={{ margin: '0 0 12px', color: 'var(--so-slate-600, #475467)', fontSize: 14 }}>
          Inspect the error inbox, active alerts, run-health counters and breadcrumbs, and download a
          redacted diagnostic pack.
        </p>
        <a
          href={appHref('/ops')}
          style={{ color: 'var(--so-accent-hover, #9a5100)', fontWeight: 600, textDecoration: 'none' }}
        >
          Open operational health
        </a>
      </Card>
    </div>
  )
}
