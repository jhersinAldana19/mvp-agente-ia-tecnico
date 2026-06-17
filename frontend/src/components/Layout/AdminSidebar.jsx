import { NavLink } from 'react-router-dom'
import logoTecport from '../../assets/branding/logo-tecport-blanco.webp'

export const ADMIN_NAV_ITEMS = [
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

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  )
}

export default function AdminSidebar({ onNavClick, onCollapse, onSignOut, showCollapse = false }) {
  return (
    <aside className="w-60 bg-primary flex flex-col h-full">
      <div className="p-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <img src={logoTecport} alt="TECPORT AI" className="h-10 w-auto" />
            <p className="text-white/60 text-xs mt-2">Panel administrativo</p>
          </div>
          {showCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg
                         transition-colors flex-shrink-0"
              aria-label="Ocultar menú"
              title="Ocultar menú"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Menú admin">
        {ADMIN_NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <button type="button" onClick={onSignOut} className="sidebar-item-inactive w-full">
          <SignOutIcon />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
