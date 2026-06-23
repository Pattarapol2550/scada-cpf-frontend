/**
 * Manhattan (H-V) SVG path between two points.
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 */
export function buildManhattanPath(from, to) {
  return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`
}

/**
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {'hv'|'vh'} order
 */
export function buildOrthogonalPath(from, to, order = 'hv') {
  if (order === 'vh') {
    return `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}`
  }
  return buildManhattanPath(from, to)
}
