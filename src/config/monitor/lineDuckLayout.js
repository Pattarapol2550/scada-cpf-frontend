import { VIEWBOX } from './schematicTheme.js'

export { VIEWBOX }

/** Step 4 smoke-test placements; replaced by full `nodes` in Step 5 */
export const testNodes = [
  { id: 'screw-1', type: 'ScrewCompressor', x: 400, y: 380, label: 'Screw #1' },
  { id: 'hp-tank', type: 'HPTank',          x: 620, y: 180, label: 'HP' },
]

/** @type {Array<{ id: string, type: string, x: number, y: number, label?: string, width?: number, height?: number }>} */
export const nodes = []

/** @type {Array<{ id: string, from: string, to: string, color: string, dashed?: boolean, fromPort?: string, toPort?: string }>} */
export const edges = []

/** @type {Array<{ id: string, type: 'temp'|'pressure', x: number, y: number, tag: string }>} */
export const readouts = []

/** @type {Array<{ id: string, text: string, x: number, y: number }>} */
export const sectionLabels = []
