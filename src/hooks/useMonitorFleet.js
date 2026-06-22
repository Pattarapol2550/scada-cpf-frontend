import { useState, useMemo } from 'react'
import {
  MOCK_SCENARIOS,
  SCENARIO_KEYS,
  getScenarioReadouts,
} from '../mocks/monitor/fleetSnapshots.js'
import {
  resolveCompressorStatus,
  resolveLineStatus,
} from '../utils/monitor/compressorStatus.js'

const IS_MOCK = import.meta.env.VITE_MONITOR_MOCK !== 'false'

/**
 * Fleet data for synoptic monitor.
 * Mock mode: scenario-based snapshots. API mode: stub for future integration.
 */
export function useMonitorFleet({ initialScenario = 'allNormal' } = {}) {
  const [scenarioKey, setScenarioKey] = useState(
    SCENARIO_KEYS.includes(initialScenario) ? initialScenario : 'allNormal',
  )
  const [loading] = useState(false)

  const fleet = useMemo(() => {
    if (!IS_MOCK) return []
    return MOCK_SCENARIOS[scenarioKey] ?? MOCK_SCENARIOS.allNormal
  }, [scenarioKey])

  const compressors = useMemo(() => {
    const map = {}
    for (const comp of fleet) {
      map[comp.id] = {
        ...comp,
        status: resolveCompressorStatus(comp),
      }
    }
    return map
  }, [fleet])

  const lineStatus = useMemo(() => resolveLineStatus(fleet), [fleet])

  const tagValues = useMemo(() => {
    if (!IS_MOCK) return getScenarioReadouts('allNormal')
    return getScenarioReadouts(scenarioKey)
  }, [scenarioKey])

  return {
    compressors,
    fleet,
    lineStatus,
    tagValues,
    scenarioKey,
    setScenarioKey,
    scenarioKeys: SCENARIO_KEYS,
    isMock: IS_MOCK,
    loading,
  }
}
