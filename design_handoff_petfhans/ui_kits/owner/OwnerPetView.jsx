// Owner portal — mobile-first pet detail view
const OwnerHero = ({ petName='Luna', species='Perro', breed='Labrador', weight='18 kg', onTabChange, tab='info' }) => {
  const Icon = ({ name }) => {
    const c = { width:17, height:17, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' };
    if (name==='paw')       return <svg {...c}><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><path d="M8 20a4 4 0 0 1 8 0"/></svg>;
    if (name==='cal')       return <svg {...c}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    if (name==='cam')       return <svg {...c}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    if (name==='doc')       return <svg {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
    if (name==='hist')      return <svg {...c}><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></svg>;
    return null;
  };
  const tabs = [
    ['info','paw','Ficha'],
    ['citas','cal','Citas'],
    ['galeria','cam','Galería'],
    ['docs','doc','Docs'],
    ['historial','hist','Historial'],
  ];
  return (
    <div style={{background:'linear-gradient(170deg,#EE726D 0%,#f9a394 100%)'}}>
      <div style={{padding:'20px 18px 0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <a href="#" style={{color:'rgba(255,255,255,.95)', textDecoration:'none', font:'var(--pf-text-accent)'}}>‹ Mis mascotas</a>
        <button style={{background:'transparent', border:'1.5px solid rgba(255,255,255,.5)', color:'#fff', borderRadius:20, padding:'5px 14px', font:'var(--pf-text-accent)', fontSize:13, cursor:'pointer'}}>Cerrar sesión</button>
      </div>
      <div style={{padding:'16px 18px 0', display:'flex', gap:14, alignItems:'flex-end'}}>
        <div style={{width:84, height:84, borderRadius:28, background:'rgba(255,255,255,.18)', border:'3px solid rgba(255,255,255,.8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40}}>🐕</div>
        <div style={{flex:1, paddingBottom:16}}>
          <h1 style={{fontFamily:'var(--pf-font-display)', fontWeight:700, fontSize:30, color:'#fff', margin:'0 0 3px', letterSpacing:'-0.01em'}}>{petName}</h1>
          <p style={{fontSize:13, color:'rgba(255,255,255,.85)', margin:'0 0 8px'}}>{species} · {breed} · {weight}</p>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,255,255,.22)', color:'#fff', fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:20}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Próxima visita 12 mayo
          </span>
        </div>
      </div>
      <div style={{display:'flex', background:'rgba(0,0,0,.15)', marginTop:12}}>
        {tabs.map(([k, ic, l])=>{
          const active = k===tab;
          return (
            <button key={k} onClick={()=>onTabChange&&onTabChange(k)}
              style={{flex:1, border:'none', background:'none', cursor:'pointer', color: active?'#fff':'rgba(255,255,255,.6)', padding:'11px 6px 9px', fontSize:11, fontWeight:600, fontFamily:'inherit', borderBottom:'2.5px solid '+(active?'#fff':'transparent'), display:'flex', flexDirection:'column', alignItems:'center', gap:3}}>
              <Icon name={ic}/>{l}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const OwnerInfoTab = () => (
  <div style={{padding:'14px', display:'flex', flexDirection:'column', gap:10}}>
    <div style={{background:'#fff', borderRadius:18, overflow:'hidden'}}>
      <p style={{font:'var(--pf-text-label)', textTransform:'uppercase', color:'var(--pf-muted)', padding:'14px 16px 0', margin:0, letterSpacing:'.07em', fontSize:10.5}}>Datos</p>
      {[['Especie','Perro'],['Raza','Labrador'],['Sexo','♀ Hembra'],['Edad','4 años'],['Peso','18 kg'],['Castrada','Sí ✓'],['Microchip','985-121-000-xxxx']].map(([l,v], i)=>(
        <div key={l} style={{display:'flex', justifyContent:'space-between', padding:'10px 16px', borderTop: i===0?'none':'1px solid #f2f2f7', fontSize:14}}>
          <span style={{color:'var(--pf-muted)'}}>{l}</span>
          <span style={{fontWeight:600, color:'var(--pf-ink)'}}>{v}</span>
        </div>
      ))}
    </div>
    <div style={{background:'var(--pf-coral-soft)', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', gap:12}}>
      <div style={{width:44, height:44, borderRadius:14, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--pf-coral)'}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      </div>
      <div style={{flex:1}}>
        <p style={{fontSize:11, color:'var(--pf-coral-dark)', fontWeight:700, margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'.07em'}}>Próxima visita</p>
        <p style={{fontSize:15, fontWeight:700, color:'var(--pf-ink)', margin:0}}>martes, 12 de mayo</p>
      </div>
    </div>
    <div style={{background:'#fff', borderRadius:18, padding:'14px 16px', display:'flex', alignItems:'center', gap:10}}>
      <div style={{width:36, height:36, borderRadius:12, background:'var(--pf-surface)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--pf-muted)'}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13"/><path d="M10 21v-6h4v6"/></svg>
      </div>
      <div>
        <p style={{fontSize:10.5, color:'var(--pf-muted)', margin:'0 0 1px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em'}}>Centro</p>
        <p style={{fontSize:14, fontWeight:700, color:'var(--pf-ink)', margin:0}}>Clínica Los Olivos</p>
      </div>
    </div>
  </div>
);

const OwnerHistTab = () => {
  const records = [
    { date:'15 abr 2026', vet:'Dr/a. Marta', reason:'Revisión anual', dx:'Todo en orden', next:'12 mayo' },
    { date:'02 feb 2026', vet:'Dr/a. Luis',  reason:'Vacuna antirrábica', dx:'Administrada', tx:'Sin reacción' },
    { date:'18 nov 2025', vet:'Dr/a. Marta', reason:'Consulta dermatológica', dx:'Dermatitis leve', tx:'Crema tópica 7 días' },
  ];
  return (
    <div style={{padding:14, display:'flex', flexDirection:'column', gap:8}}>
      <button style={{border:'2px solid var(--pf-coral)', background:'#fff', color:'var(--pf-coral)', borderRadius:18, padding:'13px 16px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>+ Añadir observación</button>
      {records.map((r, i) => (
        <div key={i} style={{background:'#fff', borderRadius:18, padding:'14px 16px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7}}>
            <span style={{background:'var(--pf-coral-soft)', color:'var(--pf-coral)', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20}}>{r.date}</span>
            <span style={{fontSize:11, color:'var(--pf-muted)'}}>{r.vet}</span>
          </div>
          <p style={{fontSize:15, fontWeight:700, color:'var(--pf-ink)', margin:'0 0 4px'}}>{r.reason}</p>
          {r.dx && <p style={{fontSize:12, color:'var(--pf-muted)', margin:'2px 0'}}>Diagnóstico: {r.dx}</p>}
          {r.tx && <p style={{fontSize:12, color:'var(--pf-muted)', margin:'2px 0'}}>Tratamiento: {r.tx}</p>}
          {r.next && <p style={{fontSize:12, color:'var(--pf-coral)', fontWeight:600, margin:'8px 0 0'}}>Próxima: {r.next}</p>}
        </div>
      ))}
    </div>
  );
};

const OwnerCitasTab = () => (
  <div style={{padding:14}}>
    <div style={{background:'#fff', borderRadius:18, padding:20}}>
      <p style={{font:'var(--pf-text-label)', textTransform:'uppercase', color:'var(--pf-muted)', margin:'0 0 14px', letterSpacing:'.07em'}}>Agendar nueva cita</p>
      <label style={{display:'block', fontSize:12.5, fontWeight:500, color:'var(--pf-ink)', marginBottom:6}}>Motivo</label>
      <input className="pf-input" placeholder="Revisión, vacuna, dermatología…" style={{marginBottom:14}}/>
      <label style={{display:'block', fontSize:12.5, fontWeight:500, color:'var(--pf-ink)', marginBottom:6}}>Fecha</label>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14}}>
        {['lun 22','mar 23','mié 24'].map((d,i)=>(
          <button key={d} style={{padding:'14px 10px', borderRadius:14, border:i===1?'2px solid var(--pf-coral)':'0.5px solid var(--pf-border)', background:i===1?'var(--pf-coral-soft)':'#fff', color:i===1?'var(--pf-coral-dark)':'var(--pf-ink)', fontWeight:600, cursor:'pointer', fontFamily:'inherit'}}>{d}</button>
        ))}
      </div>
      <label style={{display:'block', fontSize:12.5, fontWeight:500, color:'var(--pf-ink)', marginBottom:6}}>Hora</label>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:18}}>
        {['09:00','10:00','11:30','16:00'].map((t,i)=>(
          <button key={t} style={{padding:'10px 4px', borderRadius:10, border:'0.5px solid var(--pf-border)', background: i===2?'var(--pf-coral-soft)':'#fff', color:i===2?'var(--pf-coral-dark)':'var(--pf-ink)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit'}}>{t}</button>
        ))}
      </div>
      <button className="pf-btn pf-btn-primary pf-btn-lg" style={{width:'100%', justifyContent:'center'}}>Confirmar cita</button>
    </div>
  </div>
);

const OwnerPetView = () => {
  const [tab, setTab] = React.useState('info');
  return (
    <div style={{maxWidth:420, margin:'0 auto', minHeight:'100vh', background:'#f2f2f7', display:'flex', flexDirection:'column'}}>
      <OwnerHero tab={tab} onTabChange={setTab}/>
      <div style={{flex:1}}>
        {tab==='info' && <OwnerInfoTab/>}
        {tab==='historial' && <OwnerHistTab/>}
        {tab==='citas' && <OwnerCitasTab/>}
        {tab==='galeria' && <div style={{padding:40, textAlign:'center'}}><p style={{color:'var(--pf-muted)'}}>Galería vacía aún</p></div>}
        {tab==='docs' && <div style={{padding:40, textAlign:'center'}}><p style={{color:'var(--pf-muted)'}}>Sin documentos</p></div>}
      </div>
      <div style={{position:'sticky', bottom:0, padding:'12px 14px', background:'linear-gradient(to top,#f2f2f7 70%,transparent)'}}>
        <button className="pf-btn pf-btn-primary pf-btn-lg" style={{width:'100%', justifyContent:'center', borderRadius:16, padding:'15px', fontWeight:700}}>Agendar consulta</button>
      </div>
    </div>
  );
};

Object.assign(window, { OwnerHero, OwnerInfoTab, OwnerHistTab, OwnerCitasTab, OwnerPetView });
