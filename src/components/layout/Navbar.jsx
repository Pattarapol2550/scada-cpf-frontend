/**
 * src/components/layout/Navbar.jsx
 * - ลบ theme toggle (ย้ายไปหน้า Settings แล้ว)
 * - เปลี่ยน settings เป็นรูปภาพ /settings-icon.png
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth }    from '../../context/AuthContext'
import { authLogout } from '../../services/api'
import api from '../../services/api'

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
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-3)' }}>
      {time}
    </span>
  )
}

function useConnectionStatus() {
  const [status, setStatus] = useState('connecting')
  const timerRef = useRef(null)
  const probe = async () => {
    try {
      await api.get('/api/metrics/COMP-01', { params: { limit: 1 }, timeout: 8_000 })
      setStatus('live')
    } catch { setStatus('error') }
  }
  useEffect(() => {
    probe()
    timerRef.current = setInterval(probe, 30_000)
    return () => clearInterval(timerRef.current)
  }, [])
  return status
}

const NAV_LINKS = [
  { to: '/dashboard',  label: 'Dashboard'  },
  { to: '/history',    label: 'History'    },
  { to: '/input',      label: 'Input'      },
  { to: '/ph-diagram', label: 'P-H'        },
  { to: '/calculator', label: 'Calculator' },
]

export default function Navbar({ connStatus: connStatusProp }) {
  const { logout, user }  = useAuth()
  const location          = useLocation()
  const navigate          = useNavigate()
  const probedStatus      = useConnectionStatus()
  const connStatus        = connStatusProp ?? probedStatus

  const handleLogout = async () => {
    try { await authLogout() } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const connColor = { live: 'var(--green)', error: 'var(--red)', connecting: 'var(--text-3)' }[connStatus] ?? 'var(--text-3)'
  const connLabel = { live: 'LIVE',         error: 'ERROR',      connecting: 'Connecting…'  }[connStatus] ?? '…'
  const isSettings = location.pathname === '/settings'

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg1)', borderBottom: '1px solid var(--border)',
      height: 52, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 20px', gap: 16,
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
      <nav aria-label="Main navigation" style={{ display: 'flex', gap: 2 }}>
        {NAV_LINKS.map(({ to, label }) => {
          const active = location.pathname === to
          return (
            <Link key={to} to={to} style={{
              padding: '5px 12px', borderRadius: 6,
              fontSize: 12, fontWeight: 500, textDecoration: 'none',
              color:      active ? 'var(--text-1)' : 'var(--text-2)',
              background: active ? 'var(--bg3)'    : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}>{label}</Link>
          )
        })}
      </nav>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Clock />

        {/* Connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          color: connColor,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: connColor }} />
          {connLabel}
        </div>

        {/* Settings icon — รูปภาพแทน emoji */}
        <Link
          to="/settings"
          aria-label="Settings"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background:   isSettings ? 'var(--bg3)'    : 'transparent',
            border:       `1px solid ${isSettings ? 'var(--border)' : 'transparent'}`,
            textDecoration: 'none',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <img
            src="/settings-icon.png"
            alt="Settings"
            style={{ width: 20, height: 20, objectFit: 'contain' }}
          />
        </Link>

        {/* Logout */}
        <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  )
}