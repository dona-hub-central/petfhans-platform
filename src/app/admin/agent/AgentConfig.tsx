'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

const MODELS = [
  { value: 'gpt-4o',       label: 'GPT-4o',       desc: 'Más potente, ideal para análisis complejos' },
  { value: 'gpt-4o-mini',  label: 'GPT-4o Mini',  desc: 'Más rápido y económico' },
  { value: 'gpt-4-turbo',  label: 'GPT-4 Turbo',  desc: 'Alto rendimiento' },
  { value: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo',desc: 'Económico para consultas simples' },
]

const DEFAULT_SKILLS = [
  'Diagnóstico diferencial veterinario',
  'Análisis de historial clínico completo',
  'Recomendaciones de tratamiento y medicación',
  'Respuesta a preguntas de dueños de mascotas',
  'Detección de casos urgentes',
  'Comparativa entre casos similares',
]

type Agent = {
  id: string; name: string
  openai_api_key: string | null; model: string
  system_prompt: string | null; skills: string[]
  is_active: boolean; temperature: number
}

export default function AgentConfig({ agent: initial }: { agent: Agent | null }) {
  const [form, setForm] = useState({
    name:            initial?.name ?? 'Dr. Petfhans',
    openai_api_key:  initial?.openai_api_key ?? '',
    model:           initial?.model ?? 'gpt-4o',
    system_prompt:   initial?.system_prompt ?? '',
    skills:          initial?.skills ?? DEFAULT_SKILLS,
    is_active:       initial?.is_active ?? false,
    temperature:     initial?.temperature ?? 0.7,
  })
  const [newSkill, setNewSkill] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [activeTab, setActiveTab] = useState<'config' | 'chat'>('config')
  const [chatMessages, setChatMessages] = useState<{role:string;content:string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  type AgentForm = typeof form
  const set = <K extends keyof AgentForm>(k: K, v: AgentForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const addSkill = () => {
    if (!newSkill.trim()) return
    set('skills', [...form.skills, newSkill.trim()])
    setNewSkill('')
  }
  const removeSkill = (i: number) => set('skills', form.skills.filter((_, idx) => idx !== i))

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    const supabase = createClient()
    const { error: err } = await supabase.from('ai_agent').upsert({
      id: 'default',
      name:           form.name,
      openai_api_key: form.openai_api_key || null,
      model:          form.model,
      system_prompt:  form.system_prompt,
      skills:         form.skills,
      is_active:      form.is_active,
      temperature:    form.temperature,
      updated_at:     new Date().toISOString(),
    })
    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const testAgent = async () => {
    if (!form.openai_api_key) { setTestResult('❌ Introduce primero la API key'); return }
    setTesting(true); setTestResult('')
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: '¿Estás operativo? Responde brevemente.', test: true }),
      })
      const data = await res.json()
      setTestResult(res.ok ? `✅ ${data.reply}` : `❌ ${data.error}`)
    } catch (e) {
      setTestResult('❌ Error de conexión: ' + (e instanceof Error ? e.message : String(e)))
    }
    setTesting(false)
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, history: chatMessages }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Error' }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: ' + (e instanceof Error ? e.message : String(e)) }])
    }
    setChatLoading(false)
  }

  const inp = "w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition"
  const inpS = { borderColor: 'var(--pf-border)', color: 'var(--pf-ink)', background: '#fff' }
  const f = {
    onFocus: (e: { currentTarget: HTMLInputElement }) => { e.currentTarget.style.borderColor = 'var(--pf-coral)' },
    onBlur:  (e: { currentTarget: HTMLInputElement }) => { e.currentTarget.style.borderColor = 'var(--pf-border)' },
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--pf-border)' }}>
        {[['config','Configuración'],['chat','Probar agente']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as 'config' | 'chat')}
            className="px-5 py-2.5 text-sm font-medium border-b-2 transition"
            style={{
              borderColor: activeTab === key ? 'var(--pf-coral)' : 'transparent',
              color: activeTab === key ? 'var(--pf-coral)' : 'var(--pf-muted)',
            }}>{label}</button>
        ))}
      </div>

      {/* ── TAB CONFIGURACIÓN ── */}
      {activeTab === 'config' && (
        <div className="space-y-5">

          {/* Identidad */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--pf-ink)' }}>Identidad del agente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>Nombre</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} style={inpS} {...f} placeholder="Dr. Petfhans" />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <div onClick={() => set('is_active', !form.is_active)}
                    className="relative w-11 h-6 rounded-full transition cursor-pointer"
                    style={{ background: form.is_active ? 'var(--pf-coral)' : '#d1d5db' }}>
                    <div className="absolute top-0.5 transition-all rounded-full bg-white w-5 h-5"
                      style={{ left: form.is_active ? '22px' : '2px' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--pf-ink)' }}>
                    {form.is_active ? 'Agente activo' : 'Agente inactivo'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* API Key + Modelo */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--pf-ink)' }}>🔑 OpenAI</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>API Key</label>
                <div className="flex gap-2">
                  <input type={showKey ? 'text' : 'password'} value={form.openai_api_key}
                    onChange={e => set('openai_api_key', e.target.value)}
                    placeholder="sk-..." className={`${inp} flex-1`} style={inpS} {...f} />
                  <button type="button" onClick={() => setShowKey(!showKey)}
                    className="px-3 text-xs rounded-xl border" style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-muted)' }}>
                    {showKey ? 'Ocultar' : 'Ver'}
                  </button>
                  <button type="button" onClick={testAgent} disabled={testing}
                    className="px-4 text-xs font-semibold rounded-xl"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>
                    {testing ? '...' : 'Probar'}
                  </button>
                </div>
                {testResult && (
                  <p className="text-xs mt-2 px-3 py-2 rounded-xl"
                    style={{ background: testResult.startsWith('✅') ? '#edfaf1' : '#fee2e2', color: testResult.startsWith('✅') ? '#1a7a3c' : '#dc2626' }}>
                    {testResult}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--pf-muted)' }}>Modelo</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODELS.map(m => (
                    <button key={m.value} type="button" onClick={() => set('model', m.value)}
                      className="p-3 rounded-xl border text-left transition"
                      style={{
                        borderColor: form.model === m.value ? 'var(--pf-coral)' : 'var(--pf-border)',
                        background: form.model === m.value ? 'var(--pf-coral-soft)' : '#fff',
                      }}>
                      <p className="text-xs font-bold" style={{ color: form.model === m.value ? 'var(--pf-coral)' : 'var(--pf-ink)' }}>{m.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--pf-muted)' }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--pf-muted)' }}>
                  Temperatura: {form.temperature} <span style={{ fontWeight: 400 }}>(0 = preciso, 1 = creativo)</span>
                </label>
                <input type="range" min="0" max="1" step="0.1" value={form.temperature}
                  onChange={e => set('temperature', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--pf-coral)' }} />
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--pf-ink)' }}>Prompt del sistema</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--pf-muted)' }}>Define la personalidad, tono y comportamiento del agente</p>
            <textarea value={form.system_prompt} onChange={e => set('system_prompt', e.target.value)}
              rows={6} placeholder="Eres Dr. Petfhans, veterinario experto…"
              className="w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition resize-none"
              style={inpS}
              onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
              onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--pf-ink)' }}>⚡ Habilidades del agente</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--pf-muted)' }}>Se incluyen en el contexto para guiar el comportamiento</p>
            <ul className="space-y-2 mb-3">
              {form.skills.map((skill: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>⚡</span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--pf-ink)' }}>{skill}</span>
                  <button onClick={() => removeSkill(i)} className="text-xs" style={{ color: '#dc2626' }}>✕</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Nueva habilidad…" className={`${inp} flex-1`} style={inpS} {...f} />
              <button onClick={addSkill} className="px-3 text-sm rounded-xl"
                style={{ background: 'var(--pf-coral-soft)', color: 'var(--pf-coral)' }}>+</button>
            </div>
          </div>

          {/* Acceso a BD */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--pf-border)' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--pf-ink)' }}>🗄️ Acceso a la base de datos</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['✅ Mascotas', 'Nombre, especie, raza, edad, peso'],
                ['✅ Historial médico', 'Consultas, diagnósticos, tratamientos'],
                ['✅ Medicamentos', 'Recetas y dosis anteriores'],
                ['✅ Vacunas', 'Registro de vacunación'],
                ['✅ Archivos', 'Documentos y resultados'],
                ['✅ Clínicas', 'Información del centro'],
              ].map(([label]) => (
                <div key={label} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#edfaf1' }}>
                  <span className="text-xs font-semibold" style={{ color: '#1a7a3c' }}>{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--pf-muted)' }}>
              El agente recibe contexto completo de la BD antes de cada respuesta para análisis precisos.
            </p>
          </div>

          {/* Guardar */}
          {error && <p className="text-sm px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>}
          <div className="flex items-center gap-4">
            <button onClick={save} disabled={saving} className="btn-pf px-8 py-3 text-sm">
              {saving ? 'Guardando…' : '✓ Guardar configuración'}
            </button>
            {saved && <span className="text-sm font-medium" style={{ color: '#1a7a3c' }}>✅ Configuración guardada</span>}
          </div>
        </div>
      )}

      {/* ── TAB CHAT ── */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pf-border)', height: '60vh', display: 'flex', flexDirection: 'column' }}>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--pf-info-fg)' }}>
                  <Sparkles size={32} strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--pf-ink)' }}>Habla con {form.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--pf-muted)' }}>
                  Prueba con: "Analiza el historial de Brounie" o "¿Qué síntomas pueden indicar parvo?"
                </p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: m.role === 'user' ? 'var(--pf-coral)' : 'var(--pf-bg)',
                    color: m.role === 'user' ? '#fff' : 'var(--pf-ink)',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}>
                  {m.role === 'assistant' && (
                    <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: 'var(--pf-coral)' }}><Sparkles size={11} strokeWidth={2} /> {form.name}</p>
                  )}
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--pf-bg)', color: 'var(--pf-muted)' }}>
                  Analizando… ⏳
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4 flex gap-3" style={{ borderColor: 'var(--pf-border)' }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChat())}
              placeholder="Pregunta algo al agente… (Enter para enviar)"
              className="flex-1 px-4 py-2.5 text-sm border rounded-xl outline-none"
              style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
              onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
              onBlur={e => e.target.style.borderColor = 'var(--pf-border)'} />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              className="btn-pf px-5 py-2.5 text-sm disabled:opacity-50">
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
