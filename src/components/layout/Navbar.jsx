import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok', hour12: false,
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>{time}</span>
}

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history',   label: 'History'   },
  { to: '/input',     label: 'Input'     },
  { to: '/ph-diagram',label: 'P-H'       },
]

export default function Navbar({ connStatus = 'connecting' }) {
  const { theme, toggle } = useTheme()
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isDark = theme === 'dark'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const connColor = {
    live:       'var(--green)',
    error:      'var(--red)',
    connecting: 'var(--text-3)',
  }[connStatus] || 'var(--text-3)'

  const connLabel = {
    live:       'LIVE',
    error:      'ERROR',
    connecting: 'Connecting…',
  }[connStatus] || 'Connecting…'

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg1)',
      borderBottom: '1px solid var(--border)',
      height: 52,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px', gap: 16,
      transition: 'background 0.2s',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#0d1117',
        }}>NH₃</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Refrigeration SCADA</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>Ammonia Chiller Monitor</div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2 }}>
        {NAV_LINKS.map(({ to, label }) => {
          const active = location.pathname === to
          return (
            <Link key={to} to={to} style={{
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 12, fontWeight: 500,
              textDecoration: 'none',
              color: active ? 'var(--text-1)' : 'var(--text-2)',
              background: active ? 'var(--bg3)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}>{label}</Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Clock />

        {/* Connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          color: connColor,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connColor,
          }} />
          {connLabel}
        </div>

        {/* Theme toggle — pill style (Option B) */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={toggle}
          role="button"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <span style={{ fontSize: 11, color: 'var(--text-2)', userSelect: 'none' }}>
            {isDark ? 'Dark' : 'Light'}
          </span>
          {/* Track */}
          <div style={{
            position: 'relative', width: 36, height: 20,
            borderRadius: 10,
            background: isDark ? 'var(--bg3)' : 'var(--cyan)',
            border: '1px solid var(--border)',
            transition: 'background 0.2s',
          }}>
            {/* Thumb */}
            <div style={{
              position: 'absolute',
              top: 2,
              left: isDark ? 2 : 16,
              width: 14, height: 14,
              borderRadius: '50%',
              background: isDark ? 'var(--text-2)' : '#fff',
              transition: 'left 0.2s',
            }} />
          </div>
        </div>

        {/* Logout */}
        <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  )
}
