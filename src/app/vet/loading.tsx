export default function VetLoading() {
  return (
    <>
      <style>{`
        @keyframes pf-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .pf-sk { background:var(--pf-surface); border-radius:10px; animation:pf-pulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* Header skeleton */}
      <div style={{ marginBottom: 28 }}>
        <div className="pf-sk" style={{ height: 34, width: 220, marginBottom: 8 }} />
        <div className="pf-sk" style={{ height: 16, width: 140 }} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: 'var(--pf-white)', border: '0.5px solid var(--pf-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div className="pf-sk" style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 12 }} />
            <div className="pf-sk" style={{ height: 28, width: 48, marginBottom: 6 }} />
            <div className="pf-sk" style={{ height: 12, width: 90 }} />
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="pf-sk" style={{ height: 16, width: 120, marginBottom: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--pf-white)', border: '0.5px solid var(--pf-border)', borderRadius: 14, padding: 16 }}>
            <div className="pf-sk" style={{ width: 34, height: 34, borderRadius: 10, marginBottom: 12 }} />
            <div className="pf-sk" style={{ height: 13, width: '80%', marginBottom: 6 }} />
            <div className="pf-sk" style={{ height: 11, width: '60%' }} />
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ background: 'var(--pf-white)', borderRadius: 14, border: '0.5px solid var(--pf-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--pf-border)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="pf-sk" style={{ height: 16, width: 140 }} />
          <div className="pf-sk" style={{ height: 14, width: 70 }} />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: i > 0 ? '0.5px solid var(--pf-border)' : undefined }}>
            <div className="pf-sk" style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="pf-sk" style={{ height: 13, width: '50%', marginBottom: 6 }} />
              <div className="pf-sk" style={{ height: 11, width: '70%' }} />
            </div>
            <div className="pf-sk" style={{ height: 11, width: 40 }} />
          </div>
        ))}
      </div>
    </>
  )
}
