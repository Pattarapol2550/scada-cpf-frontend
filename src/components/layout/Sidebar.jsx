import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authLogout } from '../../services/api'
import api from '../../services/api'

function Clock({ collapsed }) {
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
  if (collapsed) return null
  return (
    <div style={{
      fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace',
      padding: '4px 8px', background: 'var(--bg2)', borderRadius: 6,
      textAlign: 'center', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden',
    }}>{time}</div>
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
  { to: '/dashboard',  label: 'Dashboard',   icon: 'ti-layout-dashboard' },
  { to: '/history',    label: 'History',     icon: 'ti-history'          },
  { to: '/input',      label: 'Input',       icon: 'ti-pencil'           },
  { to: '/ph-diagram', label: 'P-H Diagram', icon: 'ti-chart-dots'       },
  { to: '/calculator', label: 'Calculator',  icon: 'ti-calculator'       },
  { to: '/develop',    label: 'Develop',     icon: 'ti-code'             },
  { to: '/settings',   label: 'Settings',    icon: 'ti-settings'         },
]

const TABLER_CDN = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css'

let tablerLoaded = false
function ensureTabler() {
  if (tablerLoaded) return
  if (document.querySelector(`link[href="${TABLER_CDN}"]`)) { tablerLoaded = true; return }
  const link = document.createElement('link')
  link.rel = 'stylesheet'; link.href = TABLER_CDN
  document.head.appendChild(link)
  tablerLoaded = true
}

export default function Sidebar({ connStatus: connStatusProp }) {
  const { user, logout } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const probedStatus = useConnectionStatus()
  const connStatus   = connStatusProp ?? probedStatus

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })

  useEffect(() => { ensureTabler() }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const handleLogout = async () => {
    try { await authLogout() } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const connColor = { live: 'var(--green)', error: 'var(--red)', connecting: 'var(--text-3)' }[connStatus] ?? 'var(--text-3)'
  const connLabel = { live: 'LIVE', error: 'ERR', connecting: '…' }[connStatus] ?? '…'
  const initials  = user?.username ? user.username.slice(0, 2).toUpperCase() : '??'

  const W = collapsed ? 44 : 180

  return (
    <aside style={{
      width: W, flexShrink: 0,
      background: 'var(--bg1)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '10px 6px' : '12px 10px',
      position: 'sticky', top: 0, height: '100vh',
      transition: 'width 0.22s ease, padding 0.22s ease',
      overflow: 'hidden',
    }}>

      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 10,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 28, height: 28, minWidth: 28, borderRadius: 6,
          background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, color: '#0d1117',
        }}>NH₃</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>Refrigeration SCADA</div>
            <div style={{ fontSize: 8, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Ammonia Chiller</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_LINKS.map(({ to, label, icon }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to} to={to}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 7,
                padding: collapsed ? '7px 6px' : '6px 8px',
                borderRadius: 5, fontSize: 12,
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                color:      active ? 'var(--blue)'     : 'var(--text-2)',
                background: active ? 'var(--blue-dim)' : 'transparent',
                borderLeft: `3px solid ${active ? 'var(--blue)' : 'transparent'}`,
                transition: 'background 0.15s, color 0.15s, border-left-color 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (active) return
                e.currentTarget.style.background = 'var(--bg2)'
                e.currentTarget.style.color = 'var(--text-1)'
                e.currentTarget.style.borderLeftColor = 'var(--border)'
              }}
              onMouseLeave={e => {
                if (active) return
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-2)'
                e.currentTarget.style.borderLeftColor = 'transparent'
              }}
            >
              <i className={`ti ${icon}`} style={{ fontSize: 16, minWidth: 16, textAlign: 'center' }} aria-hidden="true" />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Clock + Connection */}
      <Clock collapsed={collapsed} />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 4, fontSize: 9, fontWeight: 600,
        padding: collapsed ? '5px 4px' : '4px 8px',
        borderRadius: 10, border: '1px solid var(--border)',
        background: 'var(--bg2)', color: connColor, marginBottom: 10,
        overflow: 'hidden',
      }}
        title={collapsed ? connLabel : undefined}
      >
        <div style={{ width: 5, height: 5, minWidth: 5, borderRadius: '50%', background: connColor }} />
        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{connLabel}</span>}
      </div>

      {/* User + Logout + Toggle */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }} title={collapsed ? `สวัสดี, ${user?.username}` : undefined}>
          <div style={{
            width: 26, height: 26, minWidth: 26, borderRadius: '50%',
            background: 'var(--blue-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600, color: 'var(--blue)',
          }}>{initials}</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
                สวัสดี, {user?.username ?? '—'}
              </div>
              <div style={{ fontSize: 8, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {user?.role === 'admin' ? 'Admin' : 'User'}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'ออกจากระบบ' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 5, padding: collapsed ? '6px 4px' : '5px 8px',
            borderRadius: 5, fontSize: 11, color: 'var(--text-2)',
            border: '1px solid var(--border)', background: 'transparent',
            cursor: 'pointer', width: '100%',
            transition: 'background 0.15s, color 0.15s', overflow: 'hidden',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <i className="ti ti-logout" style={{ fontSize: 14, minWidth: 14 }} aria-hidden="true" />
          {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>ออกจากระบบ</span>}
        </button>

        {/* Toggle collapse */}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'ขยาย sidebar' : 'ซ่อน sidebar'}
          title={collapsed ? 'ขยาย sidebar' : 'ซ่อน sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            alignSelf: collapsed ? 'center' : 'flex-end',
            width: 28, height: 28, borderRadius: 5,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text-3)', cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text-1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          <i
            className={collapsed ? 'ti ti-chevrons-right' : 'ti ti-chevrons-left'}
            style={{ fontSize: 14 }}
            aria-hidden="true"
          />
        </button>
      </div>
    </aside>
  )
}
