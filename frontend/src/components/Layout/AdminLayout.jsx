import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoTecport from '../../assets/branding/logo-tecport.png'

const NAV_ITEMS = [
  {
    to: '/admin/history',
    label: 'Historial global',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
             M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Usuarios',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87
             M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ onClose, onSignOut }) {
  return (
    <aside className="w-60 bg-primary flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/10 flex-shrink-0">
        <img src={logoTecport} alt="TECPORT AI" className="h-10 w-auto brightness-0 invert" />
        <p className="text-white/60 text-xs mt-2">Panel administrativo</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Menú admin">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Cerrar sesión (visible en mobile sidebar y en sidebar desktop) */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <button onClick={onSignOut} className="sidebar-item-inactive w-full">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Avatar del admin ─────────────────────────────────────────────────────────
function AdminAvatar({ profile }) {
  const [broken, setBroken] = useState(false)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border">
      {profile?.avatar_url && !broken ? (
        <img src={profile.avatar_url} alt={profile.full_name}
          className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <div className="w-full h-full bg-primary flex items-center justify-center
                        text-white text-xs font-semibold">
          {initials}
        </div>
      )}
    </div>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    /* h-screen + overflow-hidden en el root: la página en sí no scrollea.
       Solo el <main> interno tiene overflow-y-auto → sidebar siempre visible. */
    <div className="flex h-screen overflow-hidden bg-surface">

      {/* ── Sidebar desktop (estático, no scrollea) ───────────────────────── */}
      <div className="hidden lg:flex flex-shrink-0 h-full">
        <Sidebar onSignOut={handleSignOut} />
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              onClose={() => setSidebarOpen(false)}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      )}

      {/* ── Área derecha: header + contenido scrollable ───────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header desktop */}
        <header className="hidden lg:flex flex-shrink-0 bg-white border-b border-border
                           px-6 h-14 items-center justify-between z-10">
          <p className="text-sm font-semibold text-text-main tracking-wide">
            Panel Administrativo · TECPORT
          </p>
          <div className="flex items-center gap-3">
            <AdminAvatar profile={profile} />
            <span className="text-sm font-medium text-text-main max-w-[160px] truncate">
              {profile?.full_name || ''}
            </span>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-text-muted
                         hover:text-text-main transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Header mobile */}
        <header className="lg:hidden flex-shrink-0 bg-white border-b border-border
                           px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src={logoTecport} alt="TECPORT AI" className="h-7 w-auto" />
        </header>

        {/* Contenido — único elemento que scrollea */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  )
}
