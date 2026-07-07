/**
 * utils/chartConfig.js — Shared Chart.js defaults
 */

export const CHART_TOOLTIP = {
  backgroundColor: '#1c2333',
  borderColor:     '#30363d',
  borderWidth:     1,
  titleColor:      '#8b949e',
  bodyColor:       '#e6edf3',
  padding:         10,
}

export const CHART_SCALE_X = {
  ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#8b949e' },
  grid:  { color: 'rgba(48,54,61,0.5)' },
}

export const CHART_SCALE_Y = {
  ticks: { color: '#8b949e' },
  grid:  { color: 'rgba(48,54,61,0.5)' },
}

export const CHART_DEFAULTS = {
  responsive:          true,
  maintainAspectRatio: false,
  animation:           false,
  elements: { point: { radius: 3, hoverRadius: 7 } },
  plugins: {
    legend:  { display: false },
    tooltip: { mode: 'point', intersect: true, ...CHART_TOOLTIP },
  },
  scales: { x: CHART_SCALE_X, y: CHART_SCALE_Y },
}

/**
 * Day-divider plugin — draws a vertical dashed line + date label wherever the
 * data crosses into a new calendar day. Reads raw timestamps from
 * options.plugins.dayDivider.timestamps (parallel to the labels array).
 */
const DAY_DIVIDER_COLOR = '#378ADD'
const _BKK = { timeZone: 'Asia/Bangkok' }

// null for unparseable timestamps so they never register as a day boundary
function _dayInfo(t) {
  const d = new Date(t)
  if (isNaN(d)) return null
  return {
    key:   d.toLocaleDateString('th-TH', _BKK),
    label: d.toLocaleString('th-TH', { ..._BKK, day: 'numeric', month: 'short' }),
  }
}

export const dayDividerPlugin = {
  id: 'dayDivider',
  afterDatasetsDraw(chart, _args, opts) {
    const ts = opts?.timestamps
    if (!ts || ts.length < 2) return
    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart
    ctx.save()
    ctx.font = '600 11px sans-serif'
    ctx.textAlign = 'left'
    // Single pass: carry the previous day's key instead of re-deriving it
    let prev = _dayInfo(ts[0])
    for (let i = 1; i < ts.length; i++) {
      const cur = _dayInfo(ts[i])
      if (!cur) continue
      if (prev && cur.key !== prev.key) {
        const px = x.getPixelForValue(i)
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.lineWidth = 1
        ctx.strokeStyle = DAY_DIVIDER_COLOR
        ctx.moveTo(px, top)
        ctx.lineTo(px, bottom)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = DAY_DIVIDER_COLOR
        ctx.fillText(' ' + cur.label, px + 3, top + 12)
      }
      prev = cur
    }
    ctx.restore()
  },
}

export function mkDs(label, data, color) {
  return {
    label,
    data,
    borderColor:              color,
    backgroundColor:          'transparent',
    borderWidth:               1.5,
    tension:                   0,
    spanGaps:                  true,
    fill:                      false,
    pointRadius:               3,
    pointBackgroundColor:      color,
    pointBorderColor:          color,
    pointBorderWidth:          1,
    pointHoverRadius:          7,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor:     '#161b22',
    pointHoverBorderWidth:     2,
  }
}
