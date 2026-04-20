// Vet sidebar. Fixed 220px. Lucide SVG icons.
const VetSidebar = ({ active = 'dashboard', clinicName = 'Clínica Los Olivos', userName = 'Marta Ferrer' }) => {
  const items = [
    { id:'dashboard',    label:'Inicio',       icon:'home' },
    { id:'appointments', label:'Citas',        icon:'calendar' },
    { id:'pets',         label:'Mascotas',     icon:'paw' },
    { id:'records',      label:'Consultas',    icon:'clipboard' },
    { id:'invitations',  label:'Invitaciones', icon:'mail' },
    { id:'ai',           label:'IA Clínica',   icon:'sparkles', tint:'purple' },
    { id:'team',         label:'Equipo',       icon:'users' },
    { id:'billing',      label:'Facturación',  icon:'card' },
  ];
  const Icon = ({ name }) => {
    const common = { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' };
    if (name==='home')       return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>;
    if (name==='calendar')   return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    if (name==='paw')        return <svg {...common}><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><path d="M8 20a4 4 0 0 1 8 0"/></svg>;
    if (name==='clipboard')  return <svg {...common}><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></svg>;
    if (name==='mail')       return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>;
    if (name==='sparkles')   return <svg {...common}><path d="m12 3-1.9 5.8L4 10l5.8 1.9L11.9 18l1.9-5.8L20 10.3l-5.8-1.9z"/></svg>;
    if (name==='users')      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    if (name==='card')       return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
    return null;
  };
  const s = vetSidebarStyles;
  return (
    <aside style={s.aside}>
      <div style={s.head}>
        <div style={s.logo}>
          <svg width="18" height="18" viewBox="0 0 100 100"><ellipse cx="50" cy="62" rx="16" ry="13" fill="#fff"/><ellipse cx="31" cy="48" rx="8" ry="10" fill="#fff"/><ellipse cx="44" cy="40" rx="8" ry="10" fill="#fff"/><ellipse cx="57" cy="40" rx="8" ry="10" fill="#fff"/><ellipse cx="70" cy="48" rx="8" ry="10" fill="#fff"/></svg>
        </div>
        <div style={{lineHeight:1.2, minWidth:0}}>
          <div style={s.brand}>Petfhans</div>
          <div style={s.sub}>{clinicName}</div>
        </div>
      </div>
      <nav style={s.nav}>
        {items.map(it=>{
          const isActive = it.id===active;
          const color = isActive ? (it.tint==='purple' ? 'var(--pf-info-fg)' : 'var(--pf-coral)') : 'var(--pf-muted)';
          const bg = isActive ? (it.tint==='purple' ? 'var(--pf-info)' : 'var(--pf-coral-soft)') : 'transparent';
          return (
            <a key={it.id} href="#" style={{...s.item, background:bg, color, fontWeight:isActive?500:400}}>
              <Icon name={it.icon} />{it.label}
            </a>
          );
        })}
      </nav>
      <div style={s.usage}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
          <span style={{font:'var(--pf-text-sm)', color:'var(--pf-muted)'}}>Pacientes</span>
          <span style={{font:'var(--pf-text-sm)', fontWeight:600, color:'var(--pf-coral)'}}>32/50</span>
        </div>
        <div style={{height:6, background:'var(--pf-bg)', borderRadius:100, overflow:'hidden'}}>
          <div style={{width:'64%', height:'100%', background:'var(--pf-coral)', borderRadius:100}}/>
        </div>
      </div>
      <div style={s.user}>
        <div style={s.avatar}>{userName[0]}</div>
        <span style={{font:'var(--pf-text-sm)', color:'var(--pf-ink)'}}>{userName}</span>
      </div>
    </aside>
  );
};

const vetSidebarStyles = {
  aside: { width:220, background:'var(--pf-white)', borderRight:'0.5px solid var(--pf-border)', display:'flex', flexDirection:'column', height:'100vh', position:'fixed', top:0, left:0, zIndex:10 },
  head:  { display:'flex', gap:10, alignItems:'center', padding:'18px 16px', borderBottom:'0.5px solid var(--pf-border)' },
  logo:  { width:32, height:32, borderRadius:10, background:'var(--pf-coral)', display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' },
  brand: { font:'var(--pf-text-h3)', color:'var(--pf-ink)', fontSize:13 },
  sub:   { font:'var(--pf-text-sm)', fontSize:11, color:'var(--pf-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:140 },
  nav:   { flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' },
  item:  { display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, font:'var(--pf-text-body)', fontSize:13, textDecoration:'none', transition:'background 0.15s' },
  usage: { padding:'12px 16px', borderTop:'0.5px solid var(--pf-border)' },
  user:  { display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderTop:'0.5px solid var(--pf-border)' },
  avatar:{ width:28, height:28, borderRadius:'50%', background:'var(--pf-coral-soft)', color:'var(--pf-coral)', display:'flex', alignItems:'center', justifyContent:'center', font:'var(--pf-text-label)', fontSize:12, fontWeight:700 },
};

Object.assign(window, { VetSidebar });
