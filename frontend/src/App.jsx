import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AdminHistoryPage from './pages/AdminHistoryPage'
import AdminUsersPage from './pages/AdminUsersPage'
import DocumentsPage from './pages/DocumentsPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import TechnicianChatPage from './pages/TechnicianChatPage'
import TechnicianHistoryPage from './pages/TechnicianHistoryPage'
import Spinner from './components/UI/Spinner'

function ProtectedRoute({ allowedRole }) {
  const { session, profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return <Navigate to="/" replace />

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center">
          <p className="text-text-muted">
            Tu perfil no está configurado. Contacta al administrador.
          </p>
        </div>
      </div>
    )
  }

  if (profile.role !== allowedRole) {
    const redirect = profile.role === 'admin' ? '/admin/history' : '/chat'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRole="technician" />}>
        <Route path="/chat" element={<TechnicianChatPage />} />
        <Route path="/history" element={<TechnicianHistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin/history" element={<AdminHistoryPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
