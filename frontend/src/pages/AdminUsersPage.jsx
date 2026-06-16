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

function userInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function AdminUsersPage() {
  const [users, setUsers]         = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState({})
  const [search, setSearch]       = useState('')

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return users
    return users.filter((u) =>
      (u.full_name || '').toLowerCase().includes(needle) ||
      (u.email || '').toLowerCase().includes(needle)
    )
  }, [users, search])

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
    <div className="flex items-center gap-2.5">
      {row.avatar_url
        ? <Avatar image={row.avatar_url} shape="circle" size="normal" />
        : <Avatar label={userInitials(row.full_name)} shape="circle" size="normal"
            style={{ backgroundColor: '#E8F0F7', color: '#003558', fontSize: '11px', fontWeight: 700 }} />
      }
      <span className="font-semibold text-text-main text-sm">{row.full_name || '—'}</span>
    </div>
  )

  const emailTemplate = (row) => (
    <span className="text-text-muted text-sm">{row.email}</span>
  )

  const roleTemplate = (row) => (
    <Tag
      value={row.role === 'admin' ? 'Admin' : 'Técnico'}
      severity={row.role === 'admin' ? 'warning' : 'info'}
      style={{ fontSize: '11px', fontWeight: 600 }}
    />
  )

  const dateTemplate = (row) => (
    <span className="text-text-muted text-xs">{formatDate(row.created_at)}</span>
  )

  const actionTemplate = (row) => (
    <div className="flex items-center gap-2">
      <Dropdown
        value={row.role}
        options={ROLE_OPTIONS}
        onChange={(e) => handleRoleChange(row.id, e.value)}
        disabled={!!saving[row.id]}
        style={{ fontSize: '13px' }}
        className="text-sm"
      />
      {saving[row.id] && (
        <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth="5" />
      )}
    </div>
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-main">Usuarios</h1>
          <p className="text-sm text-text-muted mt-0.5">Gestiona los usuarios del sistema</p>
        </div>
        <div className="text-xs text-text-muted bg-surface border border-border px-3 py-2 rounded-lg">
          Crear usuarios desde Supabase Auth
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
          <div className="card p-5 mb-5">
            <div className="flex gap-3">
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="flex-1"
                style={{ height: '42px', fontSize: '14px' }}
              />
              <Button
                label="Limpiar"
                icon="pi pi-times"
                onClick={() => setSearch('')}
                outlined
                disabled={!search}
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

        <DataTable
          value={filteredUsers}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}–{last} de {totalRecords}"
          stripedRows
          emptyMessage="Sin usuarios que coincidan con la búsqueda"
          size="normal"
          responsiveLayout="stack"
          breakpoint="767px"
          className="text-sm"
          style={{ fontSize: '14px' }}
        >
          <Column header="Nombre"        body={userTemplate}   style={{ minWidth: '180px' }} />
          <Column header="Correo"        body={emailTemplate}  style={{ minWidth: '200px' }} />
          <Column header="Rol"           body={roleTemplate}   style={{ width: '110px' }} />
          <Column header="Miembro desde" body={dateTemplate}   style={{ minWidth: '130px' }} sortable field="created_at" />
          <Column header="Cambiar rol"   body={actionTemplate} style={{ minWidth: '180px' }} />
        </DataTable>
        </>
      )}
    </AdminLayout>
  )
}
