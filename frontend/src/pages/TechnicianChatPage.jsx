import { useState } from 'react'
import ChatInput from '../components/Chat/ChatInput'
import ChatWindow from '../components/Chat/ChatWindow'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import PdfModal from '../components/Modal/PdfModal'
import { useChat } from '../context/ChatContext'
import api from '../services/api'
import perfilAgente from '../assets/agente/perfil-agente.webp'
import homeAgente from '../assets/agente/home_agente.webp'

const SOFIA_ACRONYM = [
  { letter: 'S', word: 'Smart' },
  { letter: 'O', word: 'Operations' },
  { letter: 'F', word: 'Field' },
  { letter: 'I', word: 'Intelligence' },
  { letter: 'A', word: 'Assistant' },
]

function SofiaAcronym() {
  return (
    <div
      className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-white to-primary/[0.03] px-3.5 py-2.5 mb-3"
      aria-label="Significado de SOFIA"
    >
      <ul className="space-y-0">
        {SOFIA_ACRONYM.map(({ letter, word }) => (
          <li key={letter} className="flex items-baseline leading-none py-px">
            <span className="text-[11px] leading-none tracking-wide">
              <span className="inline-block w-3.5 font-bold text-primary">{letter}</span>
              <span className="text-text-muted">{word.slice(1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeatureItem({ icon, text }) {
  const icons = {
    doc: (
      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
             a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    bulb: (
      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
             m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
             A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
             c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    wrench: (
      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0
             002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0
             001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0
             00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0
             00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0
             00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0
             00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0
             001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07
             2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  }
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
        {icons[icon]}
      </div>
      <p className="text-xs text-text-muted leading-snug pt-1">{text}</p>
    </div>
  )
}

function SofiaPanel() {
  return (
    <div className="card p-5 flex flex-col">
      {/* Imagen principal */}
      <div className="flex justify-center mb-4">
        <div className="w-40 h-40 rounded-2xl overflow-hidden bg-[#EBF4FF] flex items-center justify-center ring-1 ring-primary/10">
          <img src={homeAgente} alt="SOFIA" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Marca SOFIA® + acrónimo */}
      <div className="text-center mb-1">
        <h2 className="text-xl font-bold text-text-main tracking-tight leading-none">
          SOFIA
          <sup className="ml-0.5 text-[0.45em] font-semibold text-primary/60 align-super">®</sup>
        </h2>
        <p className="text-[11px] text-text-muted mt-1.5 uppercase tracking-[0.12em] font-medium">
          Agente Técnico de TECPORT
        </p>
      </div>

      <SofiaAcronym />

      {/* Descripción */}
      <p className="text-xs text-text-muted leading-relaxed mb-3">
        Agente técnico con IA para resolver consultas del equipo TRS4531 con apoyo en documentación de MANUAL DE OPERACIÓN, MANUAL DE REPUESTOS, COMERCIAL y CÓDIGOS DE FALLA.
      </p>

      {/* Estado */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-green-600 font-medium">En línea</span>
      </div>

      {/* Características */}
      <div className="space-y-3 border-t border-border pt-4">
        <FeatureItem icon="doc"    text="Respuestas basadas en documentación" />
        <FeatureItem icon="bulb"   text="Orientación técnica clara" />
        <FeatureItem icon="wrench" text="Apoyo para diagnóstico del equipo" />
      </div>
    </div>
  )
}


export default function TechnicianChatPage() {
  const { messages, setMessages, sessionId, setSessionId } = useChat()
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [modalSource, setModalSource] = useState(null)
  const [error, setError] = useState('')

  const handleSend = async () => {
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setQuestion('')
    setIsLoading(true)
    setError('')

    try {
      const { data } = await api.post('/chat', {
        question: trimmed,
        session_id: sessionId,
      })

      if (!sessionId) setSessionId(data.session_id)

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TechnicianLayout maxWidth="6xl">

      {/* Layout de dos columnas */}
      <div className="flex gap-4" style={{ height: 'calc(100dvh - 9.5rem)', minHeight: '420px' }}>

        {/* Sidebar SOFIA — solo desktop */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 overflow-y-auto rounded-xl">
          <SofiaPanel />
        </aside>

        {/* Chat */}
        <div className="flex-1 card flex flex-col overflow-hidden min-h-0">

          {/* Header del chat — visible siempre */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <img src={perfilAgente} alt="SOFIA"
              className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text-main leading-none mb-1">
                SOFIA<sup className="ml-px text-[0.55em] font-semibold text-primary/50 align-super">®</sup>
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-xs text-green-600 font-medium">En línea</span>
                <span className="text-xs text-text-muted">· Agente Técnico</span>
              </div>
            </div>
          </div>

          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onViewSource={setModalSource}
          />

          {error && (
            <div className="px-4 pb-2">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            </div>
          )}

          <ChatInput
            value={question}
            onChange={setQuestion}
            onSubmit={handleSend}
            disabled={isLoading}
          />
        </div>

      </div>

      <PdfModal
        isOpen={Boolean(modalSource)}
        source={modalSource}
        onClose={() => setModalSource(null)}
      />
    </TechnicianLayout>
  )
}
