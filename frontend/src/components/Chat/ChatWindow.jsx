import { useEffect, useRef } from 'react'
import Spinner from '../UI/Spinner'
import MessageBubble from './MessageBubble'
import perfilAgente from '../../assets/agente/perfil-agente.webp'

export default function ChatWindow({ messages, isLoading, onViewSource }) {
  const bottomRef      = useRef(null)
  const lastMsgTopRef  = useRef(null)

  useEffect(() => {
    if (isLoading) {
      // Mientras espera, mostrar el spinner (fondo)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant') {
      // Scroll al inicio del bubble de SOFIA para que el usuario lea desde arriba
      lastMsgTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  if (!messages.length && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-text-main font-medium">¿En qué puedo ayudarte hoy?</p>
        <p className="text-text-muted text-sm mt-1">
          Hazme una pregunta sobre el equipo TRS4531
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1
        return (
          <div key={msg.id}>
            {isLast && msg.role === 'assistant' && (
              <div ref={lastMsgTopRef} />
            )}
            <MessageBubble message={msg} onViewSource={onViewSource} />
          </div>
        )
      })}

      {isLoading && (
        <div className="flex gap-3 items-center">
          <img
            src={perfilAgente}
            alt="SOFIA"
            className="w-9 h-9 rounded-full object-cover border border-border flex-shrink-0"
          />
          <div className="card px-4 py-3">
            <Spinner size="sm" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
