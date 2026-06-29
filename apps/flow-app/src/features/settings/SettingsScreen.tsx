import { useState } from 'react'
import {
  Banner,
  Button,
  Card,
  CardHeader,
  PageHeader,
  Toggle,
  type BannerTone
} from '@signalops/flow-ui'
import { ApiRequestError } from '../../shared/api/client'
import { useHealth, useSimulateError } from '../../shared/api/queries'
import { VARIANT } from '../../app/config'
import styles from './SettingsScreen.module.css'

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

export function SettingsScreen() {
  const health = useHealth()
  const simulateError = useSimulateError()
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(DEFAULT_FLAGS)
  const [banner, setBanner] = useState<{ tone: BannerTone; text: string } | null>(null)

  const onSimulateError = () => {
    simulateError.mutate(undefined, {
      onError: (error) => {
        const requestId =
          error instanceof ApiRequestError ? ` (requestId ${error.apiError.requestId})` : ''
        setBanner({
          tone: 'danger',
          text: `Simulated API error — widgets now show a partial-error state${requestId}.`
        })
      }
    })
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
            <span className={`${styles.envValue} ${styles.envMono}`}>{VARIANT.datasetVersion}</span>
          </div>
          <div className={styles.envRow}>
            <span className={styles.envLabel}>Variant name</span>
            <span className={styles.envValue}>
              <span className={styles.dot} style={{ background: '#ef7e00' }} />
              {VARIANT.label}
            </span>
          </div>
          <div className={styles.envRow}>
            <span className={styles.envLabel}>Region</span>
            <span className={`${styles.envValue} ${styles.envMono}`}>{VARIANT.region}</span>
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
          <Button variant="danger" onClick={onSimulateError}>
            Simulate API error
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              setBanner({
                tone: 'warning',
                text: 'Simulated slow network — responses are delayed by ~3s.'
              })
            }
          >
            Simulate slow network
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFlags(DEFAULT_FLAGS)
              setBanner({ tone: 'success', text: 'Demo state has been reset to defaults.' })
            }}
          >
            Reset demo state
          </Button>
        </div>
      </Card>
    </div>
  )
}
