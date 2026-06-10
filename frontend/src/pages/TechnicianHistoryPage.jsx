import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import EmptyState from '../components/UI/EmptyState'
import Spinner from '../components/UI/Spinner'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import perfilAgente from '../assets/agente/perfil-agente.webp'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const MD = {
  p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  ul:     ({ children }) => <ul className="mb-1 pl-4 list-disc">{children}</ul>,
  ol:     ({ children }) => <ol className="mb-1 pl-4 list-decimal">{children}</ol>,
  li:     ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
}

function MessageRow({ msg, avatarUrl }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isUser ? (
        avatarUrl ? (
          <img src={avatarUrl} alt="Tú"
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-border" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface border border-border flex-shrink-0
                          flex items-center justify-center">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )
      ) : (
        <img src={perfilAgente} alt="SOFIA"
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-border" />
      )}

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed
                       ${isUser
                         ? 'bg-primary text-white rounded-tr-sm'
                         : 'bg-white border border-border text-text-main rounded-tl-sm'}`}>
        {isUser ? (
          msg.content
        ) : (
          <ReactMarkdown components={MD}>{msg.content}</ReactMarkdown>
        )}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-white/60 text-right' : 'text-text-muted'}`}>
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

function SessionItem({ session, avatarUrl }) {
  const [expanded, setExpanded]   = useState(false)
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [fetched, setFetched]     = useState(false)

  const toggle = async () => {
    if (!expanded && !fetched) {
      setLoading(true)
      try {
        const { data } = await api.get(`/chat/sessions/${session.id}`)
        setMessages(data)
        setFetched(true)
      } finally {
        setLoading(false)
      }
    }
    setExpanded((v) => !v)
  }

  return (
    <div className="card overflow-hidden transition-all">
      {/* Header row — siempre visible */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-surface/60
                   transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-main truncate">{session.title}</p>
          <p className="text-xs text-text-muted mt-0.5">{formatDate(session.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {session.source_count > 0 && (
            <span className="badge-technician">
              {session.source_count} {session.source_count === 1 ? 'fuente' : 'fuentes'}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-text-muted transition-transform duration-200
                        ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Expanded messages */}
      {expanded && (
        <div className="border-t border-border bg-surface/40 px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <MessageRow key={msg.id} msg={msg} avatarUrl={avatarUrl} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TechnicianHistoryPage() {
  const { profile } = useAuth()
  const [sessions, setSessions]   = useState([])
  const [search, setSearch]       = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    api.get('/chat/history')
      .then(({ data }) => setSessions(data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <TechnicianLayout>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-text-main">Historial de consultas</h1>
        <p className="text-sm text-text-muted mt-0.5">Tus conversaciones anteriores</p>
      </div>

      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="search"
          placeholder="Buscar conversaciones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14
                   a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
          title={search ? 'Sin resultados' : 'Sin consultas aún'}
          description={
            search
              ? 'No hay conversaciones que coincidan con tu búsqueda.'
              : 'Tus consultas al asistente aparecerán aquí.'
          }
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              avatarUrl={profile?.avatar_url}
            />
          ))}
        </div>
      )}
    </TechnicianLayout>
  )
}
