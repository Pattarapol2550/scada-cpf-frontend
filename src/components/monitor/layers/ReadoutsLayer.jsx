import { readouts } from '../../../config/monitor/lineDuckLayout.js'
import TempReadout from '../readouts/TempReadout.jsx'
import PressureReadout from '../readouts/PressureReadout.jsx'

export default function ReadoutsLayer({ readoutList = readouts, tagValues = {} }) {
  return (
    <g className="readouts-layer">
      {readoutList.map(ro => {
        const data = tagValues[ro.tag]
        const value = data?.value ?? null
        const unit = data?.unit

        if (ro.type === 'pressure') {
          return (
            <PressureReadout
              key={ro.id}
              x={ro.x}
              y={ro.y}
              value={value}
              unit={unit}
            />
          )
        }
        return (
          <TempReadout
            key={ro.id}
            x={ro.x}
            y={ro.y}
            value={value}
            unit={unit ?? '°C'}
          />
        )
      })}
    </g>
  )
}
