import ReadoutBox from './ReadoutBox.jsx'

export default function PressureReadout({ x, y, value, unit = 'bar' }) {
  return (
    <ReadoutBox
      x={x}
      y={y}
      value={value}
      unit={unit}
      bg="rgba(240,136,62,0.12)"
      border="rgba(240,136,62,0.45)"
      textColor="var(--orange)"
    />
  )
}
