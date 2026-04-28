export default function OwnerLoading() {
  return (
    <>
      <style>{`
        @keyframes pf-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .pf-sk { background:rgba(255,255,255,.35); border-radius:10px; animation:pf-pulse 1.6s ease-in-out infinite; }
        .pf-sk-light { background:var(--pf-surface); border-radius:10px; animation:pf-pulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* Hero skeleton */}
      <div style={{ background: 'linear-gradient(170deg,var(--pf-coral) 0%,#f9a394 100%)', padding: 'calc(env(safe-area-inset-top) + 20px) 18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="pf-sk" style={{ height: 14, width: 90, marginBottom: 8 }} />
            <div className="pf-sk" style={{ height: 30, width: 160, marginBottom: 8 }} />
            <div className="pf-sk" style={{ height: 13, width: 110 }} />
          </div>
          <div className="pf-sk" style={{ width: 46, height: 46, borderRadius: '50%' }} />
        </div>
      </div>

      {/* Body skeleton */}
      <div style={{ padding: '16px 14px' }}>
        <div className="pf-sk-light" style={{ height: 38, width: 150, borderRadius: 10, marginBottom: 20 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="pf-sk-light" style={{ height: 22, width: 130 }} />
          <div className="pf-sk-light" style={{ height: 32, width: 80, borderRadius: 10 }} />
        </div>

        {/* Pet cards */}
        {[0, 1].map(i => (
          <div key={i} style={{ background: 'var(--pf-white)', borderRadius: 20, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, border: '0.5px solid var(--pf-border)' }}>
            <div className="pf-sk-light" style={{ width: 62, height: 62, borderRadius: 18, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="pf-sk-light" style={{ height: 18, width: '55%', marginBottom: 8 }} />
              <div className="pf-sk-light" style={{ height: 12, width: '75%', marginBottom: 8 }} />
              <div className="pf-sk-light" style={{ height: 20, width: 90, borderRadius: 100 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
