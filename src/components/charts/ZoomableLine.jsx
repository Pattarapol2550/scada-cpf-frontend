import { useRef, useEffect } from 'react'
import { Line } from 'react-chartjs-2'

export default function ZoomableLine({ data, options, ...props }) {
  const chartRef  = useRef(null)
  const savedZoom = useRef(null)

  const save = (chart) => {
    const s = chart.scales?.x
    if (!s) return
    const total = (chart.data?.labels?.length ?? 1) - 1
    const range = s.max - s.min
    savedZoom.current = range < total * 0.98 ? { min: s.min, max: s.max } : null
  }

  const mergedOptions = {
    ...options,
    plugins: {
      ...options?.plugins,
      zoom: {
        ...options?.plugins?.zoom,
        zoom: { ...options?.plugins?.zoom?.zoom, onZoomComplete: ({ chart }) => save(chart) },
        pan:  { ...options?.plugins?.zoom?.pan,  onPanComplete:  ({ chart }) => save(chart) },
      },
    },
  }

  useEffect(() => {
    if (!savedZoom.current) return
    const id = requestAnimationFrame(() => {
      const chart = chartRef.current
      if (!chart || !savedZoom.current) return
      const total = (chart.data?.labels?.length ?? 1) - 1
      const { min, max } = savedZoom.current
      const range = max - min
      if (range >= total * 0.98) { savedZoom.current = null; return }
      const lo = Math.max(0, Math.min(total - range, min))
      chart.zoomScale('x', { min: lo, max: lo + range }, 'none')
    })
    return () => cancelAnimationFrame(id)
  }, [data])

  return <Line ref={chartRef} data={data} options={mergedOptions} {...props} />
}
