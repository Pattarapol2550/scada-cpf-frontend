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

/** @type {Array<{ id: string, from: string, to: string, color: string, dashed?: boolean, fromPort?: string, toPort?: string, route?: 'hv'|'vh', width?: number }>} */
export const edges = [
  // ── Top: evaporators → condensing side ──
  { id: 'e-evap1-hp',    from: 'evap-1', to: 'hp-tank', color: 'suction',  fromPort: 'bottom', toPort: 'left' },
  { id: 'e-evap2-inter', from: 'evap-2', to: 'inter',   color: 'suction',  fromPort: 'bottom', toPort: 'left' },

  // ── Discharge: screws → HP / Inter ──
  { id: 'e-screw4-hp',   from: 'screw-4', to: 'hp-tank', color: 'discharge', fromPort: 'top', toPort: 'bottom' },
  { id: 'e-screw5-inter', from: 'screw-5', to: 'inter',  color: 'discharge', fromPort: 'top', toPort: 'bottom', dashed: true },
  { id: 'e-screw7-inter', from: 'screw-7', to: 'inter',  color: 'discharge', fromPort: 'top', toPort: 'right' },

  // ── Booster / high-stage headers ──
  { id: 'e-booster-header', from: 'screw-1', to: 'screw-4', color: 'suction',   fromPort: 'right', toPort: 'left' },
  { id: 'e-high-header',    from: 'screw-5', to: 'screw-7', color: 'discharge', fromPort: 'right', toPort: 'left' },

  // ── Suction: screws → LP tanks ──
  { id: 'e-screw1-lp1', from: 'screw-1', to: 'lp-1', color: 'suction', fromPort: 'bottom', toPort: 'top', route: 'vh' },
  { id: 'e-screw3-lp2', from: 'screw-3', to: 'lp-2', color: 'suction', fromPort: 'bottom', toPort: 'top', route: 'vh' },
  { id: 'e-screw6-lp3', from: 'screw-6', to: 'lp-3', color: 'suction', fromPort: 'bottom', toPort: 'top', route: 'vh' },

  // ── LP tanks → valves ──
  { id: 'e-lp1-v1', from: 'lp-1', to: 'valve-lp-1', color: 'liquid', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-lp2-v2', from: 'lp-2', to: 'valve-lp-2', color: 'liquid', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-lp3-v3', from: 'lp-3', to: 'valve-lp-3', color: 'liquid', fromPort: 'bottom', toPort: 'top' },

  // ── Valves → load units ──
  { id: 'e-v1-load1', from: 'valve-lp-1', to: 'load-spiral-freezer', color: 'liquid', fromPort: 'bottom', toPort: 'top', route: 'vh' },
  { id: 'e-v2-load2', from: 'valve-lp-2', to: 'load-chill-spiral',   color: 'liquid', fromPort: 'bottom', toPort: 'top', route: 'vh' },
  { id: 'e-v3-load3', from: 'valve-lp-3', to: 'load-chill-room',     color: 'liquid', fromPort: 'bottom', toPort: 'top', route: 'vh' },
  { id: 'e-lp3-load4', from: 'lp-3', to: 'load-air-cond', color: 'liquid', fromPort: 'right', toPort: 'top', route: 'vh' },
]

/** @type {Array<{ id: string, type: 'temp'|'pressure', x: number, y: number, tag: string }>} */
export const readouts = [
  { id: 'ro-hp-temp',   type: 'temp',     x: 710, y: 55,  tag: 'readout.hp_temp' },
  { id: 'ro-hp-press',  type: 'pressure', x: 710, y: 130, tag: 'readout.hp_press' },
  { id: 'ro-evap-temp', type: 'temp',     x: 220, y: 155, tag: 'readout.evap_temp' },
  { id: 'ro-inter-temp', type: 'temp',    x: 900, y: 55,  tag: 'readout.inter_temp' },
  { id: 'ro-lp-temp',   type: 'temp',     x: 590, y: 440, tag: 'readout.lp_temp' },
]

export const sectionLabels = [
  { id: 'sec-booster',     text: 'Booster',     x: 265, y: 265, color: '#c9a227' },
  { id: 'sec-high-stage',  text: 'High Stage',  x: 730, y: 265, color: '#7b5ea7' },
]
