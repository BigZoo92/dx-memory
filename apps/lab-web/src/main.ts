import './styles.css'

type HealthId = 'flow' | 'friction' | 'overfit' | 'metrics'
type HealthState = 'checking' | 'available' | 'unavailable'

const HEALTH_ENDPOINTS: Record<HealthId, string> = {
  flow: '/healthz/flow',
  friction: '/healthz/friction',
  overfit: '/healthz/overfit',
  metrics: '/healthz/metrics'
}

const LABELS: Record<HealthState, string> = {
  checking: 'Vérification...',
  available: 'Disponible',
  unavailable: 'Indisponible'
}

function setStatus(id: HealthId, state: HealthState) {
  document.querySelectorAll<HTMLElement>(`[data-health-id="${id}"]`).forEach((node) => {
    node.dataset.state = state
    const label = node.querySelector('span:last-child')
    if (label) label.textContent = LABELS[state]
  })
}

async function checkEndpoint(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

async function refreshHealth() {
  const entries = Object.entries(HEALTH_ENDPOINTS) as Array<[HealthId, string]>
  entries.forEach(([id]) => setStatus(id, 'checking'))
  const results = await Promise.allSettled(
    entries.map(async ([id, url]) => [id, await checkEndpoint(url)] as const)
  )
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const [id, ok] = result.value
      setStatus(id, ok ? 'available' : 'unavailable')
    }
  }
}

document.getElementById('refresh-health')?.addEventListener('click', () => {
  void refreshHealth()
})

void refreshHealth()
