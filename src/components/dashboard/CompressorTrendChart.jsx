import { useMemo, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { getMetrics } from '../../services/api'

// --- Metric registry -------------------------------------------------------
// accessor reads the value off a raw /api/metrics record (flat fields + nested diagnosis.*)
// Line style (dash pattern) is assigned per-group below so lines from the same
// group share a pattern — a secondary visual cue on top of color.
const METRIC_GROUPS = [
  {
    group: 'Performance',
    dash: [],
    metrics: [
      { key: 'cop', label: 'COP', unit: '', get: r => r.diagnosis?.cop },
      { key: 'power_kw', label: 'Power', unit: 'kW', get: r => r.diagnosis?.power_kw },
      { key: 'q_e_kw', label: 'Cooling Q_e', unit: 'kW', get: r => r.diagnosis?.q_e_kw },
      { key: 'm_dot_kgh', label: 'Mass flow', unit: 'kg/h', get: r => r.diagnosis?.m_dot_kgh },
      { key: 'pressure_ratio', label: 'Pressure ratio', unit: '', get: r => r.diagnosis?.pressure_ratio },
      { key: 'superheat_suc', label: 'Superheat (SH)', unit: 'K', get: r => r.diagnosis?.superheat_suc },
      { key: 'subcooling', label: 'Subcooling (SC)', unit: 'K', get: r => r.diagnosis?.subcooling },
    ],
  },
  {
    group: 'Cycle / Enthalpy',
    dash:[8, 4],
    metrics: [
      { key: 't_evap_c', label: 'Evap temp', unit: '°C', get: r => r.diagnosis?.enthalpy?.t_evap_c },
      { key: 't_cond_c', label: 'Cond temp', unit: '°C', get: r => r.diagnosis?.enthalpy?.t_cond_c },
      { key: 'eta_is_pct', label: 'Isentropic η', unit: '%', get: r => r.diagnosis?.enthalpy?.eta_is_pct },
      { key: 'q_l_kjkg', label: 'Refrig. effect', unit: 'kJ/kg', get: r => r.diagnosis?.enthalpy?.q_l_kjkg },
      { key: 'w_comp_kjkg', label: 'Comp. work', unit: 'kJ/kg', get: r => r.diagnosis?.enthalpy?.w_comp_kjkg },
    ],
  },
  {
    group: 'Pressures',
    dash: [3, 3],
    metrics: [
      { key: 'sp_kg', label: 'Suction P (SP)', unit: 'kg/cm²', get: r => r.sp_kg },
      { key: 'dp_kg', label: 'Discharge P (DP)', unit: 'kg/cm²', get: r => r.dp_kg },
      { key: 'oil_pressure', label: 'Oil pressure', unit: 'kg/cm²', get: r => r.oil_pressure },
    ],
  },
  {
    group: 'Temperatures',
    dash: [12, 4, 2, 4],
    metrics: [
      { key: 'st_c', label: 'Suction T (ST)', unit: '°C', get: r => r.st_c },
      { key: 'dt_c', label: 'Discharge T (DT)', unit: '°C', get: r => r.dt_c },
      { key: 'liquid_temp_c', label: 'Liquid line T', unit: '°C', get: r => r.liquid_temp_c },
      { key: 'condenser_temp_c', label: 'Condenser T', unit: '°C', get: r => r.condenser_temp_c },
      { key: 'oil_temp', label: 'Oil temp', unit: '°C', get: r => r.oil_temp },
      { key: 'glycol_temp', label: 'Glycol temp', unit: '°C', get: r => r.glycol_temp },
    ],
  },
  {
    group: 'Electrical',
    dash: [2,6],
    metrics: [{ key: 'current_amp', label: 'Motor current', unit: 'A', get: r => r.current_amp }],
  },
  {
    group: 'Status / Mechanical',
    dash:  [14,3,3,3],
    metrics: [{ key: 'slide_valve_pct', label: 'Slide valve', unit: '%', get: r => r.slide_valve_pct }],
  },
]

// Deterministic, unlimited-capacity palette: golden-angle hue rotation keeps
// consecutive colors far apart in hue regardless of how many metrics exist.
const PALETTE = [
  "#4E79A7", // Blue
  "#F28E2B", // Orange
  "#E15759", // Red
  "#76B7B2", // Cyan
  "#59A14F", // Green
  "#EDC948", // Yellow
  "#B07AA1", // Purple
  "#FF9DA7", // Pink
  "#9C755F", // Brown
  "#BAB0AC", // Gray

  "#1F77B4",
  "#FF7F0E",
  "#2CA02C",
  "#D62728",
  "#9467BD",
  "#8C564B",
  "#E377C2",
  "#7F7F7F",
  "#BCBD22",
  "#17BECF",
]

const GOLDEN_ANGLE = 137.508

const metricColor = (i, dark = false) => {
  if (i < PALETTE.length) return PALETTE[i]

  const hue = Math.round((i * GOLDEN_ANGLE) % 360)
  const light = dark ? 62 : 48

  return `hsl(${hue},72%,${light}%)`
}

const buildAllMetrics = dark => {
  const list = []
  let idx = 0
  for (const group of METRIC_GROUPS) {
    for (const metric of group.metrics) {
      list.push({
        ...metric,
        group: group.group,
        dash: group.dash,
        color: metricColor(idx++, dark),
      })
    }
  }
  return list
}

const DEFAULT_ON = ['cop', 'st_c', 'dt_c', 'sp_kg']

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_DAYS = 7
// generous per-day cap: 5-min cadence = 288 pts/day; pad for denser intervals
const LIMIT_PER_DAY = 2000

const CHART_H = 420
const GRID_TOP = 20
const GRID_BOTTOM = 60
const AXIS_W = 55

const pad = n => String(n).padStart(2, '0')
const dateKey = ms => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const dayStartMs = ms => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const todayStart = () => dayStartMs(Date.now())

function nearestIndex(data, ts) {
  let lo = 0, hi = data.length - 1
  if (ts <= data[lo].t) return lo
  if (ts >= data[hi].t) return hi
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (data[mid].t < ts) lo = mid + 1
    else hi = mid - 1
  }
  return Math.abs(data[lo].t - ts) < Math.abs(data[hi].t - ts) ? lo : hi
}

export default function CompressorTrendChart({ compressors, typeMap, defaultId }) {
  const chartRef = useRef(null)
  const cacheRef = useRef({}) // `${compressorId}|${dateKey}` -> rows[]

  const today = useRef(todayStart()).current

  const [compressorId, setCompressorId] = useState(defaultId ?? compressors[0])
  const [range, setRange] = useState({ start: today, end: today })
  const [draft, setDraft] = useState({ start: today, end: today })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rangeMsg, setRangeMsg] = useState('')

  const [selected, setSelected] = useState(() => new Set(DEFAULT_ON))
  const [panelOpen, setPanelOpen] = useState(true)
  const [zoom, setZoom] = useState({ start: today, end: today + DAY_MS })
  const [hover, setHover] = useState(null)

  const isDark = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches
  const ALL_METRICS = useMemo(() => buildAllMetrics(isDark), [isDark])
  const textColor = isDark ? '#8b949e' : '#57606a'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const axisLineColor = isDark ? '#30363d' : '#d0d7de'

  const fetchDayCached = (compId, dayStart) => {
    const key = `${compId}|${dateKey(dayStart)}`
    if (cacheRef.current[key]) return Promise.resolve(cacheRef.current[key])
    const start = new Date(dayStart).toISOString()
    const end = new Date(dayStart + DAY_MS).toISOString()
    return getMetrics(compId, { start, end, limit: LIMIT_PER_DAY })
      .then(res => {
        const rows = (res.data || [])
          .map(r => ({ raw: r, t: new Date(r.timestamp).getTime() }))
          .filter(r => Number.isFinite(r.t))
          .sort((a, b) => a.t - b.t)
        cacheRef.current[key] = rows
        return rows
      })
  }

  const generate = (compId, startDay, endDay) => {
    let s = dayStartMs(startDay)
    let e = dayStartMs(endDay)
    if (e < s) [s, e] = [e, s]
    const spanDays = Math.round((e - s) / DAY_MS) + 1
    let msg = ''
    if (spanDays > MAX_DAYS) {
      e = s + (MAX_DAYS - 1) * DAY_MS
      msg = `เลือกได้สูงสุด ${MAX_DAYS} วัน — ปรับช่วงให้อัตโนมัติ`
    }
    setDraft({ start: s, end: e })
    setRangeMsg(msg)
    setHover(null)
    setLoading(true)
    setError(null)
    const days = []
    for (let d = s; d <= e; d += DAY_MS) days.push(d)
    Promise.all(days.map(d => fetchDayCached(compId, d)))
      .then(all => {
        setData(all.flat())
        setRange({ start: s, end: e })
        setZoom({ start: s, end: e + DAY_MS })
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }

  const refresh = () => generate(compressorId, today, today)
  const changeCompressor = id => {
    setCompressorId(id)
    generate(id, draft.start, draft.end)
  }

  // Fetch on first mount
  useMemo(() => { generate(compressorId, today, today) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = key =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const toggleGroup = (metrics, on) =>
    setSelected(prev => {
      const next = new Set(prev)
      metrics.forEach(m => (on ? next.add(m.key) : next.delete(m.key)))
      return next
    })

  const metricByKey = useMemo(() => {
    const map = {}
    ALL_METRICS.forEach(m => { map[m.key] = m })
    return map
  }, [ALL_METRICS])

  const selectedMetrics = ALL_METRICS.filter(m => selected.has(m.key))

  const unitAxis = useMemo(() => {
    const units = []
    selectedMetrics.forEach(m => { if (!units.includes(m.unit)) units.push(m.unit) })
    const map = {}
    units.forEach((u, i) => (map[u] = i))
    return { units, map }
  }, [selectedMetrics])

  const leftCount = Math.ceil(unitAxis.units.length / 2)
  const rightCount = Math.floor(unitAxis.units.length / 2)
  const gridLeft = 20 + leftCount * AXIS_W
  const gridRight = 20 + rightCount * AXIS_W

  const option = useMemo(() => {
    const yAxis = unitAxis.units.map((unit, i) => {
      const side = i % 2
      const offsetStep = Math.floor(i / 2) * AXIS_W
      return {
        type: 'value',
        name: unit || '—',
        nameTextStyle: { color: textColor, fontSize: 10 },
        position: side === 0 ? 'left' : 'right',
        offset: offsetStep,
        axisLine: { show: true, lineStyle: { color: axisLineColor } },
        splitLine: { show: i === 0, lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      }
    })

    return {
      backgroundColor: 'transparent',
      grid: { left: gridLeft, right: gridRight, top: GRID_TOP, bottom: GRID_BOTTOM },
      animation: false,
      textStyle: { color: textColor },
      legend: { show: false },
      tooltip: { show: false },
      xAxis: [{
        type: 'time',
        min: range.start,
        max: range.end + DAY_MS,
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          hideOverlap: true,
          formatter: val => {
            const d = new Date(val)
            return `${pad(d.getHours())}:${pad(d.getMinutes())}`
          },
        },
      }],
      yAxis: yAxis.length ? yAxis : [{ type: 'value', axisLabel: { color: textColor } }],
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, startValue: zoom.start, endValue: zoom.end, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, bottom: 24, height: 16, startValue: zoom.start, endValue: zoom.end, filterMode: 'none' },
      ],
      series: selectedMetrics.map(m => ({
        name: m.label,
        type: 'line',
        yAxisIndex: unitAxis.map[m.unit] ?? 0,
        data: data.map(d => [d.t, m.get(d.raw) ?? null]),
        showSymbol: false,
        smooth: false,
        step:false,
        connectNulls: false,
        sampling: 'lttb',
        lineStyle: {
          width: 2.2,
          color: m.color,
          type: m.dash?.length ? m.dash : 'solid',
      },
      emphasis:{
          focus:"series",
          lineStyle:{
              width:3.5
          }
      },
    blur:{
        lineStyle:{
            opacity:0.15
        }
    },
        itemStyle: { color: m.color },
      })),
    }
  }, [data, selectedMetrics, unitAxis, zoom, gridLeft, gridRight, range, textColor, gridColor, axisLineColor])

  const onEvents = {
    datazoom: params => {
      const b = params.batch ? params.batch[0] : params
      const fullStart = range.start
      const fullSpan = range.end + DAY_MS - range.start
      let start, end
      if (b.startValue != null && b.endValue != null) {
        start = b.startValue
        end = b.endValue
      } else {
        start = fullStart + ((b.start ?? 0) / 100) * fullSpan
        end = fullStart + ((b.end ?? 100) / 100) * fullSpan
      }
      setZoom(prev => (prev.start === start && prev.end === end ? prev : { start, end }))
    },
  }

  const handleMouseMove = e => {
    const inst = chartRef.current?.getEchartsInstance()
    if (!inst || data.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ox = e.clientX - rect.left
    const oy = e.clientY - rect.top
    const plotRight = rect.width - gridRight
    const plotBottom = CHART_H - GRID_BOTTOM
    if (ox < gridLeft || ox > plotRight || oy < GRID_TOP || oy > plotBottom) {
      setHover(null)
      return
    }
    const ts = inst.convertFromPixel({ xAxisIndex: 0 }, ox)
    if (!Number.isFinite(ts)) { setHover(null); return }
    const idx = nearestIndex(data, ts)
    const snapX = inst.convertToPixel({ xAxisIndex: 0 }, data[idx].t)
    setHover({ idx, snapX, mouseX: ox, mouseY: oy, rectW: rect.width })
  }

  const hoverRow = hover && data[hover.idx] ? data[hover.idx] : null
  const fmtDay = ms => new Date(ms).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
  const rangeLabel = range.start === range.end ? fmtDay(range.start) : `${fmtDay(range.start)} – ${fmtDay(range.end)}`
  const fileTag = range.start === range.end ? dateKey(range.start) : `${dateKey(range.start)}_${dateKey(range.end)}`

  // Second-level x-axis strip: proportional day segments over the visible zoom window
  const dayGroups = useMemo(() => {
    const { start, end } = zoom
    const span = end - start
    if (span <= 0) return []
    const groups = []
    const d = new Date(start)
    d.setHours(0, 0, 0, 0)
    for (let t = d.getTime(); t < end; t += DAY_MS) {
      const segStart = Math.max(t, start)
      const segEnd = Math.min(t + DAY_MS, end)
      if (segEnd <= segStart) continue
      groups.push({
        label: new Date(t).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
        widthPct: ((segEnd - segStart) / span) * 100,
      })
    }
    return groups
  }, [zoom])

  // --- Export helpers --------------------------------------------------
  const triggerDownload = (href, filename) => {
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const downloadPNG = () => {
    const inst = chartRef.current?.getEchartsInstance()
    if (!inst) return
    const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: isDark ? '#0d1117' : '#ffffff' })
    triggerDownload(url, `${compressorId}_${fileTag}.png`)
  }

  const downloadCSV = () => {
    if (data.length === 0 || selectedMetrics.length === 0) return
    const header = ['timestamp', ...selectedMetrics.map(m => (m.unit ? `${m.label} (${m.unit})` : m.label))]
    const lines = [header.join(',')]
    data.forEach(d => {
      const ts = new Date(d.t).toISOString()
      lines.push([ts, ...selectedMetrics.map(m => m.get(d.raw) ?? '')].join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, `${compressorId}_${fileTag}.csv`)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Trend overview
        </div>
        <select
          value={compressorId}
          onChange={e => changeCompressor(e.target.value)}
          style={{ background: 'var(--bg2)', color: 'var(--text-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}
        >
          {compressors.map(id => (
            <option key={id} value={id}>{id}{typeMap?.[id] ? ` (${typeMap[id]})` : ''}</option>
          ))}
        </select>
      </div>

      {/* --- Date range picker --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>จาก</span>
        <input
          type="date"
          value={dateKey(draft.start)}
          onChange={e => e.target.value && setDraft(d => ({ ...d, start: dayStartMs(new Date(e.target.value + 'T00:00:00').getTime()) }))}
          style={{ ...dateInputStyle, colorScheme: isDark ? 'dark' : 'light' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>ถึง</span>
        <input
          type="date"
          value={dateKey(draft.end)}
          onChange={e => e.target.value && setDraft(d => ({ ...d, end: dayStartMs(new Date(e.target.value + 'T00:00:00').getTime()) }))}
          style={{ ...dateInputStyle, colorScheme: isDark ? 'dark' : 'light' }}
        />
        <button onClick={() => generate(compressorId, draft.start, draft.end)} style={primaryBtnStyle}>
          สร้างกราฟ
        </button>
        <button onClick={refresh} title="กลับมาวันปัจจุบัน" style={btnStyle}>
          ⟳ วันนี้
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-1)', marginLeft: 4 }}>{rangeLabel}</span>
        {loading && <span style={{ fontSize: 11, color: 'var(--blue)' }}>⟳ กำลังโหลด…</span>}
        {rangeMsg && <span style={{ fontSize: 11, color: 'var(--amber)' }}>{rangeMsg}</span>}
        {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>โหลดข้อมูลไม่สำเร็จ</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* --- Chart management panel --- */}
        <div style={{ flex: 'none', width: panelOpen ? 240 : 40, transition: 'width .15s', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button
            onClick={() => setPanelOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: panelOpen ? 'space-between' : 'center', gap: 8, padding: '8px 10px', background: 'transparent', color: 'var(--text-1)', border: 'none', borderBottom: panelOpen ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            {panelOpen && <span>จัดการกราฟ ({selectedMetrics.length})</span>}
            <span>{panelOpen ? '‹' : '☰'}</span>
          </button>
          {panelOpen && (
            <div style={{ maxHeight: 460, overflowY: 'auto', padding: '6px 8px' }}>
              {METRIC_GROUPS.map(g => {
                const allOn = g.metrics.every(m => selected.has(m.key))
                return (
                  <div key={g.group} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: 0.5 }}>{g.group}</span>
                      <button onClick={() => toggleGroup(g.metrics, !allOn)} style={{ fontSize: 10, background: 'transparent', color: 'var(--blue)', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {allOn ? 'clear' : 'all'}
                      </button>
                    </div>
                    {g.metrics.map(m => {
                      const full = metricByKey[m.key]
                      return (
                        <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 3px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                          <input type="checkbox" checked={selected.has(m.key)} onChange={() => toggle(m.key)} />
                          <svg width="18" height="9" style={{ flex: 'none' }}>
                            <line
                              x1="0" y1="4.5" x2="18" y2="4.5"
                              stroke={full.color}
                              strokeWidth="2"
                              strokeDasharray={full.dash?.length ? full.dash.join(',') : undefined}
                            />
                          </svg>
                          <span style={{ flex: 1, color: 'var(--text-1)' }}>{m.label}</span>
                          {m.unit && <span style={{ color: 'var(--text-3)', fontSize: 9 }}>{m.unit}</span>}
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* --- Chart column --- */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative' }} onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
            <ReactECharts ref={chartRef} option={option} style={{ height: CHART_H, width: '100%' }} onEvents={onEvents} notMerge={true} lazyUpdate={true} />

            {hover && (
              <div style={{ position: 'absolute', left: hover.snapX, top: GRID_TOP, height: CHART_H - GRID_TOP - GRID_BOTTOM, borderLeft: '1px dashed var(--red)', pointerEvents: 'none', zIndex: 5 }} />
            )}

            {!loading && selectedMetrics.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13, pointerEvents: 'none' }}>
                เลือก metric จากแถบจัดการกราฟเพื่อแสดงผล
              </div>
            )}

            {!loading && selectedMetrics.length > 0 && data.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13, pointerEvents: 'none' }}>
                ไม่มีข้อมูลในช่วงที่เลือก
              </div>
            )}

            {hover && hoverRow && selectedMetrics.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: hover.mouseX + 210 > hover.rectW ? hover.mouseX - 200 : hover.mouseX + 16,
                  top: Math.max(hover.mouseY - 20, 10),
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  minWidth: 190,
                  maxHeight: 300,
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                  {new Date(hoverRow.t).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                {selectedMetrics.map(m => {
                  const v = m.get(hoverRow.raw)
                  return (
                    <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '2px 0' }}>
                      <span style={{ color: m.color }}>{m.label}</span>
                      <strong style={{ color: 'var(--text-1)' }}>
                        {v === null || v === undefined ? '--' : `${Number(v).toFixed(2)}${m.unit ? ` ${m.unit}` : ''}`}
                      </strong>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* --- Second-level day strip --- */}
          {dayGroups.length > 0 && (
            <div style={{ display: 'flex', marginLeft: gridLeft, marginRight: gridRight, marginTop: 4, fontSize: 10, color: 'var(--text-3)' }}>
              {dayGroups.map((g, i) => (
                <div
                  key={`${g.label}-${i}`}
                  style={{ width: `${g.widthPct}%`, textAlign: 'center', borderLeft: '1px solid var(--border)', padding: '2px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  {g.label}
                </div>
              ))}
            </div>
          )}

          {/* --- Export bar --- */}
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: 0.5 }}>ส่งออกข้อมูล</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{compressorId} · {rangeLabel} · {selectedMetrics.length} เส้น · {data.length} จุด</span>
            <div style={{ flex: 1 }} />
            <button onClick={downloadPNG} disabled={data.length === 0} style={exportBtnStyle('var(--blue)')}>⤓ PNG</button>
            <button onClick={downloadCSV} disabled={data.length === 0 || selectedMetrics.length === 0} style={exportBtnStyle('var(--green)')}>⤓ CSV</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  background: 'var(--bg2)',
  color: 'var(--text-1)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 12,
  cursor: 'pointer',
}

const primaryBtnStyle = {
  ...btnStyle,
  background: 'var(--blue)',
  borderColor: 'var(--blue)',
  color: '#fff',
  fontWeight: 600,
}

const dateInputStyle = {
  background: 'var(--bg2)',
  color: 'var(--text-1)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: 12,
  colorScheme: 'dark',
}

const exportBtnStyle = color => ({
  background: 'transparent',
  color,
  border: `1px solid ${color}`,
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
})
