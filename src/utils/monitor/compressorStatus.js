/**
 * STATUS RESOLVER v1 (MOCK)
 * - Critical/Warning: from diagnosis.alarms (confirmed with backend)
 * - Stopped: running === false (placeholder — confirm with PLC team)
 * - Normal: default when data exists and no alarms
 * TODO: refine stopped/normal when running signal is defined
 */

export const STATUS = {
  LOADING:  'loading',
  NO_DATA:  'no_data',
  STOPPED:  'stopped',
  NORMAL:   'normal',
  WARNING:  'warning',
  CRITICAL: 'critical',
}

/** @param {{ timestamp?: string|null, running?: boolean|null, diagnosis?: { alarms?: Array<{ severity: string }> } }|null|undefined} comp */
export function resolveCompressorStatus(comp) {
  if (comp == null) return STATUS.LOADING
  if (!comp.timestamp) return STATUS.NO_DATA

  const alarms = comp.diagnosis?.alarms ?? []
  if (alarms.some(a => a.severity === 'Critical')) return STATUS.CRITICAL
  if (alarms.some(a => a.severity === 'Warning')) return STATUS.WARNING
  if (comp.running === false) return STATUS.STOPPED

  return STATUS.NORMAL
}

/** @param {Array<{ timestamp?: string|null, running?: boolean|null, diagnosis?: { alarms?: Array<{ severity: string }> } }>} compressors */
export function resolveLineStatus(compressors) {
  if (!compressors?.length) return STATUS.LOADING

  const statuses = compressors.map(resolveCompressorStatus)

  if (statuses.some(s => s === STATUS.LOADING)) return STATUS.LOADING
  if (statuses.some(s => s === STATUS.CRITICAL)) return STATUS.CRITICAL
  if (statuses.some(s => s === STATUS.WARNING)) return STATUS.WARNING
  if (statuses.every(s => s === STATUS.NO_DATA)) return STATUS.NO_DATA
  return STATUS.NORMAL
}
