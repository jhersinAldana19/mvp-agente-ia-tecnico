import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from 'primereact/button'
import { useAuth } from '../../context/AuthContext'
import { useSignOutRequest } from '../../context/SignOutDialogContext'
import logoTecport from '../../assets/branding/logo-tecport.png'

const NAV_ITEMS = [
  { to: '/chat',      label: 'Chat' },
  { to: '/history',   label: 'Historial' },
  { to: '/documents', label: 'Documentos' },
]

function UserChip({ profile }) {
  const [broken, setBroken] = useState(false)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
      title="Ver perfil"
    >
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
      <span className="hidden md:block text-sm font-medium text-text-main max-w-[120px] truncate">
        {profile?.full_name || ''}
      </span>
    </Link>
  )
}

const MAX_WIDTH_CLASS = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: '',
}

export default function TechnicianLayout({
  children,
  fullWidth = false,
  maxWidth = '4xl',
  bgImage = null,
}) {
  const { profile } = useAuth()
  const requestSignOut = useSignOutRequest()
  const widthClass = fullWidth ? MAX_WIDTH_CLASS.full : (MAX_WIDTH_CLASS[maxWidth] || MAX_WIDTH_CLASS['4xl'])

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="bg-white border-b border-border sticky top-0 z-20">
        <div className={`${widthClass} mx-auto px-4 w-full`}>
          <div className="flex items-center justify-between h-14 lg:h-20">

            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <img src={logoTecport} alt="TECPORT AI" className="h-6 sm:h-8 lg:h-14 w-auto" />
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

            {/* Avatar (→ perfil) + logout */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <UserChip profile={profile} />
              <Button
                type="button"
                icon="pi pi-sign-out"
                rounded
                text
                severity="secondary"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                onClick={requestSignOut}
              />
            </div>

          </div>
        </div>
      </header>

      <main
        className={`flex-1 w-full px-4 py-6 ${widthClass} mx-auto`}
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {children}
      </main>
    </div>
  )
}
