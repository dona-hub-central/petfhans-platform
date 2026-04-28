export default function AdminLoading() {
  return (
    <>
      <style>{`
        @keyframes pf-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .pf-sk { background:var(--pf-surface); border-radius:8px; animation:pf-pulse 1.6s ease-in-out infinite; }
      `}</style>

      <div className="adm-pg">
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="pf-sk" style={{ height: 28, width: 200, marginBottom: 8 }} />
            <div className="pf-sk" style={{ height: 14, width: 120 }} />
          </div>
          <div className="pf-sk" style={{ height: 36, width: 110, borderRadius: 10 }} />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[80, 110, 130].map(w => (
            <div key={w} className="pf-sk" style={{ height: 30, width: w, borderRadius: 100 }} />
          ))}
        </div>

        {/* Table */}
        <div style={{ background: 'var(--pf-white)', borderRadius: 16, border: '0.5px solid var(--pf-border)', overflow: 'hidden' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderTop: i > 0 ? '0.5px solid var(--pf-border)' : undefined }}>
              <div className="pf-sk" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="pf-sk" style={{ height: 13, width: '40%', marginBottom: 6 }} />
                <div className="pf-sk" style={{ height: 11, width: '60%' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="pf-sk" style={{ height: 24, width: 70, borderRadius: 100 }} />
                <div className="pf-sk" style={{ height: 24, width: 60, borderRadius: 100 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
