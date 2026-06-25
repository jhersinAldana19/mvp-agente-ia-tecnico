import { useRef, useState } from 'react'
import AdminLayout from '../components/Layout/AdminLayout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import api from '../services/api'
import Spinner from '../components/UI/Spinner'
import fondoPerfil from '../assets/perfil/fondo-perfil.webp'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start py-3 border-b border-border last:border-0">
      <span className="text-sm text-text-muted w-32 sm:w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-text-main font-medium min-w-0 break-all">{value}</span>
    </div>
  )
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB   = 2

export default function AdminProfilePage() {
  const { profile, session, refreshProfile } = useAuth()
  const fileRef = useRef(null)

  const [uploading, setUploading]         = useState(false)
  const [uploadError, setUploadError]     = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [imgBroken, setImgBroken]         = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue]     = useState('')
  const [savingName, setSavingName]   = useState(false)
  const [nameError, setNameError]     = useState('')

  const startEditName = () => {
    setNameValue(profile.full_name === 'Sin nombre' ? '' : profile.full_name)
    setNameError('')
    setEditingName(true)
  }

  const saveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed) { setNameError('El nombre no puede estar vacío.'); return }
    setSavingName(true)
    try {
      await api.patch('/auth/me', { full_name: trimmed })
      await refreshProfile()
      setEditingName(false)
    } catch {
      setNameError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSavingName(false)
    }
  }

  const handleAvatarClick = () => {
    setUploadError('')
    setUploadSuccess(false)
    setImgBroken(false)
    fileRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Solo se permiten imágenes JPG, PNG o WebP.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`La imagen no debe superar ${MAX_SIZE_MB} MB.`)
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const ext  = file.name.split('.').pop()
      const path = `${session.user.id}/avatar.${ext}`
      const { error: storageError } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (storageError) throw new Error(storageError.message)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await api.patch('/auth/me', { avatar_url: publicUrl })
      await refreshProfile()
      setUploadSuccess(true)
    } catch (err) {
      setUploadError(err.message || 'Error al subir la imagen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!profile) return null

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-text-main">Mi Perfil</h1>
          <p className="text-sm text-text-muted mt-0.5">Edita tu nombre y foto de perfil</p>
        </div>

        <div className="card overflow-hidden mb-6">
          {/* Banner de portada */}
          <div className="h-32 w-full overflow-hidden">
            <img src={fondoPerfil} alt="portada" className="w-full h-full object-cover" />
          </div>

          {/* Avatar — flota sobre el banner */}
          <div className="flex flex-col items-center px-8 pb-8">
            <div className="relative -mt-12 mb-4 group">
              <div onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full overflow-hidden cursor-pointer
                           border-4 border-white shadow-md hover:border-primary transition-colors relative">
                {profile.avatar_url && !imgBroken ? (
                  <img src={profile.avatar_url} alt={profile.full_name}
                    className="w-full h-full object-cover"
                    onError={() => setImgBroken(true)} />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0
                                group-hover:opacity-100 transition-opacity flex items-center
                                justify-center pointer-events-none">
                  {uploading ? <Spinner size="sm" /> : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86
                           a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0
                           01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleFileChange} />
            </div>

            {uploading && <p className="text-xs text-text-muted mb-2">Subiendo imagen...</p>}
            {uploadSuccess && !uploading && (
              <p className="text-xs text-green-600 mb-2">Foto actualizada correctamente.</p>
            )}
            {uploadError && (
              <p className="text-xs text-red-600 mb-2 text-center max-w-xs">{uploadError}</p>
            )}
            <p className="text-xs text-text-muted mb-4">
              Haz clic en la foto para cambiarla (JPG/PNG/WebP · máx. 2 MB)
            </p>

            {/* Nombre editable */}
            {editingName ? (
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <input autoFocus value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="input-field text-center text-sm"
                  placeholder="Tu nombre completo" />
                {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                <div className="flex gap-2">
                  <button onClick={saveName} disabled={savingName}
                    className="btn-primary px-4 py-1.5 text-xs">
                    {savingName ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditingName(false)}
                    className="px-4 py-1.5 text-xs border border-border rounded-lg
                               text-text-muted hover:bg-surface transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-text-main">{profile.full_name}</h2>
                <button onClick={startEditName}
                  className="text-text-muted hover:text-primary transition-colors" title="Editar nombre">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                         m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-text-muted text-sm mt-1">{profile.email}</p>
            <span className="badge-admin mt-2">Admin</span>
          </div>
        </div>

        {/* Información */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-main mb-2">Información</h2>
          <InfoRow label="Nombre completo"    value={profile.full_name} />
          <InfoRow label="Correo electrónico" value={profile.email} />
          <InfoRow label="Rol"                value="Administrador" />
          <InfoRow label="Miembro desde"      value={formatDate(profile.created_at)} />
        </div>
      </div>
    </AdminLayout>
  )
}
