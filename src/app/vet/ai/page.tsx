'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

import PetSearch from '@/components/shared/PetSearch'
import { Sparkles } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIPage() {
  const [pets, setPets] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles')
        .select('clinic_id').eq('user_id', user.id).single()
      const { data } = await supabase.from('pets').select('id, name, species, breed')
        .eq('clinic_id', profile?.clinic_id).eq('is_active', true).order('name')
      setPets(data ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(p => [...p, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/vet/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, pet_id: selectedPet, history: messages }),
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply ?? 'Error al obtener respuesta.' }])
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--pf-font-display)', fontWeight: 700, fontSize: 24, color: 'var(--pf-ink)', margin: 0 }}>IA Clínica</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pf-muted)' }}>Consulta el historial y analiza casos</p>
        </div>
        {pets.length > 0 && (
          <div style={{ width: 260 }}>
            <PetSearch pets={pets} value={selectedPet} onChange={setSelectedPet} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: 'var(--pf-border)', height: 'calc(100vh - 220px)' }}>
        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div style={{ width:56, height:56, borderRadius:16, background:'var(--pf-info)', color:'var(--pf-info-fg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                <Sparkles size={28} strokeWidth={1.75} />
              </div>
              <p style={{ fontFamily:'var(--pf-font-display)', fontWeight:700, fontSize:17, color:'var(--pf-ink)', margin:'0 0 8px' }}>IA Clínica Petfhans</p>
              <p className="text-sm max-w-sm" style={{ color: 'var(--pf-muted)' }}>
                Consulta historiales médicos, compara síntomas con casos similares o analiza diagnósticos.
                {selectedPet ? ' Tengo el historial del paciente seleccionado.' : ' Selecciona un paciente para contexto específico.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {[
                  '¿Cuál es el historial de este paciente?',
                  '¿Qué vacunas le faltan?',
                  'Analiza los síntomas: vómitos y apatía',
                  '¿Qué dosis de amoxicilina para un perro de 10kg?',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-xl border transition"
                    style={{ borderColor: 'var(--pf-info-fg)', color: 'var(--pf-info-fg)', background: 'var(--pf-info)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed`}
                style={m.role === 'user'
                  ? { background: 'var(--pf-coral)', color: '#fff', borderBottomRightRadius: '4px' }
                  : { background: 'var(--pf-info)', color: 'var(--pf-ink)', borderBottomLeftRadius: '4px', border: '0.5px solid var(--pf-border)' }
                }>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--pf-info)', border: '0.5px solid var(--pf-border)' }}>
                <span style={{ color: 'var(--pf-info-fg)' }}>
                  <span className="animate-pulse">●</span>{' '}
                  <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>{' '}
                  <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3" style={{ borderColor: 'var(--pf-border)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Escribe tu consulta clínica..."
            className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--pf-border)', color: 'var(--pf-ink)' }}
            onFocus={e => e.target.style.borderColor = 'var(--pf-coral)'}
            onBlur={e => e.target.style.borderColor = 'var(--pf-border)'}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-pf px-5 py-3 text-sm">
            Enviar
          </button>
        </div>
      </div>
    </>
  )
}
