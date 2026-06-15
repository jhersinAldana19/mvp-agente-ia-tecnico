import { useEffect, useState } from 'react'
import AdminLayout from '../components/Layout/AdminLayout'
import EmptyState from '../components/UI/EmptyState'
import Spinner from '../components/UI/Spinner'
import api from '../services/api'

function MiniAvatar({ name, avatarUrl }) {
  const [broken, setBroken] = useState(false)
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border">
      {avatarUrl && !broken ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover"
          onError={() => setBroken(true)} />
      ) : (
        <div className="w-full h-full bg-primary/10 flex items-center justify-center
                        text-primary text-xs font-semibold">
          {initials}
        </div>
      )}
    </div>
  )
}

const ROLES = ['technician', 'admin']

function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="badge-admin">Admin</span>
  ) : (
    <span className="badge-technician">Técnico</span>
  )
}

function RoleSelector({ userId, currentRole, onUpdate }) {
  const [value, setValue] = useState(currentRole)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = async (newRole) => {
    if (newRole === value) return
    setIsSaving(true)
    try {
      await onUpdate(userId, newRole)
      setValue(newRole)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isSaving}
        className="text-xs border border-border rounded px-2 py-1 focus:outline-none
                   focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r === 'admin' ? 'Admin' : 'Técnico'}
          </option>
        ))}
      </select>
      {isSaving && <Spinner size="sm" />}
    </div>
  )
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/admin/users')
        setUsers(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleRoleUpdate = async (userId, newRole) => {
    await api.patch(`/admin/users/${userId}/role`, { role: newRole })
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-main">Usuarios</h1>
          <p className="text-sm text-text-muted mt-0.5">Gestiona los usuarios del sistema</p>
        </div>
        <div className="text-xs text-text-muted bg-surface border border-border px-3 py-2
                        rounded-lg">
          Crear usuarios desde Supabase Auth
        </div>
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

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          title="Sin usuarios"
          description="Crea usuarios desde el panel de Supabase Auth y asígnales perfil."
        />
      )}

      {!isLoading && users.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  {['Nombre', 'Correo', 'Rol', 'Miembro desde', 'Acciones'].map((h) => (
                    <th key={h}
                      className="text-left py-4 px-5 text-sm font-bold text-text-main">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id}
                    className={`border-b border-border last:border-0 transition-colors
                      hover:bg-primary-light/40
                      ${idx % 2 === 0 ? 'bg-white' : 'bg-surface/60'}`}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <MiniAvatar name={user.full_name} avatarUrl={user.avatar_url} />
                        <span className="font-semibold text-text-main text-sm">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-text-muted text-sm">{user.email}</td>
                    <td className="py-4 px-5">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="py-4 px-5 text-text-muted text-xs whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-4 px-5">
                      <RoleSelector userId={user.id} currentRole={user.role}
                        onUpdate={handleRoleUpdate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border">
            {users.map((user, idx) => (
              <div key={user.id}
                className={`p-4 space-y-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-surface/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <MiniAvatar name={user.full_name} avatarUrl={user.avatar_url} />
                    <div>
                      <p className="font-semibold text-text-main text-sm">{user.full_name}</p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
                <RoleSelector userId={user.id} currentRole={user.role}
                  onUpdate={handleRoleUpdate} />
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
