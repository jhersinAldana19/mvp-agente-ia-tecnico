import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminSidebar } from '../../hooks/useAdminSidebar'
import AdminSidebar, { MenuIcon } from './AdminSidebar'
import logoTecport from '../../assets/branding/logo-tecport-blanco.webp'

const SIDEBAR_WIDTH = '15rem' // w-60

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

function SidebarToggle({ onClick, label = 'Abrir menú' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface
                 transition-colors flex-shrink-0"
      aria-label={label}
      title={label}
    >
      <MenuIcon />
    </button>
  )
}

export default function AdminLayout({ children }) {
  const {
    desktopCollapsed,
    mobileOpen,
    collapseDesktop,
    expandDesktop,
    openMobile,
    closeMobile,
  } = useAdminSidebar()

  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const showDesktopExpand = desktopCollapsed

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar — animates width */}
      <div
        className="hidden lg:block flex-shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: desktopCollapsed ? 0 : SIDEBAR_WIDTH }}
        aria-hidden={desktopCollapsed}
      >
        <div className="h-full" style={{ width: SIDEBAR_WIDTH }}>
          <AdminSidebar
            showCollapse
            onCollapse={collapseDesktop}
            onSignOut={handleSignOut}
          />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeMobile} aria-hidden="true" />
          <div className="absolute left-0 top-0 h-full shadow-xl">
            <AdminSidebar onNavClick={closeMobile} onSignOut={handleSignOut} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop header */}
        <header className="hidden lg:flex flex-shrink-0 bg-white border-b border-border shadow-sm
                           px-4 xl:px-6 h-14 items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {showDesktopExpand && <SidebarToggle onClick={expandDesktop} />}
            <p className="text-sm font-semibold text-text-muted tracking-wide uppercase truncate">
              Panel Administrativo
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/admin/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity rounded-full"
              title="Mi perfil">
              <AdminAvatar profile={profile} />
              <span className="text-sm font-medium text-text-main max-w-[140px] truncate hidden xl:inline">
                {profile?.full_name || ''}
              </span>
            </Link>
            <div className="w-px h-5 bg-border hidden xl:block" />
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden xl:flex items-center gap-1.5 text-sm text-text-muted
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

        {/* Mobile header */}
        <header className="lg:hidden flex-shrink-0 bg-white border-b border-border
                           px-4 h-14 flex items-center gap-3">
          <SidebarToggle onClick={openMobile} />
          <img src={logoTecport} alt="TECPORT AI" className="h-7 w-auto" />
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
