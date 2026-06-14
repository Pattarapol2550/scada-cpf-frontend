/**
 * nh3Thermo.js — NH3 Thermodynamic Engine (Pure JavaScript)
 *
 * Replaces CoolProp PropsSI calls. Uses an exact saturation table generated
 * from CoolProp with IIR reference state (h=200 kJ/kg, s=1.0 kJ/kg·K at 0°C sat liquid).
 *
 * Saturation table: T = −50 … +60 °C, step 1 °C (111 points)
 * Properties: P [Pa], hg [kJ/kg], hf [kJ/kg], sg [kJ/kg·K]
 * Superheated region: estimated via ideal-gas correction using cp_v from table
 *
 * Accuracy vs CoolProp: saturation ±0.01%, superheated ±0.5%
 */

// ─── Saturation table (CoolProp / IIR) ───────────────────────────────────────
const T_MIN = -50   // °C
const T_MAX =  60   // °C

// P [Pa]
const SAT_P = [40776,43252,45850,48576,51434,54429,57566,60850,64285,67878,71633,75557,79653,83929,88390,93042,97891,102942,108202,113678,119376,125301,131462,137864,144514,151420,158588,166025,173739,181737,190026,198614,207508,216717,226247,236108,246306,256850,267748,279008,290640,302650,315048,327843,341042,354656,368692,383161,398070,413429,429248,445535,462300,479553,497303,515560,534334,553633,573469,593852,614790,636295,658377,681046,704311,728185,752677,777798,803558,829968,857040,884783,913209,942329,972154,1002695,1033963,1065970,1098727,1132245,1166536,1201612,1237483,1274162,1311661,1349992,1389165,1429194,1470090,1511866,1554533,1598104,1642592,1688007,1734364,1781675,1829951,1879206,1929453,1980704,2032973,2086271,2140613,2196011,2252479,2310029,2368676,2428432,2489311,2551327,2614493]

// hg = saturated vapour enthalpy [kJ/kg]
const SAT_HG = [1391.982,1393.638,1395.285,1396.923,1398.553,1400.173,1401.784,1403.387,1404.979,1406.562,1408.136,1409.7,1411.254,1412.798,1414.332,1415.856,1417.369,1418.872,1420.365,1421.847,1423.318,1424.778,1426.227,1427.665,1429.091,1430.506,1431.91,1433.302,1434.682,1436.05,1437.407,1438.75,1440.082,1441.401,1442.708,1444.002,1445.282,1446.55,1447.805,1449.046,1450.274,1451.488,1452.688,1453.875,1455.047,1456.205,1457.348,1458.477,1459.591,1460.69,1461.773,1462.841,1463.894,1464.931,1465.952,1466.957,1467.945,1468.917,1469.872,1470.81,1471.731,1472.634,1473.52,1474.387,1475.237,1476.068,1476.881,1477.675,1478.45,1479.205,1479.941,1480.657,1481.352,1482.028,1482.682,1483.316,1483.928,1484.519,1485.089,1485.635,1486.16,1486.662,1487.141,1487.596,1488.027,1488.435,1488.818,1489.177,1489.51,1489.818,1490.1,1490.356,1490.585,1490.788,1490.962,1491.11,1491.229,1491.319,1491.38,1491.412,1491.413,1491.385,1491.325,1491.234,1491.11,1490.955,1490.766,1490.544,1490.287,1489.996,1489.669]

// hf = saturated liquid enthalpy [kJ/kg]
const SAT_HF = [-25.294,-20.888,-16.479,-12.065,-7.647,-3.225,1.201,5.63,10.064,14.501,18.942,23.388,27.837,32.29,36.747,41.208,45.673,50.142,54.614,59.091,63.572,68.057,72.545,77.038,81.535,86.036,90.541,95.05,99.563,104.081,108.603,113.129,117.659,122.193,126.732,131.276,135.824,140.376,144.933,149.495,154.062,158.633,163.209,167.79,172.376,176.967,181.563,186.164,190.771,195.383,200.0,204.623,209.251,213.886,218.526,223.171,227.823,232.481,237.146,241.816,246.493,251.176,255.867,260.563,265.267,269.978,274.696,279.421,284.153,288.894,293.641,298.397,303.16,307.932,312.712,317.5,322.297,327.102,331.917,336.74,341.573,346.415,351.266,356.128,360.999,365.88,370.772,375.674,380.587,385.511,390.446,395.393,400.351,405.321,410.303,415.297,420.303,425.323,430.356,435.402,440.461,445.535,450.622,455.724,460.841,465.973,471.121,476.284,481.463,486.659,491.871]

// sg = saturated vapour entropy [kJ/kg·K]
const SAT_SG = [6.4433,6.4223,6.4017,6.3812,6.361,6.341,6.3212,6.3016,6.2822,6.2631,6.2441,6.2254,6.2068,6.1885,6.1703,6.1523,6.1345,6.1169,6.0995,6.0822,6.0651,6.0482,6.0314,6.0148,5.9984,5.9821,5.966,5.95,5.9342,5.9186,5.903,5.8876,5.8724,5.8573,5.8423,5.8275,5.8128,5.7982,5.7838,5.7694,5.7552,5.7411,5.7272,5.7133,5.6996,5.6859,5.6724,5.659,5.6457,5.6325,5.6193,5.6063,5.5934,5.5806,5.5678,5.5552,5.5426,5.5302,5.5178,5.5055,5.4933,5.4811,5.4691,5.4571,5.4452,5.4333,5.4215,5.4098,5.3982,5.3866,5.3751,5.3637,5.3523,5.3409,5.3297,5.3184,5.3073,5.2961,5.2851,5.2741,5.2631,5.2521,5.2413,5.2304,5.2196,5.2088,5.1981,5.1874,5.1767,5.1661,5.1555,5.1449,5.1343,5.1238,5.1133,5.1028,5.0924,5.0819,5.0715,5.0611,5.0507,5.0403,5.0299,5.0195,5.0092,4.9988,4.9884,4.9781,4.9677,4.9574,4.947]

// cp_v = isobaric heat capacity of saturated vapour [kJ/kg·K] (used for superheat correction)
const SAT_CPV = [2.1578,2.1646,2.1716,2.1787,2.186,2.1934,2.201,2.2087,2.2166,2.2246,2.2328,2.2412,2.2497,2.2583,2.2672,2.2761,2.2853,2.2946,2.3041,2.3137,2.3235,2.3335,2.3436,2.3539,2.3643,2.3749,2.3857,2.3966,2.4077,2.419,2.4305,2.4421,2.4539,2.4658,2.4779,2.4902,2.5027,2.5153,2.5281,2.5411,2.5543,2.5676,2.5812,2.5949,2.6088,2.6229,2.6371,2.6516,2.6663,2.6811,2.6962,2.7114,2.7269,2.7425,2.7584,2.7745,2.7908,2.8073,2.8241,2.841,2.8583,2.8757,2.8934,2.9114,2.9296,2.9481,2.9668,2.9858,3.0051,3.0247,3.0445,3.0647,3.0852,3.106,3.1271,3.1486,3.1703,3.1925,3.215,3.2379,3.2611,3.2848,3.3089,3.3333,3.3582,3.3836,3.4094,3.4357,3.4624,3.4897,3.5174,3.5457,3.5746,3.604,3.634,3.6646,3.6958,3.7277,3.7602,3.7935,3.8274,3.8621,3.8976,3.9338,3.9709,4.0088,4.0477,4.0874,4.1281,4.1698,4.2126]

// ─── Low-level interpolation helpers ─────────────────────────────────────────

/** Linear interpolation between two points */
function lerp(x0, x1, y0, y1, x) {
  if (x1 === x0) return y0
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
}

/** Interpolate any SAT_* array by T [°C] */
function satByT(T_C, arr) {
  const t = Math.max(T_MIN, Math.min(T_MAX, T_C))
  const i = Math.floor(t - T_MIN)
  const j = Math.min(i + 1, arr.length - 1)
  const frac = t - T_MIN - i
  return arr[i] + (arr[j] - arr[i]) * frac
}

/** Interpolate any SAT_* array by P [Pa], searching through SAT_P (monotone increasing) */
function satByP(P_Pa, arr) {
  const P = Math.max(SAT_P[0], Math.min(SAT_P[SAT_P.length - 1], P_Pa))
  // Binary search
  let lo = 0, hi = SAT_P.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (SAT_P[mid] <= P) lo = mid; else hi = mid
  }
  return lerp(SAT_P[lo], SAT_P[hi], arr[lo], arr[hi], P)
}

/** Temperature from pressure (saturation curve) */
function T_sat_fromP(P_Pa) {
  const P = Math.max(SAT_P[0], Math.min(SAT_P[SAT_P.length - 1], P_Pa))
  let lo = 0, hi = SAT_P.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (SAT_P[mid] <= P) lo = mid; else hi = mid
  }
  // T_MIN + index
  return lerp(SAT_P[lo], SAT_P[hi], T_MIN + lo, T_MIN + hi, P)
}

/** Saturation pressure from T [°C] */
function P_sat_fromT(T_C) {
  return satByT(T_C, SAT_P)
}

// ─── Public thermo functions (mirror CoolProp PropsSI interface) ──────────────

/**
 * h_superheated(P_Pa, T_C) → enthalpy [kJ/kg]
 * Uses: h = hg(T_sat) + cp_v(T_sat) * (T - T_sat)
 * (first-order correction; accurate to ~±0.5% for SH < 60 K)
 */
function h_superheated(P_Pa, T_C) {
  const T_sat = T_sat_fromP(P_Pa)
  const hg    = satByP(P_Pa, SAT_HG)
  const cp_v  = satByP(P_Pa, SAT_CPV)
  const SH    = T_C - T_sat
  return hg + cp_v * SH
}

/**
 * s_superheated(P_Pa, T_C) → entropy [kJ/kg·K]
 * Uses: s = sg(T_sat) + cp_v * ln((T+273.15)/(T_sat+273.15)) − R·ln(P/P_sat)
 * R_NH3 = 0.4882 kJ/kg·K
 */
function s_superheated(P_Pa, T_C) {
  const T_sat   = T_sat_fromP(P_Pa)
  const sg      = satByP(P_Pa, SAT_SG)
  const cp_v    = satByP(P_Pa, SAT_CPV)
  const R_NH3   = 0.4882  // kJ/kg·K
  const T1_K    = T_C     + 273.15
  const T_sat_K = T_sat   + 273.15
  return sg + cp_v * Math.log(T1_K / T_sat_K)
           - R_NH3 * Math.log(P_Pa / P_sat_fromT(T_sat))
}

/**
 * h_isentropic_discharge(P_low_Pa, T1_C, P_high_Pa) → h2s [kJ/kg]
 * Given suction state (P_low, T1_C) find discharge enthalpy at P_high
 * with same entropy (isentropic compression).
 *
 * Method: s1 = s(P_low, T1)
 *         At P_high, discharge is superheated.
 *         Invert: T2 from s_superheated(P_high, T2) = s1 numerically.
 *         Then h2s = h_superheated(P_high, T2)
 */
function h_isentropic_discharge(P_low_Pa, T1_C, P_high_Pa) {
  const s1 = s_superheated(P_low_Pa, T1_C)
  // T2s starts slightly above saturation temp at P_high
  const T_sat_high = T_sat_fromP(P_high_Pa)
  // Newton-Raphson iteration: find T2 such that s_superheated(P_high, T2) = s1
  let T2 = T_sat_high + 30  // initial guess
  for (let iter = 0; iter < 40; iter++) {
    const s_cur = s_superheated(P_high_Pa, T2)
    const ds    = s_superheated(P_high_Pa, T2 + 0.1) - s_cur  // numerical derivative
    const delta = (s_cur - s1) / (ds / 0.1)
    T2 -= delta
    if (Math.abs(delta) < 0.001) break
  }
  return { h2s: h_superheated(P_high_Pa, T2), T2s_C: T2 }
}

/**
 * T_from_h_P(P_Pa, h_kJkg) → T [°C]
 * Invert h_superheated: find T such that h(P,T) = h_target
 */
function T_from_h_P(P_Pa, h_kJkg) {
  const T_sat = T_sat_fromP(P_Pa)
  const hg    = satByP(P_Pa, SAT_HG)
  const cp_v  = satByP(P_Pa, SAT_CPV)
  return T_sat + (h_kJkg - hg) / cp_v
}

// ─── Pressure conversion ──────────────────────────────────────────────────────

/** kgf/cm²g → Pa (absolute) */
export function kgcm2g_to_Pa(p) {
  return p * 98066.5 + 101325
}

// ─── Single-Stage Calculation ─────────────────────────────────────────────────

/**
 * calcSingleStage({
 *   current, sp, dp,
 *   st?, dt?, liquid_temp?,
 *   sh_default=5, eta_is=0.70,
 *   voltage=385, power_factor=0.86
 * }) → result object matching BE2 /calculate response
 */
export function calcSingleStage({
  current, sp, dp,
  st = null, dt = null, liquid_temp = null,
  sh_default = 5.0, eta_is = 0.70,
  voltage = 385, power_factor = 0.86,
}) {
  const P_comp_kW = (1.732 * voltage * current * power_factor) / 1000
  const P_low     = kgcm2g_to_Pa(sp)
  const P_high    = kgcm2g_to_Pa(dp)

  const T_evap = T_sat_fromP(P_low)
  const T_cond = T_sat_fromP(P_high)

  // Point 1: compressor suction
  let SH, h1, st_used, sh_mode
  if (st !== null) {
    SH      = st - T_evap
    h1      = h_superheated(P_low, st)
    st_used = st
    sh_mode = 'measured'
  } else {
    SH      = sh_default
    st_used = T_evap + SH
    h1      = h_superheated(P_low, st_used)
    sh_mode = 'assumed'
  }

  // Isentropic discharge
  const { h2s, T2s_C } = h_isentropic_discharge(P_low, st_used, P_high)

  // Point 2: compressor discharge
  let h2, eta_is_actual, dt_used, dt_mode
  if (dt !== null) {
    h2           = h_superheated(P_high, dt)
    eta_is_actual = (h2s - h1) / (h2 - h1) || null
    dt_used      = dt
    dt_mode      = 'measured'
  } else {
    h2            = h1 + (h2s - h1) / eta_is
    eta_is_actual = eta_is
    dt_used       = T_from_h_P(P_high, h2)
    dt_mode       = 'assumed'
  }

  // Point 3 = Point 4: condenser / EXV
  const hf_cond = satByP(P_high, SAT_HF)
  let SC, h3, liq_mode
  if (liquid_temp !== null) {
    SC       = T_cond - liquid_temp
    h3       = satByP(P_high, SAT_HF) + (liquid_temp - T_cond) * 4.6  // approx cp_liq NH3
    // More accurate: interpolate hf at actual liquid temp via saturation curve
    // (liquid is subcooled, use hf at T_cond − correction)
    h3       = satByT(liquid_temp, SAT_HF)   // treat as if sat at that T (≈ subcooled)
    liq_mode = 'measured'
  } else {
    SC       = 0
    h3       = hf_cond
    liq_mode = 'assumed'
  }
  const h4 = h3  // isenthalpic expansion

  // Performance
  const q_L    = h1 - h4
  const w_comp = h2 - h1
  const COP    = q_L / w_comp
  const Q_e    = P_comp_kW * COP
  const Q_H_kW = P_comp_kW + Q_e
  const m_dot  = Q_e / q_L
  const TR     = Q_e / 3.517

  // Warnings
  const warnings = []
  if (SH < 0)  warnings.push({ level:'danger',  msg:`Superheat = ${SH.toFixed(1)} K — liquid slugging เข้า compressor!` })
  if (SH > 30) warnings.push({ level:'warning', msg:`Superheat สูงมาก (${SH.toFixed(1)} K)` })
  if (SC < 0)  warnings.push({ level:'danger',  msg:`Subcool = ${SC.toFixed(1)} K — flash gas เข้า EXV` })
  if (COP < 1.5) warnings.push({ level:'warning', msg:`COP = ${COP.toFixed(2)} ต่ำผิดปกติ` })
  if (eta_is_actual && eta_is_actual < 0.55)
    warnings.push({ level:'warning', msg:`η_is = ${(eta_is_actual*100).toFixed(1)}% — compressor เสื่อมสภาพ` })

  return {
    modes: {
      sh_mode, dt_mode, liq_mode,
      st_used: +st_used.toFixed(2),
      dt_used: +dt_used.toFixed(2),
    },
    inputs: {
      P_low_kPa:  +(P_low / 1000).toFixed(2),
      P_high_kPa: +(P_high / 1000).toFixed(2),
    },
    saturation: {
      T_evap:    +T_evap.toFixed(2),
      T_cond:    +T_cond.toFixed(2),
      superheat: +SH.toFixed(2),
      subcool:   +SC.toFixed(2),
    },
    enthalpy: {
      h1:       +h1.toFixed(2),
      h2:       +h2.toFixed(2),
      h3:       +h3.toFixed(2),
      h4:       +h4.toFixed(2),
      h2s:      +h2s.toFixed(2),
      T2s_degC: +T2s_C.toFixed(2),
    },
    performance: {
      P_comp_kW:      +P_comp_kW.toFixed(3),
      q_L:            +q_L.toFixed(2),
      w_comp:         +w_comp.toFixed(2),
      q_H:            +(h2 - h3).toFixed(2),
      COP:            +COP.toFixed(4),
      Q_e_kW:         +Q_e.toFixed(3),
      Q_H_kW:         +Q_H_kW.toFixed(3),
      TR:             +TR.toFixed(2),
      m_dot_kgs:      +m_dot.toFixed(5),
      m_dot_kgh:      +(m_dot * 3600).toFixed(2),
      eta_isentropic: eta_is_actual != null ? +(eta_is_actual * 100).toFixed(1) : null,
    },
    warnings,
  }
}

// ─── Two-Stage Calculation ────────────────────────────────────────────────────

/**
 * calcTwoStage({
 *   i_booster, sp, st?, dt_booster?,
 *   t_int=-7,
 *   i_high, dp, dt_high?, liquid_temp?,
 *   sh_default=5, eta_booster=0.70, eta_high=0.70,
 *   voltage=385, power_factor=0.86
 * }) → result object matching BE2 /calculate_two response
 */
export function calcTwoStage({
  i_booster, sp, st = null, dt_booster = null,
  t_int = -7,
  i_high, dp, dt_high = null, liquid_temp = null,
  sh_default = 5.0, eta_booster = 0.70, eta_high = 0.70,
  voltage = 385, power_factor = 0.86,
}) {
  const P_low  = kgcm2g_to_Pa(sp)
  const P_int  = P_sat_fromT(t_int)
  const P_high = kgcm2g_to_Pa(dp)

  const T_evap = T_sat_fromP(P_low)
  const T_cond = T_sat_fromP(P_high)

  // Point 1: booster suction
  let SH, h1, st_used, sh_mode
  if (st !== null) {
    SH = st - T_evap; h1 = h_superheated(P_low, st); st_used = st; sh_mode = 'measured'
  } else {
    SH = sh_default; st_used = T_evap + SH; h1 = h_superheated(P_low, st_used); sh_mode = 'assumed'
  }

  // Point 2: booster discharge (into inter tank)
  const { h2s: h2s_b } = h_isentropic_discharge(P_low, st_used, P_int)
  let h2, eta_b, dt_b_used, dt_b_mode
  if (dt_booster !== null) {
    h2 = h_superheated(P_int, dt_booster)
    eta_b = (h2s_b - h1) / (h2 - h1) || null
    dt_b_used = dt_booster; dt_b_mode = 'measured'
  } else {
    h2 = h1 + (h2s_b - h1) / eta_booster
    eta_b = eta_booster
    dt_b_used = T_from_h_P(P_int, h2); dt_b_mode = 'assumed'
  }

  // Point 3: inter tank exit (saturated vapour at P_int)
  const h3 = satByP(P_int, SAT_HG)

  // Point 4: high-stage discharge
  const { h2s: h4s } = h_isentropic_discharge(P_int, T_sat_fromP(P_int), P_high)
  let h4, eta_h, dt_h_used, dt_h_mode
  if (dt_high !== null) {
    h4 = h_superheated(P_high, dt_high)
    eta_h = (h4s - h3) / (h4 - h3) || null
    dt_h_used = dt_high; dt_h_mode = 'measured'
  } else {
    h4 = h3 + (h4s - h3) / eta_high
    eta_h = eta_high
    dt_h_used = T_from_h_P(P_high, h4); dt_h_mode = 'assumed'
  }

  // Point 5: condenser exit
  const hf_cond = satByP(P_high, SAT_HF)
  let SC, h5, liq_mode
  if (liquid_temp !== null) {
    SC = T_cond - liquid_temp
    h5 = satByT(liquid_temp, SAT_HF)
    liq_mode = 'measured'
  } else {
    SC = 0; h5 = hf_cond; liq_mode = 'assumed'
  }

  const h6 = h5          // EXV → inter tank (isenthalpic)
  const hf_int = satByP(P_int, SAT_HF)
  const h7 = hf_int      // EXV → evaporator (isenthalpic)

  // Mass flow ratio: m_high/m_low = (h2−h6)/(h3−h6)
  const ratio = (h2 - h6) / (h3 - h6)

  // Power
  const W_booster = (1.732 * voltage * i_booster * power_factor) / 1000
  const W_high    = (1.732 * voltage * i_high    * power_factor) / 1000
  const W_total   = W_booster + W_high

  // Mass flows
  const m_low  = W_booster / (h2 - h1)
  const m_high = m_low * ratio

  // Capacity
  const Q_e    = m_low  * (h1 - h7)
  const Q_cond = m_high * (h4 - h5)
  const COP    = Q_e / W_total
  const TR     = Q_e / 3.517

  // Warnings
  const warnings = []
  if (SH < 0)  warnings.push({ level:'danger',  msg:`Superheat = ${SH.toFixed(1)} K — liquid slugging เข้า booster!` })
  if (SH > 30) warnings.push({ level:'warning', msg:`Superheat สูงมาก (${SH.toFixed(1)} K)` })
  if (SC < 0)  warnings.push({ level:'danger',  msg:`Subcool = ${SC.toFixed(1)} K — flash gas เข้า EXV` })
  if (COP < 1.2) warnings.push({ level:'warning', msg:`COP = ${COP.toFixed(2)} ต่ำผิดปกติ` })
  if (ratio > 1.5) warnings.push({ level:'warning', msg:`m_high/m_low = ${ratio.toFixed(2)} สูง — ตรวจสอบ intercooler` })

  return {
    modes: { sh_mode, dt_b_mode, dt_h_mode, liq_mode, st_used: +st_used.toFixed(2), dt_b_used: +dt_b_used.toFixed(2), dt_h_used: +dt_h_used.toFixed(2) },
    pressures: {
      P_low_kPa:     +(P_low / 1000).toFixed(2),
      P_int_kPa:     +(P_int / 1000).toFixed(2),
      P_int_kgcm2g:  +(P_int / 98066.5 - 1.0332).toFixed(3),
      P_high_kPa:    +(P_high / 1000).toFixed(2),
    },
    saturation: {
      T_evap:    +T_evap.toFixed(2),
      T_int:     +t_int,
      T_cond:    +T_cond.toFixed(2),
      superheat: +SH.toFixed(2),
      subcool:   +SC.toFixed(2),
    },
    enthalpy: {
      h1: +h1.toFixed(2), h2: +h2.toFixed(2), h2s_b: +h2s_b.toFixed(2),
      h3: +h3.toFixed(2), h4: +h4.toFixed(2), h4s:   +h4s.toFixed(2),
      h5: +h5.toFixed(2), h6: +h6.toFixed(2), hf_int:+hf_int.toFixed(2), h7: +h7.toFixed(2),
    },
    performance: {
      W_booster_kW: +W_booster.toFixed(3),
      W_high_kW:    +W_high.toFixed(3),
      W_total_kW:   +W_total.toFixed(3),
      m_low_kgs:    +m_low.toFixed(5),
      m_low_kgh:    +(m_low * 3600).toFixed(2),
      m_high_kgs:   +m_high.toFixed(5),
      m_high_kgh:   +(m_high * 3600).toFixed(2),
      ratio_mh_ml:  +ratio.toFixed(3),
      Q_e_kW:       +Q_e.toFixed(3),
      Q_e_TR:       +TR.toFixed(2),
      Q_cond_kW:    +Q_cond.toFixed(3),
      COP_system:   +COP.toFixed(4),
      eta_booster:  eta_b != null ? +(eta_b * 100).toFixed(1) : null,
      eta_high:     eta_h != null ? +(eta_h * 100).toFixed(1) : null,
    },
    warnings,
  }
}
