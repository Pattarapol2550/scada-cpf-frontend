/**
 * utils/chartConfig.js — Shared Chart.js defaults to avoid copy-paste across pages
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
  responsive:           true,
  maintainAspectRatio:  false,
  animation:            false,
  elements:  { point: { radius: 3, hoverRadius: 7 } },
  plugins: {
    legend:  { display: false },
    tooltip: { mode: 'point', intersect: true, ...CHART_TOOLTIP },
  },
  scales: { x: CHART_SCALE_X, y: CHART_SCALE_Y },
}

/**
 * Build a line dataset with consistent styling.
 * @param {string} label
 * @param {number[]} data
 * @param {string} color  CSS color string
 */
export function mkDs(label, data, color) {
  return {
    label,
    data,
    borderColor:           color,
    backgroundColor:       'transparent',
    borderWidth:           1.5,
    tension:               0,
    spanGaps:              true,
    fill:                  false,
    pointRadius:           3,
    pointBackgroundColor:  color,
    pointBorderColor:      color,
    pointBorderWidth:      1,
    pointHoverRadius:      7,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: '#161b22',
    pointHoverBorderWidth: 2,
  }
}
