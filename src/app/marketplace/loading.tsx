export default function MarketplaceLoading() {
  return (
    <>
      <style>{`
        @keyframes pf-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .pf-sk { background:var(--pf-surface); border-radius:10px; animation:pf-pulse 1.6s ease-in-out infinite; }
      `}</style>

      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div className="pf-sk" style={{ height: 28, width: 180, marginBottom: 8 }} />
        <div className="pf-sk" style={{ height: 14, width: 260, marginBottom: 20 }} />

        {/* Search */}
        <div className="pf-sk" style={{ height: 44, borderRadius: 12, marginBottom: 16 }} />

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[90, 110, 80].map(w => (
            <div key={w} className="pf-sk" style={{ height: 30, width: w, borderRadius: 100 }} />
          ))}
        </div>

        {/* Cards */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--pf-white)', borderRadius: 16, border: '0.5px solid var(--pf-border)', padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="pf-sk" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="pf-sk" style={{ height: 14, width: '50%', marginBottom: 8 }} />
              <div className="pf-sk" style={{ height: 11, width: '75%' }} />
            </div>
            <div className="pf-sk" style={{ height: 28, width: 70, borderRadius: 100 }} />
          </div>
        ))}
      </div>
    </>
  )
}
