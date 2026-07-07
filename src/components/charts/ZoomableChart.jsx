import { useState, useRef, useLayoutEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { dayDividerPlugin } from '../../utils/chartConfig'

/**
 * Drop-in <Line> wrapper that adds cross-device zoom.
 *
 * How it works: zooming widens the canvas beyond its container, and the
 * container scrolls horizontally. Zoom level is plain React state, fully
 * independent of Chart.js internals — so polling data updates never reset it.
 *
 * Works identically on desktop (scrollbar / trackpad), mobile & iPad (native
 * touch swipe). +/− buttons for precise control on every device.
 */
const ZOOM_STEP = 0.75
const ZOOM_MAX  = 6
const ZOOM_MIN  = 1

export default function ZoomableChart({ data, options, timestamps, ...props }) {
  const [zoom, setZoom] = useState(1)
  const scrollRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  // Tracks an in-progress drag: pointer start x + scrollLeft at grab time
  const drag = useRef(null)

  // Inject raw timestamps so the day-divider plugin can mark date boundaries
  const chartOptions = timestamps
    ? { ...options, plugins: { ...options?.plugins, dayDivider: { timestamps } } }
    : options
  const prevZoom  = useRef(1)

  // When zooming in, keep the newest (right-most) data in view — it's a live trend
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (zoom > prevZoom.current) el.scrollLeft = el.scrollWidth
    prevZoom.current = zoom
  }, [zoom])

  const zoomIn  = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const reset   = () => setZoom(1)

  const zoomed = zoom > 1

  // ── Drag-to-pan (desktop) ─────────────────────────────────────────────────
  // Grab & drag the chart horizontally. Touch devices already pan natively via
  // touchAction: pan-x, so this only kicks in for mouse input.
  const onPointerDown = (e) => {
    if (!zoomed || e.pointerType === 'touch') return
    const el = scrollRef.current
    if (!el) return
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft }
    setDragging(true)
    el.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX)
  }
  const endDrag = (e) => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    scrollRef.current?.releasePointerCapture?.(e.pointerId)
  }

  const btnStyle = {
    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
    background: 'var(--bg2)', color: 'var(--text-2)', fontSize: 15, fontWeight: 600,
    lineHeight: 1, padding: 0, userSelect: 'none',
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Zoom controls */}
      <div style={{
        position: 'absolute', top: 1, right: 3, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {zoomed && (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--blue)', fontFamily: 'monospace', marginRight: 2 }}>
            {zoom.toFixed(2).replace(/\.?0+$/, '')}×
          </span>
        )}
        {zoomed && (
          <button type="button" onClick={reset} title="รีเซ็ต"
            style={{ ...btnStyle, width: 'auto', padding: '0 8px', fontSize: 10, fontWeight: 600, color: 'var(--blue)', borderColor: 'var(--blue)' }}>
            reset
          </button>
        )}
        <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="ซูมออก"
          style={{ ...btnStyle, opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }}>−</button>
        <button type="button" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="ซูมเข้า"
          style={{ ...btnStyle, opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }}>+</button>
      </div>

      {/* Scrollable canvas area */}
      <div
        ref={scrollRef}
        className="hide-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          flex: 1, minHeight: 0,
          overflowX: zoomed ? 'auto' : 'hidden',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: zoomed ? 'pan-x' : 'auto',
          cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'default',
          userSelect: dragging ? 'none' : 'auto',
        }}
      >
        <div style={{ height: '100%', width: `${zoom * 100}%`, minWidth: '100%' }}>
          <Line data={data} options={chartOptions} plugins={timestamps ? [dayDividerPlugin] : undefined} {...props} />
        </div>
      </div>
    </div>
  )
}
