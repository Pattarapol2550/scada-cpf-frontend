# Link
https://dashboard-cpf-frontend.vercel.app/

# SCADA Frontend — Ammonia Chiller Monitor

React + Vite frontend สำหรับ dashboard ระบบทำความเย็น Ammonia

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

เปิด http://localhost:5173

## Stack
- React 18 + Vite
- React Router v6
- Chart.js + react-chartjs-2
- Axios
- Tailwind CSS

## Pages
| Route | Description |
|---|---|
| `/login` | Login (Public) |
| `/dashboard` | Main dashboard — KPI, charts, alarms |
| `/history` | ดูข้อมูลย้อนหลัง (coming soon) |
| `/input` | Manual input form |
| `/ph-diagram` | P-H diagram full page |

## Context
- `ThemeContext` — dark/light toggle, บันทึกใน localStorage
- `AuthContext` — token management (เชื่อม backend auth ทีหลัง)

## Auth note
ตอนนี้ใช้ temporary bypass — กรอก email/password อะไรก็ได้เข้าได้
เมื่อ backend `/auth/login` endpoint พร้อม ให้ uncomment ใน `LoginPage.jsx`
