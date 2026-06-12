import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoTecport from '../../assets/branding/logo-tecport.png'

const NAV_ITEMS = [
  { to: '/chat',      label: 'Chat' },
  { to: '/history',   label: 'Historial' },
  { to: '/documents', label: 'Documentos' },
  { to: '/profile',   label: 'Perfil' },
]

function UserChip({ profile }) {
  const [broken, setBroken] = useState(false)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex items-center gap-2">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border">
        {profile?.avatar_url && !broken ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="w-full h-full bg-primary flex items-center justify-center
                          text-white text-xs font-semibold">
            {initials}
          </div>
        )}
      </div>
      {/* Nombre — solo visible en pantallas medianas+ */}
      <span className="hidden md:block text-sm font-medium text-text-main max-w-[120px] truncate">
        {profile?.full_name || ''}
      </span>
    </div>
  )
}

export default function TechnicianLayout({ children, fullWidth = false }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="bg-white border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 lg:h-20">

            {/* Logo */}
            <div className="flex items-center">
              <img src={logoTecport} alt="TECPORT AI" className="h-8 lg:h-14 w-auto" />
            </div>

            {/* Nav */}
            <nav className="flex items-center" aria-label="Navegación principal">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    isActive ? 'nav-tab-active' : 'nav-tab-inactive'
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Usuario + logout */}
            <div className="flex items-center gap-3">
              <UserChip profile={profile} />
              <button
                onClick={handleSignOut}
                className="text-text-muted hover:text-text-main p-2 rounded-lg
                           hover:bg-surface transition-colors"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </header>

      <main className={`flex-1 w-full px-4 py-6 ${fullWidth ? '' : 'max-w-4xl mx-auto'}`}>
        {children}
      </main>
    </div>
  )
}
