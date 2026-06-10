import { useNavigate } from 'react-router-dom'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import { useAuth } from '../context/AuthContext'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start py-3 border-b border-border last:border-0">
      <span className="text-sm text-text-muted w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-text-main font-medium">{value}</span>
    </div>
  )
}

function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="badge-admin capitalize">{role}</span>
  ) : (
    <span className="badge-technician capitalize">Técnico</span>
  )
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!profile) return null

  return (
    <TechnicianLayout>
      <div className="max-w-lg mx-auto">
        {/* Avatar */}
        <div className="card p-8 flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20
                          flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-text-main">{profile.full_name}</h1>
          <p className="text-text-muted text-sm mt-1">{profile.email}</p>
          <div className="mt-2">
            <RoleBadge role={profile.role} />
          </div>
        </div>

        {/* Info */}
        <div className="card p-5 mb-4">
          <h2 className="text-sm font-semibold text-text-main mb-2">Información</h2>
          <InfoRow label="Nombre completo" value={profile.full_name} />
          <InfoRow label="Correo electrónico" value={profile.email} />
          <InfoRow label="Rol" value={profile.role === 'admin' ? 'Administrador' : 'Técnico'} />
          <InfoRow label="Miembro desde" value={formatDate(profile.created_at)} />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4
                     border border-border rounded-lg text-sm text-text-muted
                     hover:bg-surface hover:text-text-main transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2
                 V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </TechnicianLayout>
  )
}
