'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import VetLayout from '@/components/shared/VetLayout'
import PetSearch from '@/components/shared/PetSearch'

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIPage() {
  const [pets, setPets] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [clinicName, setClinicName] = useState('')
  const [userName, setUserName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles')
        .select('*, clinics(name)').eq('user_id', user.id).single()
      setClinicName((profile as any)?.clinics?.name ?? '')
      setUserName(profile?.full_name ?? '')
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

  const speciesIcon: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }

  return (
    <VetLayout clinicName={clinicName} userName={userName}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>IA Clínica</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Consulta el historial y analiza casos</p>
        </div>
        {pets.length > 0 && (
          <div style={{ width: 260 }}>
            <PetSearch pets={pets} value={selectedPet} onChange={setSelectedPet} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border)', height: 'calc(100vh - 220px)' }}>
        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">🤖</div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>IA Clínica Petfhans</p>
              <p className="text-sm mt-2 max-w-sm" style={{ color: 'var(--muted)' }}>
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
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
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
                  ? { background: 'var(--accent)', color: '#fff', borderBottomRightRadius: '4px' }
                  : { background: 'var(--bg)', color: 'var(--text)', borderBottomLeftRadius: '4px', border: '1px solid var(--border)' }
                }>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <span className="animate-pulse" style={{ color: 'var(--muted)' }}>Analizando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3" style={{ borderColor: 'var(--border)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Escribe tu consulta clínica..."
            className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-pf px-5 py-3 text-sm">
            Enviar
          </button>
        </div>
      </div>
    </VetLayout>
  )
}
