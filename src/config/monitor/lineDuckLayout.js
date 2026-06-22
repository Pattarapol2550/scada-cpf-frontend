import { VIEWBOX } from './schematicTheme.js'

export { VIEWBOX }

/** @type {Array<{ id: string, type: string, x: number, y: number, label?: string, width?: number, height?: number }>} */
export const nodes = []

/** @type {Array<{ id: string, from: string, to: string, color: string, dashed?: boolean, fromPort?: string, toPort?: string }>} */
export const edges = []

/** @type {Array<{ id: string, type: 'temp'|'pressure', x: number, y: number, tag: string }>} */
export const readouts = []

/** @type {Array<{ id: string, text: string, x: number, y: number }>} */
export const sectionLabels = []
