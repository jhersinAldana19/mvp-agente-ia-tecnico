import axios from 'axios'
import { supabase } from './supabaseClient'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message =
      error.response?.data?.detail ||
      error.message ||
      'Error de conexión con el servidor'
    if (error.code === 'ECONNABORTED') {
      message =
        'La consulta tardó demasiado. Comprueba que el backend esté en marcha e inténtalo de nuevo.'
    }
    const wrapped = new Error(message)
    if (error.response?.status) {
      wrapped.status = error.response.status
    }
    return Promise.reject(wrapped)
  }
)

export default api
