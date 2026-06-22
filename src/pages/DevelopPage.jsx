/**
 * DevelopPage.jsx — SCADA synoptic monitor (monitor root)
 * Route: /develop
 */
import Navbar from '../components/layout/Navbar'
import MonitorCanvas from '../components/monitor/MonitorCanvas'
import { useMonitorFleet } from '../hooks/useMonitorFleet'

export default function DevelopPage() {
  // Hook wired for mock fleet; consumed by layers in Steps 7+
  useMonitorFleet()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar />

      <main style={{
        flex: 1,
        width: '100%',
        padding: '12px 16px 16px',
        minHeight: 0,
      }}>
        <MonitorCanvas />
      </main>
    </div>
  )
}
