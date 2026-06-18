# SCADA Frontend — Ammonia Chiller Monitor

React + Vite dashboard for monitoring and diagnosing an ammonia (NH₃) refrigeration / chiller SCADA system.

**Live:** [dashboard-cpf-frontend.vercel.app](https://dashboard-cpf-frontend.vercel.app/)

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Routes & pages](#routes--pages)
- [Backend API](#backend-api)
- [Authentication](#authentication)
- [State & data fetching](#state--data-fetching)
- [Styling & theming](#styling--theming)
- [Development proxy](#development-proxy)
- [Production deployment](#production-deployment)
- [Testing](#testing)
- [Compressors](#compressors)

---

## Features

| Area | Capabilities |
|---|---|
| **Dashboard** | Real-time KPI cards, time-series charts (COP, pressure, temperature, superheat, power), inline P-H diagram, alarm log, diagnosis report, live polling (5–60 s) |
| **History** | Historical metrics table with pagination, trend chart, live auto-refresh (2 min), CSV / XLSX export |
| **Manual input** | Submit compressor sensor readings to the backend for diagnosis |
| **P-H diagram** | Full-page pressure–enthalpy cycle diagram; latest or timestamp-specific snapshot; PDF export |
| **Calculator** | Single-stage and two-stage NH₃ refrigeration calculators (CoolProp on backend) |
| **Auth** | Login / register with backend validation; cookie-based session |
| **UI** | Dark / light theme toggle, Thai timezone display (Asia/Bangkok), connection status indicator |

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 18 (JSX) |
| Build | Vite 5 + `@vitejs/plugin-react` |
| Routing | React Router v6 |
| Styling | Tailwind CSS 3 + CSS custom properties (design tokens) |
| Charts | Chart.js 4 + react-chartjs-2 |
| HTTP | Axios (`withCredentials: true` for cookie auth) |
| Export | jsPDF (P-H PDF), xlsx (History Excel) |
| Thermodynamics | `nh3Thermo.js` (client-side NH₃ saturation table; backend uses CoolProp) |
| E2E tests | Playwright |
| Hosting | Vercel |
| Backend | REST API on Render — `https://cpfbackend2-0.onrender.com` |

---

## Prerequisites

- **Node.js** 18+ (recommended)
- **npm** 9+
- Backend API reachable (Render URL above, or your own instance)

---

## Quick start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Other scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server on port **5173** |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Environment variables

Create a `.env` file from `.env.example`:

```env
VITE_API_URL="https://cpfbackend2-0.onrender.com"
```

| Variable | Used when | Description |
|---|---|---|
| `VITE_API_URL` | Production build | Base URL for API requests. In dev, requests go through the Vite proxy instead (see below). |

---

## Project structure

```
scada-cpf-frontend/
├── index.html
├── vite.config.js          # Dev server + /api proxy
├── vercel.json             # Production /api rewrite + SPA fallback
├── tailwind.config.js
├── postcss.config.js
├── playwright.config.ts
├── tests/                  # Playwright E2E specs
│   ├── auth.setup.ts       # Shared login session
│   ├── 01-login.spec.ts
│   ├── 02-navbar.spec.ts
│   ├── 03-dashboard.spec.ts
│   ├── 04-history.spec.ts
│   ├── 05-ph-diagram.spec.ts
│   └── 06-manual-input.spec.ts
└── src/
    ├── main.jsx
    ├── App.jsx             # Routes + providers
    ├── index.css           # Design tokens, Tailwind, utilities
    ├── context/
    │   ├── AuthContext.jsx # User session (localStorage)
    │   └── ThemeContext.jsx
    ├── hooks/
    │   └── useMetrics.js   # Metrics fetch + optional polling
    ├── services/
    │   └── api.js          # Axios instance + API helpers
    ├── utils/
    │   └── nh3Thermo.js    # NH₃ thermodynamic calculations
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   └── dashboard/
    │       ├── KPICard.jsx
    │       ├── AlarmLog.jsx
    │       └── DiagnosisReport.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── DashboardPage.jsx
        ├── HistoryPage.jsx
        ├── ManualInputPage.jsx
        ├── PHDiagramPage.jsx
        └── CalculatorPage.jsx
```

---

## Routes & pages

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Login and register (tabbed form) |
| `/dashboard` | Protected | Main SCADA dashboard — KPIs, charts, alarms, diagnosis, mini P-H |
| `/history` | Protected | Historical data table, chart, CSV/XLSX export, auto-refresh |
| `/input` | Protected | Manual sensor input form → `POST /api/metrics` |
| `/ph-diagram` | Protected | Full-page P-H diagram with PDF export |
| `/calculator` | Protected | Single-stage / two-stage NH₃ calculator |
| `*` | — | Redirects to `/dashboard` |

All protected routes are wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/login`.

---

## Backend API

Base URL: `https://cpfbackend2-0.onrender.com` (configurable via `VITE_API_URL`).

All endpoints are prefixed with `/api`. Defined in `src/services/api.js`:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register — `{ username, email, password, phone }` |
| `POST` | `/api/auth/login` | Login — `{ identifier, password }` → sets session cookie |
| `GET` | `/api/auth/me` | Current user profile |
| `GET` | `/api/metrics/:compressorId` | Query metrics — params: `start`, `end`, `limit` |
| `POST` | `/api/metrics` | Submit manual reading (see Manual Input fields below) |
| `GET` | `/api/ph-diagram/:comp` | P-H cycle — optional `timestamp` or record `_id` |
| `POST` | `/api/calculate` | Single-stage calculator (CoolProp) |
| `POST` | `/api/calculate_two` | Two-stage calculator (CoolProp) |

Axios is configured with `withCredentials: true` so session cookies are sent automatically. On **401** (non-auth routes), the client redirects to `/login`.

### Manual input payload

```json
{
  "compressor_id": "COMP-01",
  "sp_kg": 1.2,
  "dp_kg": 12.5,
  "st_c": -10,
  "dt_c": 85,
  "liquid_temp_c": 25,
  "current_amp": 45,
  "evaporator_room_temp_c": -18,
  "condenser_temp_c": 35
}
```

Required: `sp_kg`, `dp_kg`. Optional fields use backend assumptions when omitted (e.g. superheat = 5 K, isentropic efficiency = 0.70). Fixed constants: V = 385 V, PF = 0.86.

---

## Authentication

- **Login / register** call the real backend (`LoginPage.jsx` → `authLogin` / `authRegister`).
- **Session** is managed via **HTTP cookies** on the backend (`withCredentials: true`). The frontend does **not** store JWT tokens.
- **User info** (`username`, `role`) is cached in `localStorage` under `scada-user` for UI state (`AuthContext`).
- **Roles:** `isAdmin` is exposed when `role === 'admin'`.
- **Logout** clears local user state and navigates to `/login`.

Client-side validation on register: username (3–32 chars, alphanumeric/`_`/`.`), email format, password (≥8 chars, upper + lower + digit), Thai phone (`0XXXXXXXXX`).

---

## State & data fetching

### `AuthContext`

Provides `user`, `login`, `logout`, `isAuth`, `isAdmin`.

### `ThemeContext`

Provides `theme` (`dark` | `light`) and `toggle`. Persisted in `localStorage` (`scada-theme`). Toggles the `.light` class on `<html>`.

### `useMetrics` hook

```js
const { records, loading, error, fetch, isPolling } = useMetrics({ pollInterval: 5000 })
```

- `fetch(compressorId, startDate, endDate)` — loads up to 720 records.
- When `pollInterval` is set, re-fetches on an interval, sliding the time window forward to "now".
- Used by **Dashboard** for live polling (default 5 s).

### Connection status

`Navbar` probes `GET /api/metrics/COMP-01?limit=1` every 30 s and shows **LIVE** / **ERROR** / **Connecting…**. Dashboard can override this via the `connStatus` prop.

---

## Styling & theming

- **Fonts:** Inter (UI), JetBrains Mono (numeric / mono data) — loaded from Google Fonts.
- **Design tokens:** CSS variables in `src/index.css` (`--bg0`, `--text-1`, `--green`, etc.) for dark (default) and light (`.light`) modes.
- **Tailwind:** Utility classes where convenient; most page layout uses inline styles referencing CSS variables.
- **No UI component library** — custom components only.

---

## Development proxy

In dev, Vite proxies `/api` to the Render backend (see `vite.config.js`):

```js
proxy: {
  '/api': {
    target: 'https://cpfbackend2-0.onrender.com',
    changeOrigin: true,
    secure: false,
  },
}
```

This avoids CORS issues during local development. Axios uses an empty `baseURL` in dev so requests hit the proxy.

---

## Production deployment

Hosted on **Vercel**. `vercel.json` configures:

1. **API rewrite** — `/api/*` → `https://cpfbackend2-0.onrender.com/api/*`
2. **SPA fallback** — all other routes → `/index.html`

Build command: `npm run build`  
Output directory: `dist`

Ensure `VITE_API_URL` is set in Vercel environment variables if using a different backend URL.

---

## Testing

E2E tests use **Playwright**. They run sequentially and share a saved login session.

### Prerequisites

1. Dev server running: `npm run dev`
2. Valid test credentials on the backend (default in `auth.setup.ts`: `admin@example.com` / `password`)

### Run tests

```bash
npx playwright test
```

### Test suite

| Spec | Covers |
|---|---|
| `01-login.spec.ts` | Login flow |
| `02-navbar.spec.ts` | Navigation links, theme toggle |
| `03-dashboard.spec.ts` | Dashboard load, charts, filters |
| `04-history.spec.ts` | History page, table, export |
| `05-ph-diagram.spec.ts` | P-H diagram page |
| `06-manual-input.spec.ts` | Manual input form |

Reports are written to `playwright-report/`. Screenshots, video, and trace are captured on failure.

---

## Compressors

Seven compressors are supported across the app:

`COMP-01`, `COMP-02`, `COMP-03`, `COMP-04`, `COMP-05`, `COMP-06`, `COMP-07`

All timestamps are displayed in **Asia/Bangkok** (`th-TH` locale, 24-hour format).
