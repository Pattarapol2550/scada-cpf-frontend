import { edges, nodes } from '../../../config/monitor/lineDuckLayout.js'
import { SYMBOL_SIZE } from '../../../config/monitor/lineDuckBindings.js'
import { getPipeColor } from '../../../config/monitor/schematicTheme.js'
import { getPortPosition } from '../../../utils/monitor/schematicCoords.js'
import { buildOrthogonalPath } from '../../../utils/monitor/pipeRouter.js'

function nodeMap() {
  const map = {}
  for (const node of nodes) {
    const size = SYMBOL_SIZE[node.type] ?? { width: 48, height: 48 }
    map[node.id] = {
      ...node,
      width: node.width ?? size.width,
      height: node.height ?? size.height,
    }
  }
  return map
}

export default function PipesLayer({ edgeList = edges }) {
  const map = nodeMap()

  return (
    <g className="pipes-layer">
      {edgeList.map(edge => {
        const fromNode = map[edge.from]
        const toNode = map[edge.to]
        if (!fromNode || !toNode) return null

        const from = getPortPosition(fromNode, edge.fromPort ?? 'bottom')
        const to = getPortPosition(toNode, edge.toPort ?? 'top')
        const d = buildOrthogonalPath(from, to, edge.route ?? 'hv')

        return (
          <path
            key={edge.id}
            d={d}
            fill="none"
            stroke={getPipeColor(edge.color)}
            strokeWidth={edge.width ?? 4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={edge.dashed ? '8 6' : undefined}
            opacity={edge.opacity ?? 0.9}
          />
        )
      })}
    </g>
  )
}
