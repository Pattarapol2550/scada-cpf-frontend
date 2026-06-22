/**
 * DevelopPage.jsx — SCADA synoptic monitor (monitor root)
 * Route: /develop
 */
import Navbar from '../components/layout/Navbar'
import LineStatusBar from '../components/monitor/LineStatusBar'
import MockScenarioBar from '../components/monitor/MockScenarioBar'
import MonitorCanvas from '../components/monitor/MonitorCanvas'
import { useMonitorFleet } from '../hooks/useMonitorFleet'

export default function DevelopPage() {
  const {
    compressors,
    lineStatus,
    scenarioKey,
    setScenarioKey,
    isMock,
  } = useMonitorFleet()

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
        <MockScenarioBar
          scenarioKey={scenarioKey}
          setScenarioKey={setScenarioKey}
          isMock={isMock}
        />
        <LineStatusBar lineStatus={lineStatus} />
        <MonitorCanvas compressors={compressors} />
      </main>
    </div>
  )
}
