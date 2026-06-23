const SCENARIO_BUTTONS = [
  { key: 'allNormal',    label: 'All Normal' },
  { key: 'mixedAlarms',  label: 'Mixed Alarms' },
  { key: 'someStopped',  label: 'Some Stopped' },
  { key: 'noData',       label: 'No Data' },
  { key: 'swMode',       label: 'S/W Mode' },
]

/**
 * Dev-only bar to cycle mock fleet scenarios (visible when VITE_MONITOR_MOCK=true).
 */
export default function MockScenarioBar({
  scenarioKey,
  setScenarioKey,
  isMock,
}) {
  if (!isMock) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
      padding: '8px 12px',
      background: 'var(--bg2)',
      border: '1px dashed var(--border-hi)',
      borderRadius: 10,
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-3)',
        marginRight: 4,
      }}>
        Mock scenario
      </span>
      {SCENARIO_BUTTONS.map(({ key, label }) => {
        const active = scenarioKey === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => setScenarioKey(key)}
            style={{
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              borderRadius: 8,
              border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
              background: active ? 'var(--blue-dim)' : 'var(--bg1)',
              color: active ? 'var(--blue)' : 'var(--text-2)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
