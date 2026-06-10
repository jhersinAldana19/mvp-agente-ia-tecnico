import { useState } from 'react'
import ChatInput from '../components/Chat/ChatInput'
import ChatWindow from '../components/Chat/ChatWindow'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import PdfModal from '../components/Modal/PdfModal'
import api from '../services/api'
import perfilAgente from '../assets/agente/perfil-agente.webp'

function SofiaCard() {
  return (
    <div className="flex items-center gap-3 p-4 card mb-4">
      <img
        src={perfilAgente}
        alt="SOFIA"
        className="w-12 h-12 rounded-full object-cover border border-border flex-shrink-0"
      />
      <div>
        <p className="font-semibold text-text-main text-sm">SOFIA</p>
        <p className="text-xs text-text-muted">Agente Técnico</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-green-600 font-medium">En línea</span>
        </div>
      </div>
    </div>
  )
}

export default function TechnicianChatPage() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
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
    <TechnicianLayout>
      <SofiaCard />

      <div className="card flex flex-col overflow-hidden"
           style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
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

      <PdfModal
        isOpen={Boolean(modalSource)}
        source={modalSource}
        onClose={() => setModalSource(null)}
      />
    </TechnicianLayout>
  )
}
