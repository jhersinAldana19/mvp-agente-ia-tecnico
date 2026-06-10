import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import AdminLayout from '../components/Layout/AdminLayout'
import EmptyState from '../components/UI/EmptyState'
import Spinner from '../components/UI/Spinner'
import api from '../services/api'
import perfilAgente from '../assets/agente/perfil-agente.webp'

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit',
  })
}

function truncate(text, max = 80) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const MD = {
  p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  ul:     ({ children }) => <ul className="mb-1 pl-4 list-disc">{children}</ul>,
  li:     ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
}

/* ── Modal de conversación completa ── */
function UserBubbleAvatar({ avatarUrl, broken, onError }) {
  if (avatarUrl && !broken) {
    return (
      <img src={avatarUrl} alt="Usuario"
        className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0"
        onError={onError} />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full bg-primary/10 border border-border
                    flex-shrink-0 flex items-center justify-center">
      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    </div>
  )
}

function ConversationModal({ record, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [avatarBroken, setAvatarBroken] = useState(false)
  const avatarUrl = record.profiles?.avatar_url

  useEffect(() => {
    api.get(`/admin/sessions/${record.session_id}`)
      .then(({ data }) => setMessages(data))
      .catch(() => setError('No se pudo cargar la conversación.'))
      .finally(() => setLoading(false))
  }, [record.session_id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh]
                      flex flex-col overflow-hidden"
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-text-main text-sm">
              {record.profiles?.full_name || '—'}
            </p>
            <p className="text-xs text-text-muted">{record.profiles?.email || '—'}</p>
          </div>
          <button onClick={onClose}
            className="text-text-muted hover:text-text-main transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-surface/40">
          {loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {error   && <p className="text-sm text-red-600 text-center">{error}</p>}
          {!loading && messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id}
                   className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
                {isUser ? (
                  <UserBubbleAvatar
                    avatarUrl={avatarUrl}
                    broken={avatarBroken}
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <img src={perfilAgente} alt="SOFIA"
                    className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0" />
                )}
                <div className={`max-w-[78%] rounded-xl px-3 py-2 text-xs leading-relaxed
                                 ${isUser
                                   ? 'bg-primary text-white rounded-tr-sm'
                                   : 'bg-white border border-border text-text-main rounded-tl-sm'}`}>
                  {isUser
                    ? msg.content
                    : <ReactMarkdown components={MD}>{msg.content}</ReactMarkdown>}
                  <p className={`text-[10px] mt-1
                                 ${isUser ? 'text-white/60 text-right' : 'text-text-muted'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-border bg-white text-xs text-text-muted">
          {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

/* ── Página principal ── */
export default function AdminHistoryPage() {
  const [records, setRecords]   = useState([])
  const [search, setSearch]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fetched, setFetched]   = useState(false)
  const [error, setError]       = useState('')
  const [modalRecord, setModalRecord] = useState(null)

  const fetchHistory = async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get('/admin/history', {
        params: { search, date_from: dateFrom, date_to: dateTo },
      })
      setRecords(data)
      setFetched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  const handleFilter = (e) => { e.preventDefault(); fetchHistory() }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-main">Historial global</h1>
        <p className="text-sm text-text-muted mt-0.5">Consulta todas las conversaciones del sistema</p>
      </div>

      <form onSubmit={handleFilter} className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Buscar por usuario, correo o pregunta..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1" />
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field w-40" aria-label="Desde" />
            <span className="text-text-muted text-sm">–</span>
            <input type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field w-40" aria-label="Hasta" />
          </div>
          <button type="submit" className="btn-primary px-5 flex-shrink-0">Filtrar</button>
        </div>
      </form>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2
                      rounded-lg mb-4">{error}</p>
      )}

      {!isLoading && fetched && records.length === 0 && (
        <EmptyState title="Sin resultados"
          description="No hay conversaciones que coincidan con los filtros aplicados." />
      )}

      {!isLoading && records.length > 0 && (
        <div className="card overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {['Usuario','Correo','Pregunta','Fecha',''].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold
                                           text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-text-main">
                      {record.profiles?.full_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {record.profiles?.email || '—'}
                    </td>
                    <td className="py-3 px-4 text-text-main max-w-xs">
                      {truncate(record.content)}
                    </td>
                    <td className="py-3 px-4 text-text-muted whitespace-nowrap">
                      {formatDateTime(record.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      {record.session_id ? (
                        <button
                          onClick={() => setModalRecord(record)}
                          className="text-primary text-xs font-medium hover:underline">
                          Ver detalle
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-border">
            {records.map((record) => (
              <div key={record.id} className="p-4 space-y-1">
                <p className="font-medium text-text-main text-sm">
                  {record.profiles?.full_name || '—'}
                </p>
                <p className="text-xs text-text-muted">{record.profiles?.email || '—'}</p>
                <p className="text-sm text-text-main">{truncate(record.content)}</p>
                <p className="text-xs text-text-muted">{formatDateTime(record.created_at)}</p>
                {record.session_id && (
                  <button onClick={() => setModalRecord(record)}
                    className="text-primary text-xs font-medium hover:underline">
                    Ver detalle
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border bg-surface text-xs text-text-muted">
            Mostrando {records.length} resultado{records.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modalRecord && (
        <ConversationModal record={modalRecord} onClose={() => setModalRecord(null)} />
      )}
    </AdminLayout>
  )
}
