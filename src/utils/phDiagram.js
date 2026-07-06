const KGCM2_TO_KPA = 98.0665
const ATM_KPA = 101.325

export function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function kgGaugeToMpaAbs(value) {
  const n = finiteNumber(value)
  return n == null ? null : (n * KGCM2_TO_KPA + ATM_KPA) / 1000
}

function firstNumber(...values) {
  for (const value of values) {
    const n = finiteNumber(value)
    if (n != null) return n
  }
  return null
}

function normalizePoint(point, fallback = {}) {
  const h = firstNumber(point?.h, fallback.h)
  const p = firstNumber(point?.p, fallback.p)
  if (h == null || p == null || p <= 0) return null
  return {
    ...fallback,
    ...point,
    h,
    p,
  }
}

function pointNumber(point) {
  const label = String(point?.label ?? '')
  const match = label.match(/^\s*(\d+)(?!s)/i)
  return match ? Number(match[1]) : null
}

function cyclePointByNumber(cycle, number, slotName) {
  const slotPoint = cycle?.[slotName]
  if (pointNumber(slotPoint) === number) return slotPoint

  for (const point of Object.values(cycle ?? {})) {
    if (point && typeof point === 'object' && pointNumber(point) === number) return point
  }

  if (slotPoint && pointNumber(slotPoint) == null) return slotPoint
  return null
}

export function normalizePHCycle(data) {
  if (!data) return null

  const cycle = data.cycle ?? {}
  const diag = data.diagnosis ?? {}
  const enthalpy = { ...diag, ...(data.enthalpy ?? {}), ...(diag.enthalpy ?? {}) }
  const inputs = data.inputs ?? data ?? {}
  const modes = diag.modes ?? data.modes ?? {}
  const saturation = diag.saturation ?? data.saturation ?? {}

  const cyclePoint1 = cyclePointByNumber(cycle, 1, 'point1')
  const cyclePoint2 = cyclePointByNumber(cycle, 2, 'point2')
  const cyclePoint2s = cycle.point2s
  const cyclePoint3 = cyclePointByNumber(cycle, 3, 'point3')
  const cyclePoint4 = cyclePointByNumber(cycle, 4, 'point4')

  const pLow = firstNumber(
    cyclePoint1?.p,
    cyclePoint4?.p,
    data.pressures?.P_low_kPa != null ? data.pressures.P_low_kPa / 1000 : null,
    inputs.P_low_kPa != null ? inputs.P_low_kPa / 1000 : null,
    kgGaugeToMpaAbs(inputs.sp_kg ?? inputs.sp)
  )
  const pHigh = firstNumber(
    cyclePoint2?.p,
    cyclePoint3?.p,
    data.pressures?.P_high_kPa != null ? data.pressures.P_high_kPa / 1000 : null,
    inputs.P_high_kPa != null ? inputs.P_high_kPa / 1000 : null,
    kgGaugeToMpaAbs(inputs.dp_kg ?? inputs.dp)
  )

  return {
    ...cycle,
    point1: normalizePoint(cyclePoint1, {
      h: enthalpy.h1,
      p: pLow,
      label: '1 - Comp. inlet',
      t_c: firstNumber(cyclePoint1?.t_c, modes.st_used, inputs.st_c),
    }),
    point2: normalizePoint(cyclePoint2, {
      h: enthalpy.h2,
      p: pHigh,
      label: '2 - Comp. outlet',
      t_c: firstNumber(cyclePoint2?.t_c, modes.dt_used, inputs.dt_c),
    }),
    point2s: normalizePoint(cyclePoint2s, {
      h: firstNumber(enthalpy.h2s, enthalpy.h2s_b),
      p: pHigh,
      label: '2s - Isentropic',
    }),
    point3: normalizePoint(cyclePoint3, {
      h: enthalpy.h3,
      p: pHigh,
      label: '3 - Cond. outlet',
      t_c: firstNumber(cyclePoint3?.t_c, saturation.T_cond, inputs.liquid_temp_c),
    }),
    point4: normalizePoint(cyclePoint4, {
      h: firstNumber(enthalpy.h4, enthalpy.h3),
      p: pLow,
      label: '4 - Evap. inlet',
    }),
    isentropic_efficiency: firstNumber(
      cycle.isentropic_efficiency,
      diag.eta_is_pct != null ? diag.eta_is_pct / 100 : null,
      diag.performance?.eta_isentropic != null ? diag.performance.eta_isentropic / 100 : null,
      data.performance?.eta_isentropic != null ? data.performance.eta_isentropic / 100 : null
    ),
  }
}

export function cyclePoints(cycle, close = false) {
  const points = [cycle?.point1, cycle?.point2, cycle?.point3, cycle?.point4].filter(Boolean)
  return close && points.length > 2 ? [...points, points[0]] : points
}

export function getPHXRange(cycle, fallback = { min: 150, max: 1800 }) {
  const hs = cyclePoints(cycle).map(p => finiteNumber(p.h)).filter(v => v != null)
  if (!hs.length) return fallback
  const min = Math.min(...hs)
  const max = Math.max(...hs)
  const pad = Math.max((max - min) * 0.18, 20)
  return {
    min: Math.floor(min - pad),
    max: Math.ceil(max + pad),
  }
}
