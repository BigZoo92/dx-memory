import { Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { Overview } from './pages/Overview'
import { Signals } from './pages/Signals'
import { SignalDetail } from './pages/SignalDetail'
import { Incidents } from './pages/Incidents'
import { Compare } from './pages/Compare'
import { DxMetrics } from './pages/DxMetrics'
import { Settings } from './pages/Settings'
import { Ops } from './pages/Ops'

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/signals/:id" element={<SignalDetail />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/dx-metrics" element={<DxMetrics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ops" element={<Ops />} />
      </Routes>
    </Layout>
  )
}
