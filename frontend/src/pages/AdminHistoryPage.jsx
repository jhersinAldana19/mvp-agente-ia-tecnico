import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Avatar } from 'primereact/avatar'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import AdminLayout from '../components/Layout/AdminLayout'
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

function truncate(text, max = 90) {
  return text?.length > max ? `${text.slice(0, max)}…` : (text || '')
}

const MD = {
  p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  ul:     ({ children }) => <ul className="mb-1 pl-4 list-disc">{children}</ul>,
  li:     ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
}

function userInitials(name) {
  if (!name || name === '—') return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function AdminHistoryPage() {
  const [records, setRecords]     = useState([])
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState(null)
  const [dateTo, setDateTo]       = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetched, setFetched]     = useState(false)
  const [error, setError]         = useState('')

  const [modalRecord, setModalRecord]   = useState(null)
  const [messages, setMessages]         = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError]     = useState('')
  const [avatarBroken, setAvatarBroken] = useState(false)

  const toISO = (d) => (d instanceof Date ? d.toISOString().split('T')[0] : '')

  const doFetch = async (params) => {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get('/admin/history', { params })
      setRecords(data)
      setFetched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistory = useCallback(
    () => doFetch({ search, date_from: toISO(dateFrom), date_to: toISO(dateTo) }),
    [search, dateFrom, dateTo]
  )

  const handleClear = () => {
    setSearch('')
    setDateFrom(null)
    setDateTo(null)
    doFetch({})
  }

  useEffect(() => { doFetch({}) }, [])

  const openModal = async (record) => {
    setModalRecord(record)
    setMessages([])
    setModalError('')
    setAvatarBroken(false)
    setModalLoading(true)
    try {
      const { data } = await api.get(`/admin/sessions/${record.id}`)
      setMessages(data)
    } catch {
      setModalError('No se pudo cargar la conversación.')
    } finally {
      setModalLoading(false)
    }
  }

  /* ── Column templates ── */
  const userTemplate = (row) => {
    const name      = row.profiles?.full_name || '—'
    const avatarUrl = row.profiles?.avatar_url
    return (
      <div className="flex items-center gap-2.5">
        {avatarUrl
          ? <Avatar image={avatarUrl} shape="circle" size="normal" />
          : <Avatar label={userInitials(name)} shape="circle" size="normal"
              style={{ backgroundColor: '#E8F0F7', color: '#003558', fontSize: '11px', fontWeight: 700 }} />
        }
        <span className="font-semibold text-text-main text-sm">{name}</span>
      </div>
    )
  }

  const emailTemplate  = (row) => <span className="text-text-muted text-sm">{row.profiles?.email || '—'}</span>
  const titleTemplate  = (row) => <span className="text-text-main text-sm">{truncate(row.title)}</span>
  const countTemplate  = (row) => (
    <span className="text-text-muted text-sm">
      {row.question_count} pregunta{row.question_count !== 1 ? 's' : ''}
    </span>
  )
  const dateTemplate   = (row) => <span className="text-text-muted text-xs whitespace-nowrap">{formatDateTime(row.created_at)}</span>

  const actionTemplate = (row) =>
    row.id ? (
      <Button label="Ver detalle" link size="small"
        style={{ color: '#003558', padding: 0, fontWeight: 600 }}
        onClick={() => openModal(row)} />
    ) : <span className="text-text-muted text-xs">—</span>

  /* ── Dialog header ── */
  const dialogHeader = (
    <div>
      <p className="font-semibold text-text-main">{modalRecord?.profiles?.full_name || '—'}</p>
      <p className="text-xs text-text-muted font-normal mt-0.5">{modalRecord?.profiles?.email || '—'}</p>
    </div>
  )

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-main">Historial global</h1>
        <p className="text-sm text-text-muted mt-0.5">Consulta las sesiones de chat agrupadas por conversación</p>
      </div>

      {/* Filtros */}
      <div className="card p-5 mb-5">
        {/* Búsqueda — ocupa todo el ancho */}
        <div className="mb-3">
          <InputText
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
            placeholder="Buscar por usuario, correo o conversación..."
            className="w-full"
            style={{ height: '42px', fontSize: '14px' }}
          />
        </div>
        {/* Fechas + botones — se envuelven en móvil */}
        <div className="flex flex-wrap gap-3">
          <Calendar
            value={dateFrom}
            onChange={(e) => setDateFrom(e.value)}
            placeholder="Desde"
            dateFormat="dd/mm/yy"
            showIcon
            className="flex-1"
            style={{ minWidth: '140px' }}
            inputStyle={{ height: '42px', fontSize: '14px' }}
          />
          <Calendar
            value={dateTo}
            onChange={(e) => setDateTo(e.value)}
            placeholder="Hasta"
            dateFormat="dd/mm/yy"
            showIcon
            className="flex-1"
            style={{ minWidth: '140px' }}
            inputStyle={{ height: '42px', fontSize: '14px' }}
          />
          <div className="flex gap-2 flex-shrink-0">
            <Button
              label="Filtrar"
              icon="pi pi-search"
              onClick={fetchHistory}
              loading={isLoading}
              style={{
                backgroundColor: '#003558',
                borderColor: '#003558',
                color: '#ffffff',
                height: '42px',
                paddingLeft: '18px',
                paddingRight: '18px',
                fontSize: '14px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            />
            <Button
              label="Limpiar"
              icon="pi pi-times"
              onClick={handleClear}
              outlined
              style={{
                borderColor: '#003558',
                color: '#003558',
                height: '42px',
                paddingLeft: '14px',
                paddingRight: '14px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg mb-4">
          {error}
        </p>
      )}

      {/* Tabla */}
      <DataTable
        value={records}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{first}–{last} de {totalRecords}"
        stripedRows
        emptyMessage={fetched ? 'Sin resultados' : 'Usa el filtro para buscar conversaciones.'}
        loading={isLoading}
        size="normal"
        responsiveLayout="stack"
        breakpoint="767px"
        className="text-sm"
        style={{ fontSize: '14px' }}
      >
        <Column header="Usuario"       body={userTemplate}  style={{ minWidth: '180px' }} />
        <Column header="Correo"        body={emailTemplate} style={{ minWidth: '190px' }} />
        <Column header="Conversación"  body={titleTemplate} style={{ minWidth: '260px' }} />
        <Column header="Preguntas"     body={countTemplate} style={{ minWidth: '110px' }} />
        <Column header="Fecha"         body={dateTemplate}  style={{ minWidth: '160px' }} sortable field="created_at" />
        <Column header="Acción"        body={actionTemplate} style={{ width: '110px' }} />
      </DataTable>

      {/* Modal conversación */}
      <Dialog
        header={dialogHeader}
        visible={!!modalRecord}
        onHide={() => setModalRecord(null)}
        style={{ width: '560px', maxWidth: '95vw' }}
        modal
        dismissableMask
        breakpoints={{ '640px': '95vw' }}
      >
        <div className="overflow-y-auto space-y-3 py-1" style={{ maxHeight: '60vh' }}>
          {modalLoading && <div className="flex justify-center py-8"><Spinner /></div>}
          {modalError   && <p className="text-sm text-red-600 text-center">{modalError}</p>}
          {!modalLoading && messages.map((msg) => {
            const isUser   = msg.role === 'user'
            const avatarUrl = modalRecord?.profiles?.avatar_url
            return (
              <div key={msg.id}
                   className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
                {isUser ? (
                  avatarUrl && !avatarBroken ? (
                    <img src={avatarUrl} alt="User"
                      className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0"
                      onError={() => setAvatarBroken(true)} />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-border
                                    flex-shrink-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                  )
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
                  <p className={`text-[10px] mt-1 ${isUser ? 'text-white/60 text-right' : 'text-text-muted'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="border-t border-border pt-2 mt-2 text-xs text-text-muted">
          {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
        </div>
      </Dialog>
    </AdminLayout>
  )
}
