import { useEffect, useState } from 'react'
import AdminLayout from '../components/Layout/AdminLayout'
import EmptyState from '../components/UI/EmptyState'
import Spinner from '../components/UI/Spinner'
import api from '../services/api'

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text, max = 80) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default function AdminHistoryPage() {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState('')

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

  const handleFilter = (e) => {
    e.preventDefault()
    fetchHistory()
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-main">Historial global</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Consulta todas las conversaciones del sistema
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por usuario, correo o pregunta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field w-40"
              aria-label="Desde"
            />
            <span className="text-text-muted text-sm">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field w-40"
              aria-label="Hasta"
            />
          </div>
          <button type="submit" className="btn-primary px-5 flex-shrink-0">
            Filtrar
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2
                      rounded-lg mb-4">
          {error}
        </p>
      )}

      {!isLoading && fetched && records.length === 0 && (
        <EmptyState
          title="Sin resultados"
          description="No hay conversaciones que coincidan con los filtros aplicados."
        />
      )}


      {/* Table */}
      {!isLoading && records.length > 0 && (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted
                                 uppercase tracking-wide">
                    Usuario
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted
                                 uppercase tracking-wide">
                    Correo
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted
                                 uppercase tracking-wide">
                    Pregunta
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted
                                 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="py-3 px-4" />
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
                      <button className="text-primary text-xs font-medium hover:underline">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border">
            {records.map((record) => (
              <div key={record.id} className="p-4 space-y-1">
                <p className="font-medium text-text-main text-sm">
                  {record.profiles?.full_name || '—'}
                </p>
                <p className="text-xs text-text-muted">{record.profiles?.email || '—'}</p>
                <p className="text-sm text-text-main">{truncate(record.content)}</p>
                <p className="text-xs text-text-muted">{formatDateTime(record.created_at)}</p>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border bg-surface text-xs text-text-muted">
            Mostrando {records.length} resultado{records.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
