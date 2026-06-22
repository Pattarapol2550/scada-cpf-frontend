import ReadoutBox from './ReadoutBox.jsx'

export default function TempReadout({ x, y, value, unit = '°C' }) {
  return (
    <ReadoutBox
      x={x}
      y={y}
      value={value}
      unit={unit}
      bg="rgba(57,197,207,0.12)"
      border="rgba(57,197,207,0.45)"
      textColor="var(--cyan)"
    />
  )
}
