import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/layout/Sidebar'

const COLORS = { blue: '#5d96eb', red: '#d65348', yellow: '#d9bd38' }

const COMPONENTS = {
  compressor: { label: 'Screw', w: 100, h: 84, ports: [[0, 34], [100, 34], [50, 84]], fill: '#73a9ff', detail: '#1f5fbf' },
  air: { label: 'Air Cond.', w: 110, h: 82, ports: [[55, 0], [55, 82]], fill: '#77dbc7', detail: '#168a78' },
  tank: { label: 'HP', w: 78, h: 92, ports: [[39, 0], [39, 92]], fill: '#f2a65f', detail: '#a85a16' },
  evap: { label: 'Evap.', w: 112, h: 90, ports: [[0, 50], [112, 50]], fill: '#d8ccff', detail: '#7b60d7' },
}

function id() {
  return crypto.randomUUID()
}

function snap(v) {
  return Math.round(v / 10) * 10
}

function orthogonalPath(points) {
  if (!points.length) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if (prev.x !== curr.x && prev.y !== curr.y) d += ` L ${curr.x} ${prev.y}`
    d += ` L ${curr.x} ${curr.y}`
  }
  return d
}

function Icon({ type, fill, detail }) {
  if (type === 'air') {
    return (
      <g>
        <path fill={fill} stroke="#1b2635" strokeWidth="4" d="M14 32h62v24H14z" />
        <path fill="none" stroke={detail} strokeWidth="3" strokeLinecap="round" d="M20 42h48M22 50h42M18 62c2 6 8 6 10 0M38 62c2 6 8 6 10 0M58 62c2 6 8 6 10 0" />
      </g>
    )
  }
  if (type === 'tank') {
    return (
      <g>
        <path fill={fill} stroke="#1b2635" strokeWidth="4" d="M36 10h18v7c8 2 12 8 12 16v23H24V33c0-8 4-14 12-16z" />
        <circle fill="none" stroke={detail} strokeWidth="3" cx="45" cy="38" r="8" />
        <path fill="none" stroke={detail} strokeWidth="3" strokeLinecap="round" d="M45 31v7l-4 5" />
      </g>
    )
  }
  if (type === 'evap') {
    return (
      <g>
        <rect x="20" y="10" width="58" height="44" fill={fill} stroke="#1b2635" strokeWidth="4" />
        <path fill="none" stroke={detail} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 10h12M14 54h12M20 18h42c10 0 10 16 0 16H31c-9 0-9 14 0 14h40M78 10v44" />
      </g>
    )
  }
  return (
    <g>
      <path fill={fill} stroke="#1b2635" strokeWidth="4" d="M20 42h44c8 0 14-6 14-14v-8H50v8H30V18H14v22h6z" />
      <path fill={fill} stroke="#1b2635" strokeWidth="4" d="M10 36h10v18H10zM62 42h8v14h-8z" />
      <path fill="none" stroke={detail} strokeWidth="3" strokeLinecap="round" d="M25 52v8M40 52v8M55 52v8" />
    </g>
  )
}

function makeDemo() {
  const nodes = [
    ['evap', 300, 75, 'Evap.1'], ['evap', 630, 75, 'Evap.2'], ['tank', 925, 80, 'HP'],
    ['compressor', 135, 390, 'Screw #1'], ['compressor', 315, 390, 'Screw #2'], ['compressor', 495, 390, 'Screw #3'], ['compressor', 675, 390, 'Screw #4'],
    ['compressor', 965, 390, 'Screw #5'], ['compressor', 1145, 390, 'Screw #6'], ['compressor', 1325, 390, 'Screw #7'],
    ['air', 255, 850, 'Spiral Freezer'], ['air', 720, 850, 'Chill Spiral'], ['air', 1140, 850, 'Chill room'], ['air', 1560, 850, 'Air Cond.'], ['tank', 1325, 85, 'Inter'],
  ].map(([type, x, y, label]) => ({ id: id(), type, x, y, label, ...COMPONENTS[type] }))

  const pipes = [
    ['blue', false, [{ x: 260, y: 120 }, { x: 1320, y: 120 }, { x: 1320, y: 90 }]],
    ['blue', false, [{ x: 170, y: 430 }, { x: 660, y: 430 }]],
    ['blue', false, [{ x: 120, y: 470 }, { x: 120, y: 650 }, { x: 980, y: 650 }]],
    ['blue', false, [{ x: 1120, y: 650 }, { x: 1240, y: 650 }, { x: 1240, y: 470 }]],
    ['red', false, [{ x: 720, y: 390 }, { x: 1030, y: 390 }, { x: 1030, y: 210 }]],
    ['red', true, [{ x: 1045, y: 390 }, { x: 1370, y: 390 }, { x: 1370, y: 170 }]],
    ['red', false, [{ x: 1110, y: 430 }, { x: 1360, y: 430 }]],
    ['red', false, [{ x: 1415, y: 390 }, { x: 1415, y: 120 }]],
    ['yellow', false, [{ x: 210, y: 880 }, { x: 920, y: 880 }, { x: 920, y: 740 }]],
    ['yellow', false, [{ x: 1100, y: 880 }, { x: 1540, y: 880 }]],
    ['yellow', false, [{ x: 1130, y: 880 }, { x: 1130, y: 740 }]],
  ].map(([color, dashed, points]) => ({ id: id(), color, dashed, points }))

  const tags = [
    { x: 360, y: 185, text: '-40 °C' }, { x: 1030, y: 610, text: '-10 °C' },
    { x: 1200, y: 120, text: '34.5 °C' }, { x: 1500, y: 90, text: '36 °C' },
    { x: 1210, y: 170, text: '12.3 bar', tone: 'orange' },
  ].map(t => ({ id: id(), tone: 'cyan', ...t }))

  return { nodes, pipes, tags, notes: [] }
}

export default function PipingDesignerPage() {
  const svgRef = useRef(null)
  const demo = useMemo(makeDemo, [])
  const [nodes, setNodes] = useState(demo.nodes)
  const [pipes, setPipes] = useState(demo.pipes)
  const [tags, setTags] = useState(demo.tags)
  const [notes, setNotes] = useState(demo.notes)
  const [mode, setMode] = useState('select')
  const [pipeColor, setPipeColor] = useState('blue')
  const [dashed, setDashed] = useState(false)
  const [selected, setSelected] = useState(null)
  const [pendingComponent, setPendingComponent] = useState(null)
  const [pendingText, setPendingText] = useState(null)
  const [drawing, setDrawing] = useState(null)
  const [drag, setDrag] = useState(null)
  const [labelText, setLabelText] = useState('-10 °C')
  const [selectedName, setSelectedName] = useState('')
  const [viewBox, setViewBox] = useState('0 0 1800 1000')

  const selectedItem = useMemo(
    () => nodes.find(n => n.id === selected) || tags.find(t => t.id === selected) || notes.find(n => n.id === selected),
    [nodes, tags, notes, selected]
  )

  const svgPoint = (evt) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }

  const selectItem = (item) => {
    setSelected(item?.id ?? item)
    setSelectedName(item?.label || item?.text || '')
  }

  const addComponent = (type, x, y) => {
    const count = nodes.filter(n => n.type === type).length + 1
    const def = COMPONENTS[type]
    const label = def.label === 'Screw' ? `Screw #${count}` : def.label.endsWith('.') ? `${def.label}${count}` : def.label
    const item = { id: id(), type, label, x: snap(x - def.w / 2), y: snap(y - def.h / 2), ...def }
    setNodes(prev => [...prev, item])
    selectItem(item)
  }

  const addTag = (tone = 'cyan') => {
    setTags(prev => [...prev, { id: id(), x: tone === 'orange' ? 1180 : 980, y: tone === 'orange' ? 180 : 210, text: labelText || (tone === 'orange' ? '12.3 bar' : '-10 °C'), tone }])
  }

  const addNote = (x = 920, y = 300, text = labelText || 'Text') => {
    const note = { id: id(), x: snap(x), y: snap(y), text }
    setNotes(prev => [...prev, note])
    selectItem(note)
  }

  const onCanvasDown = (evt) => {
    if (evt.button === 2) {
      setDrawing(null)
      return
    }
    if (evt.target.dataset?.pipeId) {
      setSelected(evt.target.dataset.pipeId)
      setSelectedName('')
      return
    }
    if (evt.target !== svgRef.current) return
    const p = svgPoint(evt)
    if (pendingComponent) {
      addComponent(pendingComponent, p.x, p.y)
      setPendingComponent(null)
      return
    }
    if (pendingText) {
      addNote(p.x, p.y, pendingText)
      setPendingText(null)
      return
    }
    if (mode === 'pipe') {
      const point = { x: snap(p.x), y: snap(p.y) }
      setDrawing(prev => prev ? { ...prev, points: [...prev.points, point] } : { color: pipeColor, dashed, points: [point] })
      return
    }
    setSelected(null)
    setSelectedName('')
  }

  const onConnectorDown = (evt, node, index) => {
    if (mode !== 'pipe') return
    evt.stopPropagation()
    const port = node.ports[index]
    const point = { x: node.x + port[0], y: node.y + port[1] }
    if (!drawing) {
      setDrawing({ color: pipeColor, dashed, points: [point] })
    } else {
      setPipes(prev => [...prev, { id: id(), color: drawing.color, dashed: drawing.dashed, points: [...drawing.points, point] }])
      setDrawing(null)
    }
  }

  const startDrag = (evt, kind, item) => {
    if (mode === 'pipe' && kind === 'node') return
    evt.stopPropagation()
    const p = svgPoint(evt)
    setDrag({ kind, id: item.id, dx: p.x - item.x, dy: p.y - item.y })
    selectItem(item)
  }

  const onPointerMove = (evt) => {
    if (!drag) return
    const p = svgPoint(evt)
    const move = item => item.id === drag.id ? { ...item, x: snap(p.x - drag.dx), y: snap(p.y - drag.dy) } : item
    if (drag.kind === 'node') setNodes(prev => prev.map(move))
    if (drag.kind === 'tag') setTags(prev => prev.map(move))
    if (drag.kind === 'note') setNotes(prev => prev.map(move))
  }

  const finishPipe = () => {
    if (drawing?.points.length > 1) {
      setPipes(prev => [...prev, { id: id(), color: drawing.color, dashed: drawing.dashed, points: drawing.points }])
    }
    setDrawing(null)
  }

  const deleteSelected = () => {
    if (!selected) return
    setNodes(prev => prev.filter(n => n.id !== selected))
    setTags(prev => prev.filter(t => t.id !== selected))
    setNotes(prev => prev.filter(n => n.id !== selected))
    setPipes(prev => prev.filter(p => p.id !== selected))
    setSelected(null)
    setSelectedName('')
  }

  const renameSelected = () => {
    const value = selectedName.trim()
    if (!value || !selectedItem) return
    if ('label' in selectedItem) setNodes(prev => prev.map(n => n.id === selected ? { ...n, label: value } : n))
    if ('text' in selectedItem) {
      setTags(prev => prev.map(t => t.id === selected ? { ...t, text: value } : t))
      setNotes(prev => prev.map(n => n.id === selected ? { ...n, text: value } : n))
    }
  }

  const renameSelectedTo = (value) => {
    const next = value.trim()
    if (!next || !selectedItem) return
    setSelectedName(next)
    if ('label' in selectedItem) setNodes(prev => prev.map(n => n.id === selected ? { ...n, label: next } : n))
    if ('text' in selectedItem) {
      setTags(prev => prev.map(t => t.id === selected ? { ...t, text: next } : t))
      setNotes(prev => prev.map(n => n.id === selected ? { ...n, text: next } : n))
    }
  }

  const exportSvg = () => {
    const svg = svgRef.current.cloneNode(true)
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svg.querySelectorAll('.pipe-hit').forEach(el => el.remove())
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = `
      .pd-label{font:16px Arial,sans-serif;fill:#667386;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}
      .pd-note{font:700 20px Arial,sans-serif;fill:#17202c;paint-order:stroke;stroke:#fff;stroke-width:5px}
      .pd-tag text{font:700 16px Arial,sans-serif;text-anchor:middle;dominant-baseline:middle}
    `
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    pattern.setAttribute('id', 'export-grid')
    pattern.setAttribute('width', '40')
    pattern.setAttribute('height', '40')
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M 40 0 H 0 V 40')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#1c2a3a')
    path.setAttribute('stroke-opacity', '.055')
    pattern.appendChild(path)
    defs.append(style, pattern)
    svg.prepend(defs)
    const [x, y, width, height] = viewBox.split(/\s+/)
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', x); bg.setAttribute('y', y); bg.setAttribute('width', width); bg.setAttribute('height', height); bg.setAttribute('fill', 'url(#export-grid)')
    defs.after(bg)
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'piping-layout.svg'
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetDemo = () => {
    const next = makeDemo()
    setNodes(next.nodes)
    setPipes(next.pipes)
    setTags(next.tags)
    setNotes(next.notes)
    setSelected(null)
    setSelectedName('')
    setDrawing(null)
  }

  useEffect(() => {
    const onKey = (evt) => {
      if (evt.key === 'Escape') setDrawing(null)
      if (evt.key === 'Delete' || evt.key === 'Backspace') deleteSelected()
      if (evt.key === 'Enter' && drawing?.points.length > 1) finishPipe()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, drawing])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '276px minmax(0, 1fr)', background: '#fff', color: '#17202c' }}>
        <aside style={{ borderRight: '1px solid #d7dee8', background: '#f8fafc', padding: 16, overflowY: 'auto' }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Piping Designer</h1>
          <p style={{ margin: '4px 0 16px', color: '#667386', fontSize: 12, lineHeight: 1.45 }}>ลากหรือคลิก component แล้ววางลงพื้นที่ จากนั้นวาดท่อและใส่ text ได้</p>

          <PanelTitle>Component</PanelTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {Object.entries(COMPONENTS).map(([type, def]) => (
              <button key={type} draggable onDragStart={e => e.dataTransfer.setData('component', type)} onClick={() => { setPendingComponent(type); setPendingText(null); setMode('select') }}
                style={tileStyle(pendingComponent === type)}>
                <svg viewBox="0 0 90 70" width="62" height="52"><Icon type={type} fill={def.fill} detail={def.detail} /></svg>
                <span>{type === 'compressor' ? 'Comp' : type === 'tank' ? 'ถัง' : type === 'evap' ? 'Evap' : 'Air'}</span>
              </button>
            ))}
          </div>

          <PanelTitle>เครื่องมือ</PanelTitle>
          <ButtonGrid>
            <ToolButton active={mode === 'select'} onClick={() => { setMode('select'); setDrawing(null) }}>เลือก/ย้าย</ToolButton>
            <ToolButton active={mode === 'pipe'} onClick={() => { setMode('pipe'); setPendingComponent(null); setPendingText(null) }}>วาดท่อ</ToolButton>
          </ButtonGrid>
          <ButtonGrid>
            {['blue', 'red'].map(c => <ToolButton key={c} active={pipeColor === c} onClick={() => setPipeColor(c)}><Swatch color={COLORS[c]} />{c === 'blue' ? 'ฟ้า' : 'แดง'}</ToolButton>)}
          </ButtonGrid>
          <ButtonGrid>
            <ToolButton active={pipeColor === 'yellow'} onClick={() => setPipeColor('yellow')}><Swatch color={COLORS.yellow} />เหลือง</ToolButton>
            <ToolButton active={dashed} onClick={() => setDashed(v => !v)}>ท่อประ</ToolButton>
          </ButtonGrid>
          <ToolButton onClick={finishPipe} style={{ width: '100%', marginBottom: 16 }}>จบท่อ</ToolButton>

          <PanelTitle>Text / ค่า</PanelTitle>
          <input value={labelText} onChange={e => setLabelText(e.target.value)} style={inputStyle} maxLength={28} />
          <ButtonGrid>
            <ToolButton onClick={() => addTag('cyan')}>เพิ่ม Temp</ToolButton>
            <ToolButton onClick={() => addTag('orange')}>เพิ่ม bar</ToolButton>
          </ButtonGrid>
          <ButtonGrid>
            <ToolButton active={!!pendingText} onClick={() => { setPendingText(labelText || 'Text'); setPendingComponent(null); setMode('select') }}>วาง Text</ToolButton>
            <ToolButton onClick={() => addNote()}>เพิ่ม Text</ToolButton>
          </ButtonGrid>

          <PanelTitle>แก้ชื่อที่เลือก</PanelTitle>
          <input value={selectedName} onChange={e => setSelectedName(e.target.value)} placeholder="คลิกเลือกก่อน" style={inputStyle} maxLength={32} />
          <ButtonGrid>
            <ToolButton onClick={renameSelected}>เปลี่ยนชื่อ</ToolButton>
            <ToolButton onClick={() => renameSelectedTo(labelText)}>ใช้ข้อความบน</ToolButton>
          </ButtonGrid>

          <PanelTitle>จัดการ</PanelTitle>
          <ButtonGrid>
            <ToolButton onClick={deleteSelected}>ลบที่เลือก</ToolButton>
            <ToolButton onClick={resetDemo}>ตัวอย่าง</ToolButton>
          </ButtonGrid>
          <ButtonGrid>
            <ToolButton onClick={() => setViewBox('0 0 1800 1000')}>Fit</ToolButton>
            <ToolButton onClick={exportSvg}>Export SVG</ToolButton>
          </ButtonGrid>
        </aside>

        <section
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const type = e.dataTransfer.getData('component')
            if (!type) return
            const p = svgPoint(e)
            addComponent(type, p.x, p.y)
          }}
          style={{ position: 'relative', minWidth: 0, overflow: 'hidden', background: '#fff' }}
        >
          <svg ref={svgRef} viewBox={viewBox} onPointerDown={onCanvasDown} onPointerMove={onPointerMove} onPointerUp={() => setDrag(null)} onContextMenu={e => e.preventDefault()}
            style={{ width: '100%', height: '100vh', display: 'block', touchAction: 'none', backgroundImage: 'linear-gradient(rgba(28,42,58,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(28,42,58,.055) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            {pipes.map(pipe => {
              const d = orthogonalPath(pipe.points)
              return (
                <g key={pipe.id}>
                  <path d={d} fill="none" stroke={COLORS[pipe.color]} strokeWidth={selected === pipe.id ? 10 : 6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={pipe.dashed ? '12 10' : undefined} filter={selected === pipe.id ? 'drop-shadow(0 0 6px rgba(255,255,255,.9))' : undefined} />
                  <path className="pipe-hit" data-pipe-id={pipe.id} d={d} fill="none" stroke="rgba(255,255,255,.01)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', pointerEvents: 'all' }} />
                </g>
              )
            })}
            {tags.map(tag => (
              <g key={tag.id} transform={`translate(${tag.x} ${tag.y})`} onPointerDown={e => startDrag(e, 'tag', tag)} className="pd-tag" style={{ cursor: 'move' }}>
                <rect x="-58" y="-20" width="116" height="40" rx="6" fill={tag.tone === 'orange' ? 'rgba(88,57,33,.75)' : 'rgba(35,70,78,.75)'} stroke={tag.tone === 'orange' ? '#ee8d45' : '#68d8e8'} strokeWidth="2" />
                <text x="0" y="1" fill={tag.tone === 'orange' ? '#ee8d45' : '#68d8e8'}>{tag.text}</text>
              </g>
            ))}
            {notes.map(note => (
              <g key={note.id} transform={`translate(${note.x} ${note.y})`} onPointerDown={e => startDrag(e, 'note', note)} style={{ cursor: 'move' }}>
                {selected === note.id && <rect x="-12" y="-26" width={Math.max(80, note.text.length * 13 + 24)} height="38" rx="6" fill="transparent" stroke="#68d8e8" strokeDasharray="5 5" />}
                <text className="pd-note" x="0" y="0">{note.text}</text>
              </g>
            ))}
            {nodes.map(node => (
              <g key={node.id} transform={`translate(${node.x} ${node.y})`} onPointerDown={e => startDrag(e, 'node', node)} style={{ cursor: mode === 'pipe' ? 'crosshair' : 'move' }}>
                {selected === node.id && <rect x="-8" y="-8" width={node.w + 16} height={node.h + 34} rx="6" fill="transparent" stroke="#68d8e8" strokeDasharray="5 5" />}
                <svg x="5" y="0" width={node.w - 10} height={node.h - 24} viewBox="0 0 90 70"><Icon type={node.type} fill={node.fill} detail={node.detail} /></svg>
                <text className="pd-label" x={node.w / 2} y={node.h + 14}>{node.label}</text>
                {node.ports.map((port, index) => (
                  <circle key={index} cx={port[0]} cy={port[1]} r="8" fill="rgba(104,216,232,.14)" stroke="rgba(14,116,144,.65)" strokeWidth="2" onPointerDown={e => onConnectorDown(e, node, index)} />
                ))}
              </g>
            ))}
          </svg>
          <div style={{ position: 'absolute', left: 22, bottom: 18, color: '#5f6d7e', fontSize: 13, pointerEvents: 'none' }}>
            Component/Text: ลากหรือคลิกจาก sidebar แล้วคลิกวาง | วาดท่อ: คลิกพื้นที่ว่างเพื่อหักมุม หรือคลิกจุดเชื่อมต่อเพื่อเริ่ม/จบท่อ | Delete เพื่อลบ
          </div>
        </section>
      </main>
    </div>
  )
}

function PanelTitle({ children }) {
  return <div style={{ margin: '14px 0 10px', paddingTop: 12, borderTop: '1px solid #d7dee8', color: '#526174', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>{children}</div>
}

function ButtonGrid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>{children}</div>
}

function ToolButton({ active, children, style, ...props }) {
  return <button {...props} style={{ minHeight: 38, border: `1px solid ${active ? '#68d8e8' : '#d2dae6'}`, borderRadius: 8, background: active ? '#eaf8fb' : '#fff', color: '#17202c', cursor: 'pointer', font: 'inherit', ...style }}>{children}</button>
}

function Swatch({ color }) {
  return <span style={{ display: 'inline-block', width: 18, height: 4, borderRadius: 99, background: color, marginRight: 8, verticalAlign: 'middle' }} />
}

function tileStyle(active) {
  return {
    minHeight: 92,
    padding: 10,
    border: `1px solid ${active ? '#68d8e8' : '#d7dee8'}`,
    borderRadius: 8,
    background: active ? '#eaf8fb' : '#fff',
    color: '#17202c',
    display: 'grid',
    placeItems: 'center',
    gap: 4,
    cursor: 'grab',
  }
}

const inputStyle = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  marginBottom: 8,
  border: '1px solid #d7dee8',
  borderRadius: 8,
  color: '#17202c',
  background: '#fff',
  outline: 'none',
}
