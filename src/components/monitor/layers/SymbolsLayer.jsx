import { testNodes } from '../../../config/monitor/lineDuckLayout.js'
import SchematicSymbol from '../symbols/SchematicSymbol.jsx'

/**
 * Equipment symbol layer. Step 4: testNodes only. Step 5: full nodes array.
 */
export default function SymbolsLayer({ nodes = testNodes }) {
  return (
    <g className="symbols-layer">
      {nodes.map(node => (
        <SchematicSymbol
          key={node.id}
          type={node.type}
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          label={node.label}
        />
      ))}
    </g>
  )
}
