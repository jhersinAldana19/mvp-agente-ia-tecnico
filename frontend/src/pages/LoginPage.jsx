import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import Spinner from '../components/UI/Spinner'
import fondoLogin from '../assets/login/fondo-login.webp'
import logoTecport from '../assets/branding/logo-tecport.png'

function EyeIcon({ open }) {
  return open ? (
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
  )
}

export default function LoginPage() {
  const { session, profile, isLoading } = useAuth()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EAEAEA]">
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
    }
  }

  return (
    <div className="flex h-screen bg-[#EAEAEA]">

      {/* ── Panel izquierdo: imagen ── */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src={fondoLogin}
          alt="TECPORT operaciones"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay sutil para dar profundidad */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-12 py-10 bg-white
                      shadow-2xl relative z-10">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img
            src={logoTecport}
            alt="TECPORT"
            className="h-16 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Encabezado */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-wide text-text-main uppercase">
            Iniciar sesión
          </h1>
          <p className="text-sm text-text-muted mt-1">Agente técnico inteligente</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          <div>
            <label htmlFor="email"
                   className="block text-sm font-medium text-text-main mb-1.5">
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
            <label htmlFor="password"
                   className="block text-sm font-medium text-text-main mb-1.5">
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
                           hover:text-text-main transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm
                            px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="text-right -mt-1">
            <button
              type="button"
              className="text-sm text-text-muted hover:text-primary transition-colors"
              onClick={() =>
                setError('Para recuperar tu contraseña, contacta al administrador.')
              }
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3
                       text-sm font-semibold tracking-wide uppercase"
          >
            {isSubmitting ? <Spinner size="sm" /> : null}
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-auto pt-10 text-xs text-text-muted text-center">
          © 2026 TECPORT. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
