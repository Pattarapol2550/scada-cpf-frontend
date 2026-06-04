import Navbar from '../components/layout/Navbar'

export default function HistoryPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <Navbar />
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '40px 20px' }}>
        <div className="panel" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>History Page</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            ดูข้อมูลย้อนหลัง · filter ช่วงวันที่ · export CSV
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 16, fontFamily: 'monospace' }}>
            🚧 coming soon
          </div>
        </div>
      </div>
    </div>
  )
}
