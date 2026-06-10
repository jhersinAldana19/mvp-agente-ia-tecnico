import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import Spinner from '../components/UI/Spinner'

export default function LoginPage() {
  const { session, profile, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin/history' : '/chat'} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError('Correo o contraseña incorrectos. Intenta nuevamente.')
      setIsSubmitting(false)
      return
    }

    // AuthContext detecta el cambio de sesión y fetchea el perfil automáticamente.
    // La redirección ocurre en el efecto de App.jsx cuando profile se cargue.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4"
         style={{
           background: 'linear-gradient(135deg, #001f33 0%, #003558 50%, #004A77 100%)',
         }}>
      <div className="w-full max-w-sm">
        <div className="card p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/logo-tecport.png"
              alt="TECPORT AI"
              className="h-12 w-auto mb-3"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                document.getElementById('logo-fallback').style.display = 'flex'
              }}
            />
            <div
              id="logo-fallback"
              className="hidden items-center gap-2 mb-1"
            >
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center
                              justify-center text-white font-bold text-lg">
                T
              </div>
              <span className="text-xl font-bold text-primary">TECPORT AI</span>
            </div>
            <p className="text-text-muted text-xs mt-1">Asistente técnico inteligente</p>
          </div>

          {/* Form */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-text-main">Iniciar sesión</h1>
            <p className="text-sm text-text-muted mt-1">Accede a tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-main mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted
                             hover:text-text-main"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532
                           l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0
                           8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943
                           9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2
                              rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setError('Para recuperar tu contraseña, contacta al administrador.')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2025 TECPORT AI. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
