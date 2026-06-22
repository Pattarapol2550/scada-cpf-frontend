/**
 * Coordinate helpers for synoptic diagram layout.
 */

/** @param {{ x: number, y: number, width?: number, height?: number }} node */
export function getNodeCenter(node) {
  const w = node.width ?? 0
  const h = node.height ?? 0
  return { x: node.x + w / 2, y: node.y + h / 2 }
}

/**
 * @param {{ x: number, y: number, width?: number, height?: number }} node
 * @param {'top'|'bottom'|'left'|'right'} port
 */
export function getPortPosition(node, port) {
  const w = node.width ?? 0
  const h = node.height ?? 0
  switch (port) {
    case 'top':    return { x: node.x + w / 2, y: node.y }
    case 'bottom': return { x: node.x + w / 2, y: node.y + h }
    case 'left':   return { x: node.x, y: node.y + h / 2 }
    case 'right':  return { x: node.x + w, y: node.y + h / 2 }
    default:       return getNodeCenter(node)
  }
}
