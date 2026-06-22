/**
 * src/pages/LoginPage.jsx
 *
 * หน้า Login ใหม่:
 *  - Sign in with Google เป็น primary action
 *  - ฟอร์ม username/password ซ่อนอยู่ กด "เข้าสู่ระบบด้วยรหัสผ่าน" ถึง expand
 *  - ไม่มีหน้า Register — ติดต่อ admin แทน
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authLogin } from '../services/api'

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-1)', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        fontSize: 11, fontWeight: 500, color: 'var(--text-2)',
        display: 'block', marginBottom: 5,
      }}>{label}</label>
      {children}
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)',
      padding: '6px 10px', borderRadius: 6,
    }}>{msg}</div>
  )
}

// ── Google redirect ───────────────────────────────────────────────────────────
function handleGoogleRedirect() {
  const clientId    = import.meta.env.VITE_GOOGLE_CLIENT_ID
const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/auth/callback'

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    prompt:        'select_account',   // บังคับแสดงหน้าเลือก account เสมอ
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [showPw, setShowPw]     = useState(false)
  const [identifier, setId]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน')
      return
    }
    setLoading(true)
    try {
      const res = await authLogin({ identifier: identifier.trim(), password })
      login(res.data?.user)
      navigate('/overview')
    } catch (err) {
      if (err?.response?.status === 429)
        setError('พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่')
      else if (err?.response?.status === 400)
        setError('บัญชีนี้ใช้ Google Login กรุณาคลิก Sign in with Google')
      else if (!err?.response)
        setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่ภายหลัง')
      else
        setError('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg0)', padding: 16,
    }}>
      <div style={{
        width: 360, background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: 32,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#0d1117',
          }}>NH₃</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>
            Refrigeration SCADA
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            Ammonia Chiller Monitor
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Google Button — primary */}
          <button
            type="button"
            onClick={handleGoogleRedirect}
            style={{
              width: '100%', padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: 'var(--text-1)',
              transition: 'border-color 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>หรือ</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Password toggle button */}
          {!showPw && (
            <button
              type="button"
              onClick={() => setShowPw(true)}
              style={{
                width: '100%', padding: '9px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, cursor: 'pointer',
                fontSize: 12, color: 'var(--text-3)',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
               เข้าสู่ระบบด้วยรหัสผ่าน
            </button>
          )}

          {/* Password form — expand เมื่อกดปุ่ม */}
          {showPw && (
            <form
              onSubmit={handleLogin}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <Field label="ชื่อผู้ใช้ หรือ อีเมล">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setId(e.target.value)}
                  placeholder="username หรือ user@example.com"
                  required maxLength={254}
                  autoComplete="username"
                  autoFocus
                  style={inputStyle}
                />
              </Field>
              <Field label="รหัสผ่าน">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required maxLength={128}
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </Field>

              {error && <ErrorBox msg={error} />}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%', padding: '10px', fontSize: 13,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </button>

              <button
                type="button"
                onClick={() => { setShowPw(false); setError('') }}
                style={{
                  fontSize: 11, color: 'var(--text-3)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, textAlign: 'center',
                }}
              >
                ยกเลิก
              </button>
            </form>
          )}

        </div>

        {/* Footer note */}
        <p style={{
          fontSize: 10, color: 'var(--text-3)',
          textAlign: 'center', marginTop: 20, marginBottom: 0,
          lineHeight: 1.6,
        }}>
          ต้องการ account กรุณาติดต่อ admin
        </p>

      </div>
    </div>
  )
}