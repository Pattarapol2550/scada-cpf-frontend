import { STATUS } from '../../utils/monitor/compressorStatus.js'

export const VIEWBOX = { width: 1600, height: 900 }

export const PIPE_COLORS = {
  discharge: '#e53935',
  suction:   '#1e88e5',
  liquid:    '#fdd835',
  inactive:  '#9e9e9e',
}

export const symbolVisuals = {
  [STATUS.CRITICAL]: {
    borderColor: 'var(--red)',
    borderWidth: 3,
    borderStyle: 'solid',
    opacity: 1,
    pulse: true,
    badge: 'CRIT',
  },
  [STATUS.WARNING]: {
    borderColor: 'var(--amber)',
    borderWidth: 2,
    borderStyle: 'solid',
    opacity: 1,
    pulse: false,
    badge: 'WARN',
  },
  [STATUS.NORMAL]: {
    borderColor: 'transparent',
    borderWidth: 0,
    borderStyle: 'solid',
    opacity: 1,
    pulse: false,
    badge: null,
  },
  [STATUS.STOPPED]: {
    borderColor: 'var(--text-3)',
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.55,
    pulse: false,
    badge: 'OFF',
  },
  [STATUS.NO_DATA]: {
    borderColor: 'var(--border-hi)',
    borderWidth: 1,
    borderStyle: 'dotted',
    opacity: 0.4,
    pulse: false,
    badge: '--',
  },
  [STATUS.LOADING]: {
    borderColor: 'var(--border)',
    borderWidth: 1,
    borderStyle: 'solid',
    opacity: 0.7,
    pulse: false,
    badge: null,
  },
}

export function getSymbolVisual(status) {
  return symbolVisuals[status] ?? symbolVisuals[STATUS.NO_DATA]
}

export function getPipeColor(kind) {
  return PIPE_COLORS[kind] ?? PIPE_COLORS.inactive
}

export const LINE_STATUS_LABELS = {
  [STATUS.NORMAL]:   { label: 'OK',       color: 'var(--green)' },
  [STATUS.WARNING]:  { label: 'Warning',  color: 'var(--amber)' },
  [STATUS.CRITICAL]: { label: 'Critical', color: 'var(--red)' },
  [STATUS.NO_DATA]:  { label: 'No Data',  color: 'var(--text-3)' },
  [STATUS.LOADING]:  { label: 'Loading',  color: 'var(--text-3)' },
  [STATUS.STOPPED]:  { label: 'OK',       color: 'var(--green)' },
}
