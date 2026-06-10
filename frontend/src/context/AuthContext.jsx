import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile()
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          await fetchProfile()
        } else {
          setProfile(null)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshProfile = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
