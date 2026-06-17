/**
 * src/main.jsx
 *
 * FIX: ลบ React.StrictMode ออก
 *
 * StrictMode ใน development จะ mount→unmount→mount ใหม่โดยตั้งใจ
 * ทำให้ useEffect ทำงาน 2 ครั้ง ซึ่งปัญหากับ one-time-use Google auth code
 *
 * หมายเหตุ: StrictMode ไม่ส่งผลใน production build (npm run build)
 * ดังนั้น production จะทำงานปกติอยู่แล้ว — ปัญหานี้เกิดเฉพาะ dev เท่านั้น
 * แต่เพื่อความปลอดภัย เราแก้ทั้ง 2 ทาง (useRef + ลบ StrictMode)
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)