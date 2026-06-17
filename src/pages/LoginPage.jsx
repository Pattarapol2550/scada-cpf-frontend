/**
 * src/pages/LoginPage.jsx
 *
 * เปลี่ยน Google Sign-In จาก popup → redirect flow
 * ทำให้ผู้ใช้เลือก / กรอก Google account เองได้
 * รองรับทั้ง localhost และ Vercel โดยอัตโนมัติ
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authLogin, authRegister } from '../services/api'

const RE_USERNAME = /^[a-zA-Z0-9_.]{3,32}$/
const RE_EMAIL    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RE_PHONE_TH = /^0\d{8,9}$/
const RE_PW_UPPER = /[A-Z]/
const RE_PW_LOWER = /[a-z]/
const RE_PW_DIGIT = /\d/

function validateRegister({ username, email, password, confirm, phone }) {
  if (!RE_USERNAME.test(username))   return 'ชื่อผู้ใช้ต้องยาว 3-32 ตัว ใช้ได้เฉพาะ a-z, 0-9, _ และ .'
  if (!RE_EMAIL.test(email))         return 'รูปแบบอีเมลไม่ถูกต้อง'
  if (password.length < 8)           return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'
  if (!RE_PW_UPPER.test(password) || !RE_PW_LOWER.test(password) || !RE_PW_DIGIT.test(password))
    return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลขอย่างน้อยอย่างละ 1 ตัว'
  if (password !== confirm)          return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'
  if (!RE_PHONE_TH.test(phone.replace(/[-\s]/g, '')))
    return 'เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)'
  return null
}

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-1)', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 11, fontWeight: 500, color: 'var(--text-2)',
  display: 'block', marginBottom: 5,
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
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
  const redirectUri = window.location.origin + '/auth/callback'

  // params สำหรับ Google OAuth2 authorization endpoint
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
    // prompt=select_account บังคับให้แสดงหน้าเลือก account เสมอ
    // แม้จะ login ค้างไว้แล้ว — เหมาะกับเครื่องสำนักงานที่มีหลายคนใช้
    prompt:        'select_account',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Google Button ─────────────────────────────────────────────────────────────
function GoogleButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', padding: '9px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 8, cursor: 'pointer',
        fontSize: 13, fontWeight: 500, color: 'var(--text-1)',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Google G icon */}
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Sign in with Google
    </button>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>หรือเข้าสู่ระบบด้วย</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState('login')

  const [identifier, setIdentifier] = useState('')
  const [loginPw, setLoginPw]       = useState('')
  const [username, setUsername]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [phone, setPhone]           = useState('')

  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()

  const switchMode = (m) => { setMode(m); setError(''); setNotice('') }

  // ── Email Login ───────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (!identifier.trim() || !loginPw) {
      setError('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน')
      return
    }
    setLoading(true)
    try {
      const res = await authLogin({ identifier: identifier.trim(), password: loginPw })
      const { user } = res.data || {}
      login(user)
      navigate('/dashboard')
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

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    setError(''); setNotice('')
    const payload = {
      username: username.trim(),
      email:    email.trim().toLowerCase(),
      password,
      phone:    phone.replace(/[-\s]/g, ''),
    }
    const msg = validateRegister({ ...payload, confirm })
    if (msg) { setError(msg); return }

    setLoading(true)
    try {
      await authRegister(payload)
      setNotice('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
      setMode('login')
      setIdentifier(payload.username)
      setPassword(''); setConfirm('')
    } catch (err) {
      if (err?.response?.status === 409)
        setError('ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว')
      else if (err?.response?.status === 422 || err?.response?.status === 400)
        setError('ข้อมูลไม่ผ่านการตรวจสอบ กรุณาตรวจสอบอีกครั้ง')
      else if (!err?.response)
        setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่ภายหลัง')
      else
        setError('สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่')
    } finally { setLoading(false) }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    background: active ? 'var(--bg3)' : 'transparent',
    color: active ? 'var(--text-1)' : 'var(--text-3)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg0)', padding: 16,
    }}>
      <div style={{
        width: 380, background: 'var(--bg1)',
        border: '1px solid var(--border)', borderRadius: 16, padding: 32,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#0d1117',
          }}>NH₃</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>
            Refrigeration SCADA
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            Ammonia Chiller Monitor
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 18,
          background: 'var(--bg2)', borderRadius: 10, padding: 4,
          border: '1px solid var(--border)',
        }}>
          <button type="button" style={tabStyle(mode === 'login')}
            onClick={() => switchMode('login')}>เข้าสู่ระบบ</button>
          <button type="button" style={tabStyle(mode === 'register')}
            onClick={() => switchMode('register')}>ลงทะเบียน</button>
        </div>

        {notice && (
          <div style={{
            fontSize: 11, color: 'var(--green)',
            background: 'rgba(63,185,80,0.12)',
            padding: '6px 10px', borderRadius: 6, marginBottom: 12,
          }}>{notice}</div>
        )}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Google อยู่บนสุด — ให้ผู้ใช้เห็นก่อน */}
            <GoogleButton onClick={handleGoogleRedirect} />
            <Divider />
            <form onSubmit={handleLogin}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="ชื่อผู้ใช้ หรือ อีเมล">
                <input type="text" value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="username หรือ user@example.com"
                  required maxLength={254} autoComplete="username" style={inputStyle} />
              </Field>
              <Field label="รหัสผ่าน">
                <input type="password" value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  placeholder="••••••••"
                  required maxLength={128} autoComplete="current-password" style={inputStyle} />
              </Field>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: 13,
                         marginTop: 4, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        )}

        {/* ── REGISTER ── */}
        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Google สมัครได้เช่นกัน */}
            <GoogleButton onClick={handleGoogleRedirect} />
            <Divider />
            <form onSubmit={handleRegister}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="ชื่อผู้ใช้">
                <input type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  required minLength={3} maxLength={32} autoComplete="username" style={inputStyle} />
              </Field>
              <Field label="อีเมล">
                <input type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required maxLength={254} autoComplete="email" style={inputStyle} />
              </Field>
              <Field label="เบอร์โทรศัพท์">
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0812345678"
                  required maxLength={12} autoComplete="tel" inputMode="numeric" style={inputStyle} />
              </Field>
              <Field label="รหัสผ่าน (≥8 ตัว มีพิมพ์ใหญ่/เล็ก/ตัวเลข)">
                <input type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required minLength={8} maxLength={128} autoComplete="new-password" style={inputStyle} />
              </Field>
              <Field label="ยืนยันรหัสผ่าน">
                <input type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required minLength={8} maxLength={128} autoComplete="new-password" style={inputStyle} />
              </Field>
              <div style={{
                fontSize: 10, color: 'var(--text-3)',
                background: 'var(--bg2)', borderRadius: 6,
                padding: '5px 8px', border: '1px solid var(--border)',
              }}>
                บัญชีที่ลงทะเบียนใหม่จะได้รับสิทธิ์ <strong>User</strong> โดยอัตโนมัติ
              </div>
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: 13,
                         marginTop: 4, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}