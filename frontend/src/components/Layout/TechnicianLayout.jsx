import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoTecport from '../../assets/branding/logo-tecport.png'

const NAV_ITEMS = [
  { to: '/chat', label: 'Chat' },
  { to: '/history', label: 'Historial' },
  { to: '/profile', label: 'Perfil' },
]

export default function TechnicianLayout({ children }) {
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
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center">
              <img
                src={logoTecport}
                alt="TECPORT AI"
                className="h-8 w-auto"
              />
            </div>

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
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
