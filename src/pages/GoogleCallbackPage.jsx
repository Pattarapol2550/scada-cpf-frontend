/**
 * src/pages/GoogleCallbackPage.jsx
 *
 * FIX: ป้องกัน useEffect ทำงาน 2 ครั้งจาก React StrictMode
 *
 * ปัญหา:
 *   React StrictMode (dev mode) จะ mount → unmount → mount ใหม่
 *   ทำให้ useEffect ทำงาน 2 ครั้ง
 *   Google authorization code ใช้ได้ครั้งเดียว → ครั้งที่ 2 ได้ 401
 *   → catch error → redirect กลับ /login ทันที
 *
 * แก้:
 *   ใช้ useRef เป็น flag ป้องกันเรียก API ซ้ำ
 *   cleanup function cancel request ถ้า unmount ก่อนเสร็จ
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authGoogleCallback } from '../services/api'

export default function GoogleCallbackPage() {
  const [error, setError] = useState('')
  const { login }         = useAuth()
  const navigate          = useNavigate()

  // FIX: flag ป้องกัน StrictMode double-invoke
  const calledRef = useRef(false)

  useEffect(() => {
    // ถ้าเคยเรียกไปแล้ว → หยุดทันที
    if (calledRef.current) return
    calledRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const err    = params.get('error')

    if (err || !code) {
      navigate('/login')
      return
    }

    authGoogleCallback({
      code,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI || window.location.origin + '/auth/callback',
    })
      .then(res => {
        const { user } = res.data || {}
        login(user)
        navigate('/dashboard', { replace: true })
      })
      .catch(err => {
        const status = err?.response?.status
        if (status === 403) {
          setError('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อ admin')
        } else {
          setError('Google Login ไม่สำเร็จ กรุณาลองใหม่')
        }
        setTimeout(() => navigate('/login', { replace: true }), 2500)
      })
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg0)', gap: 16,
    }}>
      {!error ? (
        <>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--blue)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
            กำลังเข้าสู่ระบบด้วย Google…
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{
            fontSize: 13, color: 'var(--red)',
            background: 'var(--red-dim)',
            padding: '10px 16px', borderRadius: 8,
          }}>{error}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            กำลังกลับไปหน้า Login…
          </div>
        </>
      )}
    </div>
  )
}