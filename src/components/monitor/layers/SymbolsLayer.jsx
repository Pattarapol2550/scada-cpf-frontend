import { nodes, sectionLabels } from '../../../config/monitor/lineDuckLayout.js'
import SchematicSymbol from '../symbols/SchematicSymbol.jsx'
import SectionLabel from '../SectionLabel.jsx'

/** Equipment symbol layer — all layout nodes + section headings. */
export default function SymbolsLayer({ nodeList = nodes }) {
  return (
    <g className="symbols-layer">
      {sectionLabels.map(sec => (
        <SectionLabel
          key={sec.id}
          x={sec.x}
          y={sec.y}
          text={sec.text}
          color={sec.color}
        />
      ))}
      {nodeList.map(node => (
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
