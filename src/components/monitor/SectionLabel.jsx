/**
 * Section heading on synoptic diagram (e.g. Booster, High Stage).
 */
export default function SectionLabel({ x, y, text, color = 'var(--text-2)' }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={color}
      fontSize="13"
      fontWeight="600"
      fontFamily="Inter, sans-serif"
      letterSpacing="0.04em"
    >
      {text}
    </text>
  )
}
