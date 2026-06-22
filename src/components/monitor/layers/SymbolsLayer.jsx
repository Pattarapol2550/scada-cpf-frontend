import { nodes, sectionLabels } from '../../../config/monitor/lineDuckLayout.js'
import { COMPRESSOR_ID_MAP } from '../../../config/monitor/lineDuckBindings.js'
import SchematicSymbol from '../symbols/SchematicSymbol.jsx'
import ScrewCompressor from '../symbols/ScrewCompressor.jsx'
import SectionLabel from '../SectionLabel.jsx'

/** Equipment symbol layer — all layout nodes + section headings. */
export default function SymbolsLayer({ nodeList = nodes, compressors = {} }) {
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
      {nodeList.map(node => {
        if (node.type === 'ScrewCompressor') {
          const compId = COMPRESSOR_ID_MAP[node.id]
          return (
            <ScrewCompressor
              key={node.id}
              node={node}
              comp={compId ? compressors[compId] : undefined}
            />
          )
        }
        return (
          <SchematicSymbol
            key={node.id}
            type={node.type}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            label={node.label}
          />
        )
      })}
    </g>
  )
}
