// Vet dashboard screen content (everything right of the sidebar)
const StatCard = ({ icon, value, label, tint='coral', delay=0 }) => {
  const tints = {
    coral:   { bg:'var(--pf-coral-soft)',   fg:'var(--pf-coral)' },
    mint:    { bg:'var(--pf-success)',       fg:'var(--pf-success-fg)' },
    amber:   { bg:'var(--pf-warning)',       fg:'var(--pf-warning-fg)' },
    purple:  { bg:'var(--pf-info)',          fg:'var(--pf-info-fg)' },
  }[tint];
  return (
    <div style={{background:'var(--pf-white)', border:'0.5px solid var(--pf-border)', borderRadius:14, padding:'18px 20px', animation:`fadeUp 0.5s ${delay}ms both`}}>
      <div style={{width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, background:tints.bg, color:tints.fg}}>
        {icon}
      </div>
      <div style={{fontFamily:'var(--pf-font-display)', fontWeight:700, fontSize:26, color:'var(--pf-ink)', lineHeight:1}}>{value}</div>
      <div style={{font:'var(--pf-text-sm)', color:'var(--pf-muted)', marginTop:3}}>{label}</div>
    </div>
  );
};

const QuickAction = ({ icon, title, desc, tint='coral' }) => {
  const tints = { coral:{bg:'var(--pf-coral-soft)', fg:'var(--pf-coral)'}, purple:{bg:'var(--pf-info)', fg:'var(--pf-info-fg)'} }[tint];
  const [hover, setHover] = React.useState(false);
  return (
    <a href="#" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
       style={{background:'var(--pf-white)', border:`0.5px solid ${hover?'var(--pf-coral-mid)':'var(--pf-border)'}`, borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:10, textDecoration:'none', transition:'all 0.2s', boxShadow:hover?'0 2px 16px rgba(238,114,109,.09)':'none', cursor:'pointer'}}>
      <div style={{width:34, height:34, borderRadius:10, background:tints.bg, color:tints.fg, display:'flex', alignItems:'center', justifyContent:'center'}}>{icon}</div>
      <div>
        <div style={{font:'var(--pf-text-h3)'}}>{title}</div>
        <p style={{font:'var(--pf-text-sm)', color:'var(--pf-muted)', margin:'2px 0 0'}}>{desc}</p>
      </div>
    </a>
  );
};

const RecentRow = ({ species, name, reason, date }) => {
  const sp = {dog:'🐶', cat:'🐱', rabbit:'🐰', other:'🐾'}[species] || '🐾'; // species emoji OK inside user-data, not nav
  const [hover, setHover] = React.useState(false);
  return (
    <a href="#" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
       style={{display:'flex', alignItems:'center', gap:12, padding:'14px 20px', textDecoration:'none', background:hover?'var(--pf-bg)':'transparent', transition:'background 0.15s', borderTop:'0.5px solid var(--pf-border)'}}>
      <div style={{width:36, height:36, borderRadius:12, background:'var(--pf-surface)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>{sp}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{font:'var(--pf-text-body)', fontWeight:500, color:'var(--pf-ink)'}}>{name}</div>
        <div style={{font:'var(--pf-text-sm)', color:'var(--pf-muted)', marginTop:2}}>{reason}</div>
      </div>
      <span style={{font:'var(--pf-text-sm)', color:'var(--pf-muted)'}}>{date}</span>
      <span style={{color:'var(--pf-hint)'}}>›</span>
    </a>
  );
};

const VetDashboard = ({ firstName = 'Marta' }) => {
  const today = new Date(2026, 3, 20);
  const date = today.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
  const I = (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;

  return (
    <main style={{marginLeft:220, padding:'32px 40px', minHeight:'100vh'}}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>

      <header style={{marginBottom:28}}>
        <h1 style={{font:'var(--pf-text-display)', margin:0, letterSpacing:'-0.01em'}}>Hola, {firstName}</h1>
        <p style={{font:'var(--pf-text-body)', color:'var(--pf-muted)', margin:'6px 0 0', textTransform:'capitalize'}}>{date}</p>
      </header>

      <section style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24}}>
        <StatCard tint="coral"  delay={0}   value="32"  label="Pacientes activos"      icon={I(<><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><path d="M8 20a4 4 0 0 1 8 0"/></>)} />
        <StatCard tint="mint"   delay={80}  value="47"  label="Consultas esta semana" icon={I(<><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>)} />
        <StatCard tint="amber"  delay={160} value="5"   label="Invitaciones activas"   icon={I(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>)} />
      </section>

      <h2 style={{font:'var(--pf-text-h2)', margin:'0 0 12px'}}>Acciones rápidas</h2>
      <section style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28}}>
        <QuickAction title="Nueva mascota"  desc="Registrar paciente" icon={I(<><path d="M12 5v14M5 12h14"/></>)} />
        <QuickAction title="Nueva consulta" desc="Registrar consulta" icon={I(<><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></>)} />
        <QuickAction title="Invitar dueño"  desc="Enviar link acceso" icon={I(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>)} />
        <QuickAction title="IA Clínica"     desc="Análisis con IA"    tint="purple" icon={I(<><path d="m12 3-1.9 5.8L4 10l5.8 1.9L11.9 18l1.9-5.8L20 10.3l-5.8-1.9z"/></>)} />
      </section>

      <section style={{background:'var(--pf-white)', borderRadius:14, border:'0.5px solid var(--pf-border)', overflow:'hidden'}}>
        <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px'}}>
          <h3 style={{font:'var(--pf-text-h3)', margin:0}}>Consultas recientes</h3>
          <a href="#" style={{font:'var(--pf-text-accent)', color:'var(--pf-coral)', textDecoration:'none'}}>Ver todas →</a>
        </header>
        <RecentRow species="dog"    name="Luna"      reason="Revisión anual · vacuna quíntuple"   date="20 abr" />
        <RecentRow species="cat"    name="Miso"      reason="Consulta dermatológica"              date="19 abr" />
        <RecentRow species="dog"    name="Chispa"    reason="Control post-cirugía"                date="18 abr" />
        <RecentRow species="rabbit" name="Trufa"     reason="Limado dental rutinario"             date="17 abr" />
        <RecentRow species="dog"    name="Bruno"     reason="Desparasitación"                     date="16 abr" />
      </section>
    </main>
  );
};

Object.assign(window, { VetDashboard, StatCard, QuickAction, RecentRow });
