import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // TODO: replace with real auth endpoint when ready
      // const res = await api.post('/auth/login', { email, password })
      // login(res.data.access_token, res.data.user)

      // ── Temporary bypass until auth endpoint is ready ──
      if (email && password) {
        login('dev-token', { email })
        navigate('/dashboard')
      } else {
        setError('กรุณากรอก email และ password')
      }
    } catch {
      setError('Login ไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg0)',
    }}>
      <div style={{
        width: 360,
        background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: 32,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#0d1117',
          }}>NH₃</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>Refrigeration SCADA</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Ammonia Chiller Monitor</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-1)', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-1)', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', padding: '6px 10px', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: 13, marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'กำลัง Login…' : 'Login'}
          </button>
        </form>

        <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>
          ระบบ Auth จะเปิดใช้งานเมื่อ backend พร้อม
        </div>
      </div>
    </div>
  )
}
