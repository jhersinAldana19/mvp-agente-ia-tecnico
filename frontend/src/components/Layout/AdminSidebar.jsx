import { NavLink } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Menu } from 'primereact/menu'
import logoTecport from '../../assets/branding/logo-tecport-blanco.webp'

export const ADMIN_NAV_ITEMS = [
  { to: '/admin/history', label: 'Historial global', icon: 'pi pi-clipboard' },
  { to: '/admin/users',   label: 'Usuarios',        icon: 'pi pi-users' },
]

function NavItemTemplate(item, onNavClick) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavClick}
      className={({ isActive }) =>
        `admin-sidebar-link${isActive ? ' admin-sidebar-link-active' : ''}`
      }
    >
      <i className={`${item.icon} admin-sidebar-link-icon`} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function AdminSidebar({ onNavClick, onCollapse, onSignOut, showCollapse = false }) {
  const menuModel = ADMIN_NAV_ITEMS.map((entry) => ({
    ...entry,
    template: (item) => NavItemTemplate(item, onNavClick),
  }))

  return (
    <aside className="w-60 bg-primary flex flex-col h-full admin-prime-sidebar">
      <div className="p-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <img src={logoTecport} alt="TECPORT AI" className="h-10 w-auto" />
            <p className="text-white/60 text-xs mt-2">Panel administrativo</p>
          </div>
          {showCollapse && (
            <Button
              type="button"
              icon="pi pi-times"
              rounded
              text
              aria-label="Ocultar menú"
              title="Ocultar menú"
              className="admin-sidebar-icon-btn"
              onClick={onCollapse}
            />
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto" aria-label="Menú admin">
        <Menu model={menuModel} className="admin-sidebar-menu" />
      </nav>

      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <Button
          type="button"
          label="Cerrar sesión"
          icon="pi pi-sign-out"
          text
          className="admin-sidebar-signout w-full"
          onClick={onSignOut}
        />
      </div>
    </aside>
  )
}
