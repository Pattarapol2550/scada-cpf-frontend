import { VIEWBOX } from './schematicTheme.js'

export { VIEWBOX }

/** Step 4 smoke-test placements (kept for reference) */
export const testNodes = [
  { id: 'screw-1', type: 'ScrewCompressor', x: 400, y: 380, label: 'Screw #1' },
  { id: 'hp-tank', type: 'HPTank',          x: 620, y: 180, label: 'HP' },
]

/**
 * Full synoptic layout — viewBox 1600×900.
 * 18 equipment + 3 valves = 21 symbol placements.
 */
export const nodes = [
  // ── Evaporators (top) ──
  { id: 'evap-1', type: 'Evaporator', x: 180, y: 70,  label: 'Evap.1' },
  { id: 'evap-2', type: 'Evaporator', x: 380, y: 70,  label: 'Evap.2' },

  // ── HP + Intercooler ──
  { id: 'hp-tank', type: 'HPTank',       x: 600, y: 85,  label: 'HP' },
  { id: 'inter',   type: 'Intercooler',  x: 820, y: 75,  label: 'Inter' },

  // ── Booster screws #1–4 ──
  { id: 'screw-1', type: 'ScrewCompressor', x: 100, y: 300, label: 'Screw #1' },
  { id: 'screw-2', type: 'ScrewCompressor', x: 210, y: 300, label: 'Screw #2' },
  { id: 'screw-3', type: 'ScrewCompressor', x: 320, y: 300, label: 'Screw #3' },
  { id: 'screw-4', type: 'ScrewCompressor', x: 430, y: 300, label: 'Screw #4' },

  // ── High-stage screws #5–7 ──
  { id: 'screw-5', type: 'ScrewCompressor', x: 620, y: 300, label: 'Screw #5' },
  { id: 'screw-6', type: 'ScrewCompressor', x: 730, y: 300, label: 'Screw #6' },
  { id: 'screw-7', type: 'ScrewCompressor', x: 840, y: 300, label: 'Screw #7' },

  // ── LP tanks ──
  { id: 'lp-1', type: 'LPTank', x: 500, y: 470, label: 'LP.1' },
  { id: 'lp-2', type: 'LPTank', x: 590, y: 470, label: 'LP.2' },
  { id: 'lp-3', type: 'LPTank', x: 680, y: 470, label: 'LP.3' },

  // ── Valves near LP tanks ──
  { id: 'valve-lp-1', type: 'Valve', x: 510, y: 555 },
  { id: 'valve-lp-2', type: 'Valve', x: 600, y: 555 },
  { id: 'valve-lp-3', type: 'Valve', x: 690, y: 555 },

  // ── Load units (bottom) ──
  { id: 'load-spiral-freezer', type: 'LoadUnit', x: 140,  y: 700, label: 'Spiral Freezer' },
  { id: 'load-chill-spiral',   type: 'LoadUnit', x: 400,  y: 700, label: 'Chill Spiral' },
  { id: 'load-chill-room',     type: 'LoadUnit', x: 660,  y: 700, label: 'Chill room' },
  { id: 'load-air-cond',       type: 'LoadUnit', x: 920,  y: 700, label: 'Air Cond.' },
]

/** @type {Array<{ id: string, from: string, to: string, color: string, dashed?: boolean, fromPort?: string, toPort?: string }>} */
export const edges = []

/** @type {Array<{ id: string, type: 'temp'|'pressure', x: number, y: number, tag: string }>} */
export const readouts = []

export const sectionLabels = [
  { id: 'sec-booster',     text: 'Booster',     x: 265, y: 265, color: '#c9a227' },
  { id: 'sec-high-stage',  text: 'High Stage',  x: 730, y: 265, color: '#7b5ea7' },
]
