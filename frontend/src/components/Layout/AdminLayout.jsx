import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from 'primereact/avatar'
import { Button } from 'primereact/button'
import { Sidebar } from 'primereact/sidebar'
import { Toolbar } from 'primereact/toolbar'
import { useAuth } from '../../context/AuthContext'
import { useAdminSidebar } from '../../hooks/useAdminSidebar'
import { useSignOutRequest } from '../../context/SignOutDialogContext'
import AdminSidebar from './AdminSidebar'
import logoTecport from '../../assets/branding/logo-tecport-blanco.webp'

const SIDEBAR_WIDTH = '15rem'

function userInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function AdminLayout({ children, bgImage = null }) {
  const {
    desktopCollapsed,
    mobileOpen,
    collapseDesktop,
    expandDesktop,
    openMobile,
    closeMobile,
  } = useAdminSidebar()

  const { profile } = useAuth()
  const requestSignOut = useSignOutRequest()
  const [avatarBroken, setAvatarBroken] = useState(false)

  const profileName = profile?.full_name || ''
  const hasAvatar = profile?.avatar_url && !avatarBroken

  const headerStart = (
    <div className="flex items-center gap-3 min-w-0">
      {desktopCollapsed && (
        <Button
          type="button"
          icon="pi pi-bars"
          rounded
          text
          severity="secondary"
          aria-label="Abrir menú"
          title="Abrir menú"
          className="admin-header-menu-btn"
          onClick={expandDesktop}
        />
      )}
      <p className="text-sm font-semibold text-text-muted tracking-wide uppercase truncate">
        Panel Administrativo
      </p>
    </div>
  )

  const headerEnd = (
    <div className="flex items-center gap-3 flex-shrink-0">
      <Link
        to="/admin/profile"
        className="flex items-center gap-3 hover:opacity-90 transition-opacity rounded-lg no-underline"
        title="Mi perfil"
      >
        {hasAvatar ? (
          <Avatar
            image={profile.avatar_url}
            shape="circle"
            size="large"
            onImageError={() => setAvatarBroken(true)}
          />
        ) : (
          <Avatar
            label={userInitials(profileName)}
            shape="circle"
            size="large"
            style={{ backgroundColor: '#003558', color: '#ffffff', fontWeight: 700 }}
          />
        )}
        <span className="text-sm font-semibold text-text-main max-w-[160px] truncate hidden xl:inline">
          {profileName}
        </span>
      </Link>
      <span className="hidden xl:block w-px h-8 bg-border" aria-hidden="true" />
      <Button
        type="button"
        label="Cerrar sesión"
        icon="pi pi-sign-out"
        text
        severity="secondary"
        className="hidden xl:inline-flex admin-header-signout"
        onClick={requestSignOut}
      />
    </div>
  )

  const mobileHeader = (
    <header className="lg:hidden flex-shrink-0 bg-white border-b border-border admin-header-toolbar">
      <Toolbar
        start={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              icon="pi pi-bars"
              rounded
              text
              severity="secondary"
              aria-label="Abrir menú"
              onClick={openMobile}
            />
            <img src={logoTecport} alt="TECPORT AI" className="h-8 w-auto brightness-0" />
          </div>
        }
        className="admin-header-toolbar-inner border-0 shadow-none bg-transparent w-full"
      />
    </header>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <div
        className="hidden lg:block flex-shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: desktopCollapsed ? 0 : SIDEBAR_WIDTH }}
        aria-hidden={desktopCollapsed}
      >
        <div className="h-full" style={{ width: SIDEBAR_WIDTH }}>
          <AdminSidebar
            showCollapse
            onCollapse={collapseDesktop}
            onSignOut={requestSignOut}
          />
        </div>
      </div>

      {/* Mobile sidebar — PrimeReact Sidebar */}
      <Sidebar
        visible={mobileOpen}
        onHide={closeMobile}
        position="left"
        showCloseIcon={false}
        className="admin-mobile-sidebar p-0"
        style={{ width: SIDEBAR_WIDTH }}
        blockScroll
      >
        <AdminSidebar onNavClick={closeMobile} onSignOut={requestSignOut} />
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop header — más alto con PrimeReact Toolbar */}
        <header className="hidden lg:block flex-shrink-0 bg-white border-b border-border shadow-sm admin-header-toolbar">
          <Toolbar
            start={headerStart}
            end={headerEnd}
            className="admin-header-toolbar-inner border-0 shadow-none bg-transparent w-full"
          />
        </header>

        {mobileHeader}

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6"
          style={bgImage ? {
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          } : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
