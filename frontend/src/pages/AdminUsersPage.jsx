import { useEffect, useMemo, useState } from 'react'
import { Avatar } from 'primereact/avatar'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Tag } from 'primereact/tag'
import AdminLayout from '../components/Layout/AdminLayout'
import EmptyState from '../components/UI/EmptyState'
import api from '../services/api'

const ROLE_OPTIONS = [
  { label: 'Técnico', value: 'technician' },
  { label: 'Admin',   value: 'admin' },
]

const USAGE_FILTER_OPTIONS = [
  { label: 'Todos',              value: 'all' },
  { label: 'Usaron el agente',   value: 'used' },
  { label: 'Sin usar el agente', value: 'unused' },
]

function userInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDateTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminUsersPage() {
  const [users, setUsers]         = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState({})
  const [search, setSearch]       = useState('')
  const [usageFilter, setUsageFilter] = useState('all')

  const usageStats = useMemo(() => {
    const used = users.filter((u) => u.has_used_agent).length
    return { used, unused: users.length - used, total: users.length }
  }, [users])

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesSearch = !needle ||
        (u.full_name || '').toLowerCase().includes(needle) ||
        (u.email || '').toLowerCase().includes(needle)
      const matchesUsage =
        usageFilter === 'all' ||
        (usageFilter === 'used' && u.has_used_agent) ||
        (usageFilter === 'unused' && !u.has_used_agent)
      return matchesSearch && matchesUsage
    })
  }, [users, search, usageFilter])

  useEffect(() => {
    api.get('/admin/users')
      .then(({ data }) => setUsers(data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    setSaving((prev) => ({ ...prev, [userId]: true }))
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    } finally {
      setSaving((prev) => ({ ...prev, [userId]: false }))
    }
  }

  /* ── Column templates ── */
  const userTemplate = (row) => (
    <div className="flex items-center gap-2 min-w-0">
      {row.avatar_url
        ? <Avatar image={row.avatar_url} shape="circle" size="normal"
            style={{ width: '2rem', height: '2rem' }} />
        : <Avatar label={userInitials(row.full_name)} shape="circle" size="normal"
            style={{ backgroundColor: '#E8F0F7', color: '#003558', fontSize: '10px', fontWeight: 700, width: '2rem', height: '2rem' }} />
      }
      <span className="font-medium text-text-main text-sm truncate">{row.full_name || '—'}</span>
    </div>
  )

  const emailTemplate = (row) => (
    <span className="text-text-muted text-xs truncate block max-w-[180px]" title={row.email}>
      {row.email}
    </span>
  )

  const roleTemplate = (row) => (
    <Tag
      value={row.role === 'admin' ? 'Admin' : 'Técnico'}
      severity={row.role === 'admin' ? 'warning' : 'info'}
      style={{ fontSize: '11px', fontWeight: 600 }}
    />
  )

  const usageTemplate = (row) => (
    <Tag
      value={row.has_used_agent ? 'Sí, consultó' : 'Sin consultas'}
      severity={row.has_used_agent ? 'success' : 'secondary'}
      style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}
    />
  )

  const lastUseTemplate = (row) => (
    <span className="text-text-muted text-xs whitespace-nowrap" title={row.last_agent_use_at || ''}>
      {row.has_used_agent ? formatDateTime(row.last_agent_use_at) : '—'}
    </span>
  )

  const sessionsTemplate = (row) => (
    <span className="text-text-muted text-sm">
      {row.has_used_agent ? row.session_count : '—'}
    </span>
  )

  const dateTemplate = (row) => (
    <span className="text-text-muted text-xs">{formatDate(row.created_at)}</span>
  )

  const actionTemplate = (row) => (
    <div className="flex items-center gap-1.5">
      <Dropdown
        value={row.role}
        options={ROLE_OPTIONS}
        onChange={(e) => handleRoleChange(row.id, e.value)}
        disabled={!!saving[row.id]}
        style={{ fontSize: '12px', minWidth: '7.5rem' }}
        className="text-sm admin-role-dropdown"
      />
      {saving[row.id] && (
        <ProgressSpinner style={{ width: '18px', height: '18px' }} strokeWidth="5" />
      )}
    </div>
  )

  return (
    <AdminLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-main">Usuarios</h1>
          <p className="text-sm text-text-muted mt-0.5">Gestiona los usuarios del sistema</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isLoading && users.length > 0 && (
            <div className="text-xs text-text-muted bg-surface border border-border px-3 py-2 rounded-lg whitespace-nowrap">
              {usageStats.used} de {usageStats.total} usaron el agente
            </div>
          )}
          <div className="text-xs text-text-muted bg-surface border border-border px-3 py-2 rounded-lg">
            Crear usuarios desde Supabase Auth
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <ProgressSpinner style={{ width: '48px', height: '48px' }} strokeWidth="4" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          title="Sin usuarios"
          description="Crea usuarios desde el panel de Supabase Auth y asígnales perfil."
        />
      )}

      {!isLoading && users.length > 0 && (
        <>
          {/* Filtro */}
          <div className="card p-4 sm:p-5 mb-4 sm:mb-5">
            <div className="flex flex-wrap gap-3">
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="flex-1"
                style={{ height: '42px', fontSize: '14px', minWidth: '200px' }}
              />
              <Dropdown
                value={usageFilter}
                options={USAGE_FILTER_OPTIONS}
                onChange={(e) => setUsageFilter(e.value)}
                style={{ height: '42px', minWidth: '200px' }}
                className="text-sm"
              />
              <Button
                label="Limpiar"
                icon="pi pi-times"
                onClick={() => { setSearch(''); setUsageFilter('all') }}
                outlined
                disabled={!search && usageFilter === 'all'}
                style={{
                  borderColor: '#003558',
                  color: '#003558',
                  height: '42px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>

        <div className="admin-table-wrap">
        <DataTable
          value={filteredUsers}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          stripedRows
          emptyMessage="Sin usuarios que coincidan con la búsqueda"
          size="small"
          responsiveLayout="stack"
          breakpoint="960px"
          className="text-sm admin-datatable"
        >
          <Column header="Nombre"              body={userTemplate}     style={{ minWidth: '9rem' }} />
          <Column header="Correo"              body={emailTemplate}    style={{ minWidth: '10rem' }} />
          <Column header="Rol en el sistema"   body={roleTemplate}     style={{ minWidth: '6.5rem' }} />
          <Column
            header="Usó el agente"
            body={usageTemplate}
            style={{ minWidth: '7.5rem' }}
            sortable
            field="has_used_agent"
          />
          <Column
            header="Última consulta"
            body={lastUseTemplate}
            style={{ minWidth: '9rem' }}
            sortable
            field="last_agent_use_at"
          />
          <Column
            header="Sesiones de chat"
            body={sessionsTemplate}
            style={{ minWidth: '6rem' }}
            sortable
            field="session_count"
          />
          <Column header="Miembro desde"       body={dateTemplate}     style={{ minWidth: '6.5rem' }} sortable field="created_at" />
          <Column header="Cambiar rol"         body={actionTemplate}   style={{ minWidth: '8.5rem' }} />
        </DataTable>
        </div>
        </>
      )}
    </AdminLayout>
  )
}
