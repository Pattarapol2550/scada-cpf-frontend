/**
 * src/pages/SettingsPage.jsx
 * Layout แบบ sidebar + content panel
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }  from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { ALL_KPI, KPI_MAP, DEFAULT_KPI_KEYS, loadKpiConfig, saveKpiConfig } from '../utils/kpiConfig'
import {
  getProfile, updateProfile, changePassword,
  adminGetUsers, adminCreateUser,
  adminToggleActive, adminDeleteUser,
} from '../services/api'

// ── Shared ────────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', fontSize: 13,
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
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SectionHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{desc}</div>}
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div style={{
      fontSize: 12,
      color:      type === 'error' ? 'var(--red)'   : 'var(--green)',
      background: type === 'error' ? 'var(--red-dim)' : 'rgba(63,185,80,0.12)',
      padding: '7px 12px', borderRadius: 7, marginBottom: 14,
    }}>{msg}</div>
  )
}

function RoleBadge({ role }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: role === 'admin' ? 'rgba(56,139,253,0.15)' : 'var(--bg3)',
      color:      role === 'admin' ? 'var(--blue)' : 'var(--text-3)',
      border:     `1px solid ${role === 'admin' ? 'var(--blue)' : 'var(--border)'}`,
    }}>{role}</span>
  )
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function NavItem({ id, icon, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: active ? 'var(--bg3)' : 'transparent',
        color:      active ? 'var(--text-1)' : 'var(--text-2)',
        fontSize: 13, fontWeight: active ? 500 : 400,
        textAlign: 'left', transition: 'background 0.15s, color 0.15s',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  )
}

// ── Section: Profile ──────────────────────────────────────────────────────────
function ProfileSection({ profile, onRefresh }) {
  const { login }           = useAuth()
  const navigate            = useNavigate()
  const [username, setUsername] = useState('')
  const [phone,    setPhone]    = useState('')
  const [toast,    setToast]    = useState({ msg: '', type: '' })
  const [loading,  setLoading]  = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await updateProfile({
        phone:    phone.replace(/[-\s]/g, '') || null,
        username: username !== profile.username ? username : null,
      })
      if (res.data?.username) {
        login({ username: res.data.username, role: profile.role })
      }
      showToast('อัพเดทโปรไฟล์สำเร็จ')
      setSaved(true)
      onRefresh()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'อัพเดทไม่สำเร็จ', 'error')
    } finally { setLoading(false) }
  }

  if (!profile) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>กำลังโหลด…</div>

  const initials = (profile.username || '??').slice(0, 2).toUpperCase()

  return (
    <div>
      <SectionHeader title="โปรไฟล์" desc="แก้ไขชื่อและข้อมูลส่วนตัว" />

      {/* Avatar card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: 16, background: 'var(--bg2)', borderRadius: 10,
        border: '1px solid var(--border)', marginBottom: 20,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--cyan), var(--blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#0d1117',
        }}>{initials}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
            {profile.username}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {profile.email}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <RoleBadge role={profile.role} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {profile.auth_provider === 'google' ? '· Google Account' : '· Local Account'}
            </span>
          </div>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />

      <form onSubmit={handleSave} style={{ maxWidth: 480 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="ชื่อผู้ใช้">
            <input
              type="text" value={username}
              onChange={e => { setUsername(e.target.value); setSaved(false) }}
              minLength={3} maxLength={32} style={inputStyle}
            />
          </Field>
          <Field label="อีเมล">
            <div style={{ ...inputStyle, color: 'var(--text-3)', cursor: 'not-allowed' }}>
              {profile.email}
            </div>
          </Field>
        </div>
        <Field label="เบอร์โทรศัพท์">
          <input
            type="tel" value={phone}
            onChange={e => { setPhone(e.target.value); setSaved(false) }}
            placeholder="0812345678" maxLength={12}
            inputMode="numeric" style={{ ...inputStyle, maxWidth: 200 }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <button type="submit" disabled={loading} className="btn-primary"
            style={{ padding: '8px 22px', fontSize: 12, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>

          {/* ปุ่มกลับ Dashboard — โชว์หลังบันทึกสำเร็จ */}
          {saved && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', fontSize: 12, borderRadius: 8,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                color: 'var(--text-2)', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              ← กลับ Dashboard
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// ── Section: Password ─────────────────────────────────────────────────────────
function PasswordSection() {
  const [cur,     setCur]     = useState('')
  const [nw,      setNw]      = useState('')
  const [cnf,     setCnf]     = useState('')
  const [toast,   setToast]   = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (nw !== cnf)    { showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'error'); return }
    if (nw.length < 8) { showToast('รหัสผ่านต้องยาวอย่างน้อย 8 ตัว', 'error'); return }
    setLoading(true)
    try {
      await changePassword({ current_password: cur, new_password: nw })
      showToast('เปลี่ยนรหัสผ่านสำเร็จ')
      setCur(''); setNw(''); setCnf('')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <SectionHeader title="รหัสผ่าน" desc="เปลี่ยนรหัสผ่านสำหรับบัญชี local (ไม่ใช้กับบัญชี Google)" />
      <Toast msg={toast.msg} type={toast.type} />
      <form onSubmit={handleSubmit} style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Field label="รหัสผ่านปัจจุบัน">
          <input type="password" value={cur} onChange={e => setCur(e.target.value)}
            required placeholder="••••••••" style={inputStyle} />
        </Field>
        <Field label="รหัสผ่านใหม่ (≥8 ตัว มีพิมพ์ใหญ่/เล็ก/ตัวเลข)">
          <input type="password" value={nw} onChange={e => setNw(e.target.value)}
            required placeholder="••••••••" style={inputStyle} />
        </Field>
        <Field label="ยืนยันรหัสผ่านใหม่">
          <input type="password" value={cnf} onChange={e => setCnf(e.target.value)}
            required placeholder="••••••••" style={inputStyle} />
        </Field>
        <div style={{ marginTop: 4 }}>
          <button type="submit" disabled={loading} className="btn-primary"
            style={{ padding: '8px 22px', fontSize: 12, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'กำลังเปลี่ยน…' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Section: Theme ────────────────────────────────────────────────────────────
function ThemeSection() {
  const { theme, toggle } = useTheme()

  return (
    <div>
      <SectionHeader title="ธีม" desc="เลือกธีมสำหรับการแสดงผล" />
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { key: 'dark',  label: 'Dark',  icon: '🌙' },
          { key: 'light', label: 'Light', icon: '☀️' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => theme !== t.key && toggle()}
            style={{
              width: 140, padding: '16px 0', textAlign: 'center',
              borderRadius: 10, border: `${theme === t.key ? '2px' : '1px'} solid`,
              borderColor:  theme === t.key ? 'var(--blue)' : 'var(--border)',
              background:   theme === t.key ? 'rgba(56,139,253,0.08)' : 'var(--bg2)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{t.label}</div>
            {theme === t.key && (
              <div style={{ fontSize: 10, color: 'var(--blue)', marginTop: 4 }}>ใช้งานอยู่</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Section: Admin Users ──────────────────────────────────────────────────────
function AdminUsersSection() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState({ msg: '', type: '' })
  const [confirm, setConfirm] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  const loadUsers = async () => {
    try {
      const res = await adminGetUsers()
      setUsers(res.data)
    } catch { showToast('โหลด users ไม่สำเร็จ', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  const handleToggle = async (id) => {
    try {
      await adminToggleActive(id)
      showToast('อัพเดทสถานะสำเร็จ')
      loadUsers()
    } catch { showToast('อัพเดทไม่สำเร็จ', 'error') }
  }

  const handleDelete = async () => {
    if (!confirm) return
    try {
      await adminDeleteUser(confirm.id)
      showToast(`ลบ '${confirm.username}' สำเร็จ`)
      setConfirm(null)
      loadUsers()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'ลบไม่สำเร็จ', 'error')
    }
  }

  return (
    <div>
      <SectionHeader title="จัดการผู้ใช้" desc="ดูและจัดการ account ทั้งหมดในระบบ" />
      <Toast msg={toast.msg} type={toast.type} />

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>กำลังโหลด…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['ชื่อผู้ใช้', 'อีเมล', 'Role', 'Provider', 'สถานะ', ''].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    color: 'var(--text-3)', fontWeight: 500, fontSize: 11,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{
                  borderBottom: '1px solid var(--border)',
                  opacity: u.is_active ? 1 : 0.5,
                }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-1)' }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--bg3)', color: 'var(--text-3)',
                    }}>{u.auth_provider || 'local'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button type="button" onClick={() => handleToggle(u.id)} style={{
                      fontSize: 10, padding: '3px 10px', borderRadius: 20,
                      border: 'none', cursor: 'pointer', fontWeight: 600,
                      background: u.is_active ? 'rgba(63,185,80,0.15)' : 'var(--bg3)',
                      color:      u.is_active ? 'var(--green)' : 'var(--text-3)',
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button type="button" onClick={() => setConfirm({ id: u.id, username: u.username })}
                      style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 6,
                        background: 'transparent', border: '1px solid var(--red)',
                        color: 'var(--red)', cursor: 'pointer',
                      }}>
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>
            * การเปลี่ยน role ต้องทำผ่าน Database โดยตรง
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: 'var(--bg1)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 28, width: 320, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
              ยืนยันการลบ?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
              ลบ account <strong>{confirm.username}</strong> ออกจากระบบ<br />
              <span style={{ color: 'var(--red)', fontSize: 11 }}>ไม่สามารถย้อนกลับได้</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={() => setConfirm(null)}
                className="btn-ghost" style={{ padding: '8px 20px', fontSize: 12 }}>
                ยกเลิก
              </button>
              <button type="button" onClick={handleDelete}
                style={{
                  padding: '8px 20px', fontSize: 12, borderRadius: 8,
                  background: 'var(--red)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section: Create User ──────────────────────────────────────────────────────
function AdminCreateSection() {
  const [form, setForm]       = useState({ username: '', email: '', phone: '', password: '', role: 'user' })
  const [toast,   setToast]   = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminCreateUser(form)
      showToast(`สร้าง '${form.username}' สำเร็จ`)
      setForm({ username: '', email: '', phone: '', password: '', role: 'user' })
    } catch (err) {
      showToast(err?.response?.data?.detail || 'สร้างไม่สำเร็จ', 'error')
    } finally { setLoading(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <SectionHeader title="สร้างผู้ใช้ใหม่" desc="สร้าง account สำหรับ contractor หรือ vendor" />
      <Toast msg={toast.msg} type={toast.type} />
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="ชื่อผู้ใช้">
            <input value={form.username} onChange={set('username')}
              required minLength={3} maxLength={32} style={inputStyle} />
          </Field>
          <Field label="อีเมล">
            <input type="email" value={form.email} onChange={set('email')}
              required style={inputStyle} />
          </Field>
          <Field label="เบอร์โทร">
            <input type="tel" value={form.phone} onChange={set('phone')}
              required placeholder="0812345678" style={inputStyle} />
          </Field>
          <Field label="รหัสผ่าน">
            <input type="password" value={form.password} onChange={set('password')}
              required minLength={8} placeholder="≥8 ตัว พิมพ์ใหญ่+เล็ก+ตัวเลข" style={inputStyle} />
          </Field>
        </div>
        <Field label="Role">
          <select value={form.role} onChange={set('role')}
            style={{ ...inputStyle, width: 'auto', paddingRight: 32 }}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <button type="submit" disabled={loading} className="btn-primary"
          style={{ padding: '8px 22px', fontSize: 12, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'กำลังสร้าง…' : 'สร้าง Account'}
        </button>
      </form>
    </div>
  )
}

function KpiSection() {
  const [selected, setSelected] = useState(() => loadKpiConfig())
  const [toast,    setToast]    = useState({ msg: '', type: '' })
  const [dragIdx,  setDragIdx]  = useState(null)   // index ที่กำลัง drag
 
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 2500)
  }
 
  // ── Toggle on/off ─────────────────────────────────────
  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }
 
  // ── Save ──────────────────────────────────────────────
  const handleSave = () => {
    if (selected.length === 0) {
      showToast('ต้องเลือกอย่างน้อย 1 ค่า', 'error')
      return
    }
    saveKpiConfig(selected)
    showToast('บันทึกการตั้งค่า KPI สำเร็จ')
  }
 
  // ── Reset ─────────────────────────────────────────────
  const handleReset = () => {
    setSelected(DEFAULT_KPI_KEYS)
    saveKpiConfig(DEFAULT_KPI_KEYS)
    showToast('รีเซ็ตเป็นค่าเริ่มต้น')
  }
 
  // ── Drag handlers (สำหรับ selected list) ─────────────
  const onDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
 
  const onDragOver = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setSelected(prev => {
      const next = [...prev]
      const [item] = next.splice(dragIdx, 1)
      next.splice(idx, 0, item)
      setDragIdx(idx)
      return next
    })
  }
 
  const onDragEnd = () => setDragIdx(null)
 
  // Group ที่มีใน ALL_KPI
  const groups = [
    { id: 'performance', label: 'Performance (คำนวณ)' },
    { id: 'enthalpy',    label: 'Enthalpy (คำนวณ)'    },
    { id: 'sensor',      label: 'Sensor Input (วัด)'  },
  ]
 
  return (
    <div>
      <SectionHeader
        title="Dashboard KPI Cards"
        desc="เลือกค่าที่ต้องการแสดงบน Dashboard และลากเรียงลำดับได้"
      />
      <Toast msg={toast.msg} type={toast.type} />
 
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
 
        {/* ── ซ้าย: เลือกจากทั้งหมด ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ค่าทั้งหมด — คลิกเพื่อเพิ่ม/ลบ
          </div>
 
          {groups.map(g => (
            <div key={g.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
                marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                {g.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_KPI.filter(k => k.group === g.id).map(kpi => {
                  const on = selected.includes(kpi.key)
                  return (
                    <button
                      key={kpi.key}
                      type="button"
                      onClick={() => toggle(kpi.key)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11,
                        fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                        border:      `1px solid ${on ? 'var(--blue)' : 'var(--border)'}`,
                        background:  on ? 'rgba(56,139,253,0.12)' : 'var(--bg2)',
                        color:       on ? 'var(--blue)' : 'var(--text-2)',
                      }}
                    >
                      {on ? '✓ ' : ''}{kpi.label}
                      <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>
                        {kpi.unit !== '—' ? kpi.unit : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
 
        {/* ── ขวา: ลำดับที่จะแสดง (drag to reorder) ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ลำดับที่แสดง ({selected.length} cards) — ลากเพื่อเรียง
          </div>
 
          {selected.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)',
              fontSize: 12, background: 'var(--bg2)', borderRadius: 8,
              border: '1px dashed var(--border)' }}>
              ยังไม่ได้เลือกค่าไหนเลย
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selected.map((key, idx) => {
                const kpi = KPI_MAP[key]
                if (!kpi) return null
                const isDragging = dragIdx === idx
                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={e => onDragStart(e, idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDragEnd={onDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: isDragging ? 'rgba(56,139,253,0.1)' : 'var(--bg2)',
                      border: `1px solid ${isDragging ? 'var(--blue)' : 'var(--border)'}`,
                      cursor: 'grab', userSelect: 'none',
                      opacity: isDragging ? 0.7 : 1,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    {/* drag handle */}
                    <span style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1 }}>⠿</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', flex: 1 }}>
                      {kpi.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                      {kpi.unit !== '—' ? kpi.unit : ''}
                    </span>
                    {/* remove */}
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      style={{
                        fontSize: 12, lineHeight: 1, padding: '2px 6px', borderRadius: 4,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)',
                      }}
                    >×</button>
                  </div>
                )
              })}
            </div>
          )}
 
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" onClick={handleSave} className="btn-primary"
              style={{ padding: '8px 20px', fontSize: 12 }}>
              บันทึก
            </button>
            <button type="button" onClick={handleReset} className="btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}>
              รีเซ็ต
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isAdmin, user } = useAuth()
  const [profile,  setProfile]  = useState(null)
  const [section,  setSection]  = useState('profile')

  const loadProfile = async () => {
    try {
      const res = await getProfile()
      setProfile(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { loadProfile() }, [])

  const isLocal = profile?.auth_provider !== 'google'

  // เมนูที่ทุกคนเห็น
  const personalMenus = [
    { id: 'profile',  icon: '', label: 'โปรไฟล์' },
    ...(isLocal ? [{ id: 'password', icon: '', label: 'รหัสผ่าน' }] : []),
    { id: 'theme',    icon: '', label: 'ธีม' },
    { id: 'kpi', icon: '', label: 'Dashboard KPI' }
  ]

  // เมนู admin
  const adminMenus = [
    { id: 'users',  icon: '', label: 'จัดการผู้ใช้' },
    { id: 'create', icon: '', label: 'สร้างผู้ใช้' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        padding: '20px 12px',
        background: 'var(--bg1)',
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '0 4px' }}>
          <img src="/settings-icon.png" alt="Settings" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Settings</span>
        </div>

        {/* Personal */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>
          บัญชีของฉัน
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
          {personalMenus.map(m => (
            <NavItem key={m.id} {...m} active={section === m.id} onClick={setSection} />
          ))}
        </div>

        {/* Admin zone */}
        {isAdmin && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 12px' }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--blue)',
              textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>
              Admin Zone
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {adminMenus.map(m => (
                <NavItem key={m.id} {...m} active={section === m.id} onClick={setSection} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Content ── */}
      {/* ── Content ── */}
<div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', background: 'var(--bg0)' }}>
  {/* แก้: ถ้า section === 'kpi' ไม่จำกัด maxWidth */}
    <div style={{ maxWidth: section === 'kpi' ? 900 : 640 }}>
        {section === 'profile'  && <ProfileSection profile={profile} onRefresh={loadProfile} />}
        {section === 'password' && <PasswordSection />}
        {section === 'theme'    && <ThemeSection />}
        {section === 'users'    && <AdminUsersSection />}
        {section === 'create'   && <AdminCreateSection />}
        {section === 'kpi'      && <KpiSection />}
    </div>
</div>
    </div>
  )
}