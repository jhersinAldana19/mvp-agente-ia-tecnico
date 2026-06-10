import { useEffect, useState } from 'react'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import EmptyState from '../components/UI/EmptyState'
import Spinner from '../components/UI/Spinner'
import api from '../services/api'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SessionItem({ session }) {
  return (
    <div className="card p-4 flex items-center gap-4 hover:border-primary/30
                    transition-colors cursor-pointer">
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
        <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export default function TechnicianHistoryPage() {
  const [sessions, setSessions] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/chat/history')
        setSessions(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
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
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
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
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      )}
    </TechnicianLayout>
  )
}
