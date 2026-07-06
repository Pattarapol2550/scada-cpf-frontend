import { useRef, useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'

const SYNC_PLUGIN = {
  id: 'scrollbarSync',
  afterUpdate(chart) {
    chart._syncScrollbar?.()
  },
}

export default function ChartWithScrollbar({ options = {}, data, style, ...props }) {
  const chartRef = useRef(null)
  const totalPts = useRef(0)
  const [scrollVal, setScrollVal] = useState(0)
  const [zoomed,    setZoomed]    = useState(false)

  totalPts.current = data?.labels?.length ?? 0

  // attach sync fn to chart instance — called by SYNC_PLUGIN after every update
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart._syncScrollbar = () => {
      const scale = chart.scales?.x
      if (!scale || totalPts.current < 2) return
      const total     = totalPts.current - 1
      const viewRange = scale.max - scale.min
      if (viewRange >= total * 0.99) { setZoomed(false); return }
      setZoomed(true)
      const maxMin = total - viewRange
      setScrollVal(maxMin > 0 ? Math.round(Math.max(0, Math.min(1, scale.min / maxMin)) * 1000) : 0)
    }
  })

  const onScroll = (e) => {
    const val   = Number(e.target.value)
    setScrollVal(val)
    const chart = chartRef.current
    if (!chart) return
    const scale = chart.scales?.x
    if (!scale) return
    const total     = totalPts.current - 1
    const viewRange = scale.max - scale.min
    const maxMin    = total - viewRange
    const newMin    = (val / 1000) * maxMin
    chart.zoomScale('x', { min: Math.max(0, newMin), max: Math.max(0, newMin) + viewRange }, 'active')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', ...style }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Line ref={chartRef} data={data} options={options} plugins={[SYNC_PLUGIN]} {...props} />
      </div>
      <input
        type="range" min={0} max={1000} step={1}
        value={scrollVal}
        onChange={onScroll}
        style={{
          width: '100%', marginTop: 3, height: 4,
          accentColor: '#58a6ff',
          opacity:       zoomed ? 1 : 0,
          pointerEvents: zoomed ? 'auto' : 'none',
          flexShrink: 0, cursor: 'pointer',
        }}
      />
    </div>
  )
}
