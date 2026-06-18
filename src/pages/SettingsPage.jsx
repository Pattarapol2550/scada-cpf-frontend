/**
 * src/pages/SettingsPage.jsx
 *
 * ทุกคน  → โปรไฟล์, เปลี่ยนรหัสผ่าน (local only), ธีม
 * Admin  → จัดการ Users (ดู, toggle active, ลบ), สร้าง User ใหม่
 * ไม่มีการเปลี่ยน role ในหน้าเว็บ — ต้องทำผ่าน DB เท่านั้น
 */
import { useEffect, useState } from 'react'
import { useAuth }  from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  getProfile, updateProfile, changePassword,
  adminGetUsers, adminCreateUser,
  adminToggleActive, adminDeleteUser,
} from '../services/api'

// ── Shared styles ─────────────────────────────────────────────────────────────
const card = {
  background: 'var(--bg1)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 24, marginBottom: 16,
}
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
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{title}</span>
    </div>
  )
}

function Toast({ msg, type }) {
  if (!msg) return null
  const color = type === 'error' ? 'var(--red)' : 'var(--green)'
  const bg    = type === 'error' ? 'var(--red-dim)' : 'rgba(63,185,80,0.12)'
  return (
    <div style={{
      fontSize: 12, color, background: bg,
      padding: '6px 12px', borderRadius: 6, marginBottom: 12,
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

// ── Section: Profile ──────────────────────────────────────────────────────────
function ProfileSection({ profile, onRefresh }) {
  const [phone,   setPhone]   = useState('')
  const [toast,   setToast]   = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const{login} = useAuth()

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '')
      setUsername(profile.username || '')   // ← เพิ่ม
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

    // อัพเดท sessionStorage + context ทันที ไม่ต้อง login ใหม่
    if (res.data?.username) {
      login({ username: res.data.username, role: profile.role })
    }

    showToast('อัพเดทโปรไฟล์สำเร็จ')
    onRefresh()
  } catch (err) {
    showToast(err?.response?.data?.detail || 'อัพเดทไม่สำเร็จ', 'error')
  } finally { setLoading(false) }
}

  if (!profile) return null

  return (
    <div style={card}>
      <SectionTitle icon="👤" title="โปรไฟล์ของฉัน" />
      <Toast msg={toast.msg} type={toast.type} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={labelStyle}>ชื่อผู้ใช้</div>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            minLength={3} maxLength={32}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={labelStyle}>อีเมล</div>
          <div style={{ ...inputStyle, color: 'var(--text-3)', cursor: 'not-allowed' }}>
            {profile.email}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={labelStyle}>Role:</span>
        <RoleBadge role={profile.role} />
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {profile.auth_provider === 'google' ? '· Google Account' : '· Local Account'}
        </span>
      </div>

      <form onSubmit={handleSave}>
        <Field label="เบอร์โทรศัพท์">
          <input
            type="tel" value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0812345678" maxLength={12}
            inputMode="numeric" style={inputStyle}
          />
        </Field>
        <button type="submit" disabled={loading} className="btn-primary"
          style={{ padding: '8px 20px', fontSize: 12, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </form>
    </div>
  )
}

// ── Section: Change Password ──────────────────────────────────────────────────
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
    <div style={card}>
      <SectionTitle icon="🔑" title="เปลี่ยนรหัสผ่าน" />
      <Toast msg={toast.msg} type={toast.type} />
      <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
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
        <button type="submit" disabled={loading} className="btn-primary"
          style={{ padding: '8px 20px', fontSize: 12, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'กำลังเปลี่ยน…' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </form>
    </div>
  )
}

// ── Section: Theme ────────────────────────────────────────────────────────────
function ThemeSection() {
  const { theme, toggle } = useTheme()

  return (
    <div style={card}>
      <SectionTitle icon="🎨" title="ธีม" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {['dark', 'light'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => theme !== t && toggle()}
            style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 13,
              fontWeight: 500, cursor: 'pointer', border: '1px solid',
              borderColor: theme === t ? 'var(--blue)' : 'var(--border)',
              background:  theme === t ? 'rgba(56,139,253,0.1)' : 'var(--bg2)',
              color:       theme === t ? 'var(--blue)' : 'var(--text-2)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
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

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    username: '', email: '', phone: '', password: '', role: 'user',
  })
  const [creating, setCreating] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  const loadUsers = async () => {
    try {
      const res = await adminGetUsers()
      setUsers(res.data)
    } catch {
      showToast('โหลด users ไม่สำเร็จ', 'error')
    } finally { setLoading(false) }
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

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await adminCreateUser(form)
      showToast(`สร้าง '${form.username}' สำเร็จ`)
      setShowCreate(false)
      setForm({ username: '', email: '', phone: '', password: '', role: 'user' })
      loadUsers()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'สร้างไม่สำเร็จ', 'error')
    } finally { setCreating(false) }
  }

  const TABLE_HEADERS = ['ชื่อผู้ใช้', 'อีเมล', 'Role', 'Provider', 'สถานะ', 'จัดการ']

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle icon="👥" title="จัดการผู้ใช้" />
        <button
          type="button"
          onClick={() => setShowCreate(s => !s)}
          className="btn-primary"
          style={{ padding: '6px 16px', fontSize: 12 }}
        >
          {showCreate ? 'ยกเลิก' : '+ สร้าง User ใหม่'}
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} />

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>
            สร้าง Account สำหรับ Contractor / Vendor
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="ชื่อผู้ใช้">
              <input value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required minLength={3} maxLength={32} style={inputStyle} />
            </Field>
            <Field label="อีเมล">
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required style={inputStyle} />
            </Field>
            <Field label="เบอร์โทร">
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                required placeholder="0812345678" style={inputStyle} />
            </Field>
            <Field label="รหัสผ่าน">
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={8}
                placeholder="≥8 ตัว พิมพ์ใหญ่+เล็ก+ตัวเลข"
                style={inputStyle} />
            </Field>
          </div>
          <Field label="Role">
            <select value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ ...inputStyle, width: 'auto' }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <button type="submit" disabled={creating} className="btn-primary"
            style={{ padding: '7px 20px', fontSize: 12, opacity: creating ? 0.7 : 1 }}>
            {creating ? 'กำลังสร้าง…' : 'สร้าง Account'}
          </button>
        </form>
      )}

      {/* Users table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)', fontSize: 13 }}>
          กำลังโหลด…
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {TABLE_HEADERS.map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    color: 'var(--text-3)', fontWeight: 500,
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
                  <td style={{ padding: '10px 12px', color: 'var(--text-1)', fontWeight: 500 }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>
                    {u.email}
                  </td>
                  {/* Role — read only เท่านั้น ไม่มี dropdown */}
                  <td style={{ padding: '10px 12px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--bg3)', color: 'var(--text-3)',
                    }}>
                      {u.auth_provider || 'local'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggle(u.id)}
                      style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 20,
                        border: 'none', cursor: 'pointer', fontWeight: 600,
                        background: u.is_active ? 'rgba(63,185,80,0.15)' : 'var(--bg3)',
                        color:      u.is_active ? 'var(--green)' : 'var(--text-3)',
                      }}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      type="button"
                      onClick={() => setConfirm({ id: u.id, username: u.username })}
                      style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 6,
                        background: 'transparent', border: '1px solid var(--red)',
                        color: 'var(--red)', cursor: 'pointer',
                      }}
                    >
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

      {/* Delete confirm modal */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: 'var(--bg1)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, width: 320, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
              ยืนยันการลบ?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
              ลบ account <strong>{confirm.username}</strong> ออกจากระบบ<br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isAdmin } = useAuth()
  const [profile, setProfile] = useState(null)

  const loadProfile = async () => {
    try {
      const res = await getProfile()
      setProfile(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { loadProfile() }, [])

  const isLocal = profile?.auth_provider !== 'google'

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
          ⚙️ Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          จัดการโปรไฟล์และการตั้งค่าระบบ
        </p>
      </div>

      <ProfileSection profile={profile} onRefresh={loadProfile} />
      {isLocal && <PasswordSection />}
      <ThemeSection />

      {isAdmin && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            margin: '24px 0 16px',
            padding: '0 0 8px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--blue)',
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              Admin Zone
            </span>
          </div>
          <AdminUsersSection />
        </>
      )}
    </div>
  )
}