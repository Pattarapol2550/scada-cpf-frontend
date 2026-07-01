import { useAvatar } from '../../hooks/useAvatar'

export default function Avatar({ username, size = 32, fontSize }) {
  const { avatar } = useAvatar()
  const initials   = (username || '??').slice(0, 2).toUpperCase()
  const fs         = fontSize ?? Math.max(8, Math.round(size * 0.36))

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={initials}
        style={{
          width: size, height: size, minWidth: size,
          borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, minWidth: size,
      borderRadius: '50%', flexShrink: 0,
      background: 'var(--blue-dim)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: 700, color: 'var(--blue)',
    }}>
      {initials}
    </div>
  )
}
