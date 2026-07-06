import Sidebar from '../components/layout/Sidebar'

const S = {
  page: { display: 'flex', minHeight: '100vh', background: 'var(--bg0)' },
  content: { flex: 1, minWidth: 0, padding: '24px 20px 80px' },
  h1: { fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)', margin: 0 },
  sub: { fontSize: 12, color: 'var(--text-3)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' },
  section: { background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  secHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' },
  secBody: { padding: '16px' },
  badge: (color) => ({
    display: 'inline-block', background: color + '22', color, border: `1px solid ${color}44`,
    borderRadius: 5, fontSize: 10, fontWeight: 700, padding: '2px 7px',
    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em', whiteSpace: 'nowrap',
  }),
  iconBox: (color) => ({
    width: 28, height: 28, minWidth: 28, borderRadius: 6,
    background: color + '22', border: `1px solid ${color}44`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color,
  }),
  row: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 },
  desc: { fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 },
  tip: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 },
  pill: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: color + '15', border: `1px solid ${color}30`,
    borderRadius: 20, fontSize: 11, padding: '3px 10px', color,
  }),
  divider: { borderTop: '1px solid var(--border)', margin: '12px 0' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' },
}

function SectionHead({ icon, title, color, badge }) {
  return (
    <div style={S.secHead}>
      <div style={S.iconBox(color)}>
        <i className={`ti ${icon}`} style={{ fontSize: 15 }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{title}</span>
      {badge && <span style={S.badge(color)}>{badge}</span>}
    </div>
  )
}

function FeatureRow({ icon, color = 'var(--blue)', title, children }) {
  return (
    <div style={S.row}>
      <div style={{ ...S.iconBox(color), marginTop: 1 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={S.label}>{title}</div>
        <div style={S.desc}>{children}</div>
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div style={S.page}>
      <Sidebar />
      <div style={S.content}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={S.h1}>คู่มือการใช้งาน</h1>
          <p style={S.sub}>NH₃ Refrigeration SCADA — User Manual</p>
        </div>

        {/* Quick Nav */}
        <div style={{ ...S.section, marginBottom: 20 }}>
          <div style={S.secHead}>
            <i className="ti ti-list" style={{ fontSize: 15, color: 'var(--text-3)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>สารบัญ</span>
          </div>
          <div style={{ ...S.secBody, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['#dashboard', 'ti-layout-dashboard', 'Dashboard', 'var(--blue)'],
              ['#history',   'ti-history',           'History',   'var(--green)'],
              ['#input',     'ti-pencil',             'Input',     'var(--amber)'],
              ['#ph',        'ti-chart-dots',         'P-H Diagram','var(--cyan)'],
              ['#calc',      'ti-calculator',         'Calculator','var(--purple)'],
              ['#settings',  'ti-settings',           'Settings',  'var(--text-2)'],
            ].map(([href, icon, label, color]) => (
              <a key={href} href={href} style={{ ...S.pill(color), textDecoration: 'none' }}>
                <i className={`ti ${icon}`} style={{ fontSize: 13 }} />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Overview */}
        <div style={S.section}>
          <SectionHead icon="ti-info-circle" title="ภาพรวมระบบ" color="var(--cyan)" />
          <div style={S.secBody}>
            <div style={S.desc}>
              ระบบ SCADA นี้ใช้สำหรับ <strong style={{ color: 'var(--text-1)' }}>ติดตามและวิเคราะห์ระบบทำความเย็นแอมโมเนีย (NH₃)</strong> ของ CPF แบบ Real-time
              ประกอบด้วยการแสดงผล KPI, กราฟประวัติ, คำนวณสมรรถนะ และ P-H Diagram
            </div>
            <div style={{ ...S.divider }} />
            <div style={S.grid2}>
              <div style={S.card}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>BACKEND</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)' }}>FastAPI + CoolProp / IIR tables</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>คำนวณ thermodynamics ทั้งหมดฝั่ง server</div>
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>DATA</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)' }}>Real-time + Historical</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>ข้อมูลจาก compressor COMP-01 (NH₃ chiller)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div id="dashboard" style={S.section}>
          <SectionHead icon="ti-layout-dashboard" title="Dashboard" color="var(--blue)" badge="/dashboard" />
          <div style={S.secBody}>
            <FeatureRow icon="ti-gauge" color="var(--blue)" title="KPI Cards — ตัวชี้วัดหลัก">
              แสดงค่า Real-time จากระบบ: <strong>P_comp (kW)</strong>, <strong>COP</strong>, <strong>Q_e Cooling (kW/TR)</strong>, <strong>Mass Flow (kg/h)</strong>
              อัพเดตอัตโนมัติตามรอบ polling ของระบบ ไฟสีแดงใน header = ข้อมูลล่าสุดเกิน 5 นาที
            </FeatureRow>
            <FeatureRow icon="ti-topology-bus" color="var(--cyan)" title="Fleet Overview — แผนผังระบบ">
              แสดง schematic ของ compressor, evaporator, condenser พร้อมค่าแต่ละจุด
              สีของ indicator แสดงสถานะ: <span style={S.badge('var(--green)')}>เขียว = OK</span>{' '}
              <span style={S.badge('var(--amber)')}>เหลือง = Warning</span>{' '}
              <span style={S.badge('var(--red)')}>แดง = Alarm</span>
            </FeatureRow>
            <FeatureRow icon="ti-bell" color="var(--amber)" title="Alarm Panel — รายการแจ้งเตือน">
              รายการ alarm/warning ที่ active อยู่ เรียงตาม severity
              คลิก acknowledge เพื่อรับทราบ (ต้องการสิทธิ์ operator ขึ้นไป)
            </FeatureRow>
            <div style={{ ...S.tip, marginTop: 4 }}>
              <strong>💡 Live indicator</strong> มุมซ้ายบน Sidebar: <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span> = backend ตอบสนองปกติ &nbsp;|&nbsp;
              <span style={{ color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>ERR</span> = ตรวจสอบการเชื่อมต่อ
            </div>
          </div>
        </div>

        {/* History */}
        <div id="history" style={S.section}>
          <SectionHead icon="ti-history" title="History — ประวัติข้อมูล" color="var(--green)" badge="/history" />
          <div style={S.secBody}>
            <FeatureRow icon="ti-calendar" color="var(--green)" title="เลือกช่วงเวลา">
              กำหนด <strong>Start date / End date</strong> หรือเลือกช่วงสำเร็จรูป (24h, 7d, 30d)
              ข้อมูลจะแสดงผลในกราฟ trend ทันทีหลังกด Apply
            </FeatureRow>
            <FeatureRow icon="ti-chart-line" color="var(--green)" title="Trend Charts — กราฟแนวโน้ม">
              กราฟ interactive ของค่าต่างๆ เช่น SP, DP, Current, P_comp, COP
              hover บนกราฟเพื่อดูค่าแบบ tooltip — ซูม/pan ได้ด้วย scroll หรือ drag
            </FeatureRow>
            <FeatureRow icon="ti-download" color="var(--green)" title="Export ข้อมูล">
              ดาวน์โหลดข้อมูลเป็น <strong>CSV</strong> หรือ <strong>Excel (.xlsx)</strong>
              ข้อมูลที่ export ตรงกับช่วงเวลาที่เลือกไว้
            </FeatureRow>
          </div>
        </div>

        {/* Manual Input */}
        <div id="input" style={S.section}>
          <SectionHead icon="ti-pencil" title="Input — บันทึกข้อมูลด้วยมือ" color="var(--amber)" badge="/input" />
          <div style={S.secBody}>
            <FeatureRow icon="ti-forms" color="var(--amber)" title="Manual Data Entry">
              บันทึกค่าที่อ่านได้จากหน้างาน เช่น SP, DP, Current, อุณหภูมิต่างๆ
              ใช้เมื่อ sensor ขาดหายหรือต้องการบันทึกค่าเสริมจากการตรวจสอบ
            </FeatureRow>
            <FeatureRow icon="ti-lock" color="var(--amber)" title="สิทธิ์การใช้งาน">
              ต้องล็อกอินด้วยบัญชีที่มีสิทธิ์ <span style={S.badge('var(--amber)')}>Operator</span> หรือ{' '}
              <span style={S.badge('var(--red)')}>Admin</span> จึงจะบันทึกข้อมูลได้
            </FeatureRow>
            <div style={S.tip}>
              <strong>หมายเหตุ:</strong> ข้อมูลที่บันทึกจากหน้านี้จะถูกเก็บในฐานข้อมูลเดียวกับข้อมูล real-time
              และจะปรากฏใน History พร้อมแท็ก <code style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}>source=manual</code>
            </div>
          </div>
        </div>

        {/* P-H Diagram */}
        <div id="ph" style={S.section}>
          <SectionHead icon="ti-chart-dots" title="P-H Diagram" color="var(--cyan)" badge="/ph-diagram" />
          <div style={S.secBody}>
            <FeatureRow icon="ti-wave-sine" color="var(--cyan)" title="Saturation Dome — NH₃">
              แสดง P-H diagram ของ NH₃ พร้อม saturation dome (เส้นโค้งสมดุล liquid/vapor)
              แกน X = Enthalpy h [kJ/kg], แกน Y = Pressure P [MPa] (log scale)
            </FeatureRow>
            <FeatureRow icon="ti-circles-relation" color="var(--cyan)" title="Cycle Overlay — วงจรการทำงาน">
              วงจรปัจจุบันของ compressor จะถูก plot ทับบน dome แบบ real-time
              เส้นสีส้ม = วงจรจริง, เส้นประ = isentropic ideal (single-stage)
            </FeatureRow>
            <FeatureRow icon="ti-cursor-text" color="var(--cyan)" title="Hover / Click จุดบน Diagram">
              คลิกที่จุดใดๆ บน diagram เพื่อดูค่า h, P, T ณ จุดนั้น
              จุด 1–4 (หรือ 1–7 สำหรับ two-stage) จะมีป้ายกำกับ
            </FeatureRow>
          </div>
        </div>

        {/* Calculator */}
        <div id="calc" style={S.section}>
          <SectionHead icon="ti-calculator" title="Calculator — คำนวณสมรรถนะ" color="var(--purple)" badge="/calculator" />
          <div style={S.secBody}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={S.badge('var(--blue)')}>Single-Stage</span>
              <span style={S.badge('var(--purple)')}>Two-Stage</span>
              <span style={S.badge('var(--cyan)')}>Formulas</span>
            </div>

            <FeatureRow icon="ti-number-1" color="var(--blue)" title="Single-Stage — ระบบ 1 คอมเพรสเซอร์">
              <strong>Input ที่จำเป็น:</strong> Current I (A), SP (kg/cm²g), DP (kg/cm²g)<br />
              <strong>Input เสริม:</strong> ST (Suction Temp), DT (Discharge Temp), Liquid Temp<br />
              หากไม่กรอกอุณหภูมิ ระบบจะ assume: SH=5K, η<sub>is</sub>=0.70, SC=0
            </FeatureRow>

            <FeatureRow icon="ti-number-2" color="var(--purple)" title="Two-Stage — ระบบ 2 คอมเพรสเซอร์">
              <strong>Low Stage:</strong> I_booster, SP, ST (optional), DT_booster (optional)<br />
              <strong>Intermediate:</strong> T_int (อุณหภูมิ inter-tank, default = −7°C)<br />
              <strong>High Stage:</strong> I_high, DP, DT_high (optional), Liquid Temp (optional)<br />
              ผลลัพธ์รวม: COP_system, Q_e, W_total, mass flow ratio
            </FeatureRow>

            <FeatureRow icon="ti-function" color="var(--cyan)" title="Formulas — อ้างอิงสูตรคำนวณ">
              Tab "Formulas" แสดงสูตรทั้งหมดที่ใช้ในการคำนวณ พร้อมคำอธิบาย
              เหมาะสำหรับตรวจสอบที่มาของค่า หรือใช้เป็น reference ทางวิศวกรรม
            </FeatureRow>

            <FeatureRow icon="ti-chart-scatter" color="var(--orange)" title="P-H Mini Chart">
              ผลลัพธ์การคำนวณจะแสดง P-H diagram แบบ inline ใต้ผลลัพธ์ทันที
              เปรียบเทียบวงจรจริง vs isentropic ideal ได้โดยตรง
            </FeatureRow>

            <div style={S.tip}>
              <strong>Badge สี:</strong>&nbsp;
              <span style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>MEASURED</span> = ใช้ค่าที่กรอก &nbsp;|&nbsp;
              <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>ASSUMED</span> = ระบบ assume ค่าอัตโนมัติ
            </div>
          </div>
        </div>

        {/* Settings */}
        <div id="settings" style={S.section}>
          <SectionHead icon="ti-settings" title="Settings — ตั้งค่าระบบ" color="var(--text-2)" badge="/settings" />
          <div style={S.secBody}>
            <FeatureRow icon="ti-user" color="var(--text-2)" title="Profile — ข้อมูลบัญชี">
              ดูชื่อผู้ใช้, อีเมล, role และเปลี่ยน avatar ได้จากหน้านี้
            </FeatureRow>
            <FeatureRow icon="ti-sun" color="var(--amber)" title="Theme — ธีมสีหน้าจอ">
              สลับระหว่าง <strong>Dark mode</strong> (default) และ <strong>Light mode</strong>
              การตั้งค่าจะถูกจดจำในเบราว์เซอร์
            </FeatureRow>
            <FeatureRow icon="ti-users" color="var(--text-2)" title="User Management (Admin only)">
              ผู้ดูแลระบบสามารถเพิ่ม/ลบผู้ใช้ และเปลี่ยน role ได้
              Role ที่มี: <span style={S.badge('var(--text-2)')}>viewer</span>{' '}
              <span style={S.badge('var(--amber)')}>operator</span>{' '}
              <span style={S.badge('var(--red)')}>admin</span>
            </FeatureRow>
          </div>
        </div>

        {/* Navigation Guide */}
        <div style={S.section}>
          <SectionHead icon="ti-keyboard" title="การนำทาง" color="var(--text-3)" />
          <div style={S.secBody}>
            <div style={S.grid2}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>Desktop / Tablet</div>
                <FeatureRow icon="ti-layout-sidebar" color="var(--text-3)" title="Sidebar ซ้าย">
                  คลิกปุ่ม <i className="ti ti-chevrons-left" /> มุมล่างซ้ายเพื่อซ่อน/ขยาย sidebar
                  เมื่อซ่อนแล้วจะเห็นเฉพาะ icon เมนู
                </FeatureRow>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>Mobile</div>
                <FeatureRow icon="ti-layout-bottombar" color="var(--text-3)" title="Bottom Navigation Bar">
                  เมนูจะแสดงที่ด้านล่างหน้าจอ คลิกปุ่ม <strong>Me</strong> มุมขวาสุดเพื่อออกจากระบบ
                </FeatureRow>
              </div>
            </div>
          </div>
        </div>

        {/* Version */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 8 }}>
          NH₃ Refrigeration SCADA · CPF · 2025
        </div>

      </div>
    </div>
  )
}
