import { COMPRESSORS } from '../../utils/format.js'
import { criticalAlarm, warningAlarm, warningSuperheat } from './alarmSamples.js'

const TS = '2026-06-18T10:30:00Z'

function baseComp(id, overrides = {}) {
  return {
    id,
    timestamp: TS,
    running: true,
    mode: 'AUTO',
    diagnosis: { alarms: [] },
    readouts: {},
    ...overrides,
  }
}

function fleetFromMap(map) {
  return COMPRESSORS.map(id => baseComp(id, map[id] ?? {}))
}

export const MOCK_SCENARIOS = {
  allNormal: fleetFromMap({}),

  mixedAlarms: fleetFromMap({
    'COMP-05': {
      mode: 'SW',
      diagnosis: { alarms: [warningSuperheat] },
    },
    'COMP-07': {
      diagnosis: { alarms: [criticalAlarm] },
    },
  }),

  someStopped: fleetFromMap({
    'COMP-03': { running: false },
    'COMP-04': { running: false },
  }),

  noData: COMPRESSORS.map(id => ({
    id,
    timestamp: null,
    running: null,
    mode: null,
    diagnosis: null,
    readouts: {},
  })),

  swMode: fleetFromMap({
    'COMP-05': { mode: 'SW' },
  }),
}

export const SCENARIO_KEYS = Object.keys(MOCK_SCENARIOS)

/** Default readout values used across scenarios */
export const DEFAULT_READOUTS = {
  'readout.hp_temp':   { value: 34.5, unit: '°C' },
  'readout.hp_press':  { value: 12.3, unit: 'bar' },
  'readout.evap_temp': { value: -40,  unit: '°C' },
  'readout.lp_temp':   { value: -10,  unit: '°C' },
}

export { warningAlarm, criticalAlarm }
