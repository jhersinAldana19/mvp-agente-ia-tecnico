import { useCallback, useEffect, useRef, useState } from 'react'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import api from '../services/api'
import imgCarpeta from '../assets/documentos/imagen-carpeta.webp'
import fondoDocumentos from '../assets/documentos/fondo-documentos.webp'

// ─── Árbol de documentos ──────────────────────────────────────────────────────
const TREE = [
  {
    id: 'manuales',
    name: 'MANUALES DE OPERACIÓN',
    type: 'folder',
    children: [
      {
        id: 'manuales-trs4531',
        name: 'TRS4531',
        type: 'folder',
        children: [
          { id: 'cap1', name: 'Capítulo 1 – Introducción',          type: 'file', serverPath: 'manuales/trs4531/cap1-introduccion-trs4531-v1 (1).pdf' },
          { id: 'cap2', name: 'Capítulo 2 – Seguridad',             type: 'file', serverPath: 'manuales/trs4531/cap2-seguridad-trs4531-v1 (1).pdf' },
          { id: 'cap3', name: 'Capítulo 3 – Cabina',                type: 'file', serverPath: 'manuales/trs4531/cap3-cabina-trs4531-v1 (1).pdf' },
          { id: 'cap4', name: 'Capítulo 4 – Utilización de Mandos', type: 'file', serverPath: 'manuales/trs4531/cap4-utilizacionmandos-trs4531-v1 (1).pdf' },
          { id: 'cap5', name: 'Capítulo 5 – Uso del Equipo',        type: 'file', serverPath: 'manuales/trs4531/cap5-usodelequipo-trs4531-v1 (2).pdf' },
          { id: 'cap7', name: 'Capítulo 7 – Lubricación',           type: 'file', serverPath: 'manuales/trs4531/cap7-lubricacion-trs4531-v1 (1).pdf' },
          { id: 'cap9', name: 'Capítulo 9 – Especificaciones',      type: 'file', serverPath: 'manuales/trs4531/cap9-especificaciones-trs4531 (1).pdf' },
        ],
      },
    ],
  },
  {
    id: 'comercial',
    name: 'COMERCIAL',
    type: 'folder',
    children: [
      {
        id: 'bochures',
        name: 'BOCHURES',
        type: 'folder',
        children: [
          {
            id: 'bochures-trs4531',
            name: 'TRS4531',
            type: 'folder',
            children: [
              { id: 'brochure-com', name: 'Brochure Comercial TRS4531', type: 'file', serverPath: 'comercial/trs4531/Brochure Comercial TRS4531-Esp_compressed (2).pdf' },
              { id: 'brochure-tec', name: 'Brochure Técnico TRS4531',   type: 'file', serverPath: 'comercial/trs4531/TRS4531_ Brochure Técnico_ESP_compressed (2).pdf' },
            ],
          },
        ],
      },
    ],
  },
]

function resolveNode(ids) {
  if (ids.length === 0) return { id: 'root', children: TREE }
  let nodes = TREE
  let node  = null
  for (const id of ids) {
    node = nodes.find((n) => n.id === id)
    if (!node) return null
    nodes = node.children || []
  }
  return node
}

// ─── Icono PDF ────────────────────────────────────────────────────────────────
function IconPdf({ size = 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-10' : size === 'lg' ? 'w-16 h-20' : 'w-10 h-12'
  return (
    <svg className={cls} viewBox="0 0 32 40" fill="none">
      <rect width="32" height="40" rx="3" fill="#fee2e2" />
      <rect x="0" y="26" width="32" height="10" fill="#ef4444" />
      <text x="50%" y="34.5" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">PDF</text>
      <path d="M20 0 L32 12 L20 12 Z" fill="#fca5a5" />
    </svg>
  )
}

// ─── Tarjetas ─────────────────────────────────────────────────────────────────
function FolderCard({ name, onClick }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white shadow-sm
                 hover:bg-blue-50 hover:shadow-md transition-all group cursor-pointer text-center w-full">
      <img src={imgCarpeta} alt="carpeta"
        className="w-12 h-12 sm:w-14 sm:h-14 object-contain group-hover:scale-105 transition-transform" />
      <span className="text-[11px] sm:text-xs font-semibold text-text-main leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  )
}

function FileCard({ name, onClick }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white shadow-sm
                 hover:bg-blue-50 hover:shadow-md transition-all group cursor-pointer text-center w-full">
      <div className="group-hover:scale-105 transition-transform"><IconPdf /></div>
      <span className="text-[11px] sm:text-xs font-medium text-text-main leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ trail, onNavigate }) {
  return (
    <nav className="flex items-center gap-1 text-xs sm:text-sm flex-wrap min-w-0">
      <button onClick={() => onNavigate([])} className="text-primary font-medium hover:underline flex-shrink-0">
        Documentos
      </button>
      {trail.map((node, idx) => (
        <span key={node.id} className="flex items-center gap-1 min-w-0">
          <svg className="w-3 h-3 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {idx === trail.length - 1 ? (
            <span className="text-text-main font-semibold truncate max-w-[140px] sm:max-w-xs">{node.name}</span>
          ) : (
            <button onClick={() => onNavigate(trail.slice(0, idx + 1).map((n) => n.id))}
              className="text-primary hover:underline truncate max-w-[80px] sm:max-w-[160px]">
              {node.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

// ─── Visor PDF (pantalla completa dentro del panel) ───────────────────────────
function PdfViewer({ file, onBack }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState('')
  const prevUrl = useRef(null)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setBlobUrl(null)
    try {
      const resp = await api.get(
        `/documents/file?path=${encodeURIComponent(file.serverPath)}`,
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(resp.data)
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
      prevUrl.current = url
      setBlobUrl(url)
    } catch {
      setError('No se pudo cargar el documento.')
    } finally {
      setLoading(false)
    }
  }, [file])

  useEffect(() => { load() }, [load])
  useEffect(() => () => { if (prevUrl.current) URL.revokeObjectURL(prevUrl.current) }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior del visor */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-white">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80
                     transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div className="w-px h-5 bg-border flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0"><IconPdf size="sm" /></div>
          <p className="text-sm font-semibold text-text-main truncate">{file.name}</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 bg-gray-100">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2 text-text-muted">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Cargando documento…</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-center">
              {error}
            </p>
          </div>
        )}
        {blobUrl && !loading && (
          isMobile ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <IconPdf size="lg" />
                <p className="text-sm font-semibold text-text-main">{file.name}</p>
                <p className="text-xs text-text-muted">
                  Toca el botón para abrir el PDF en el visor de tu dispositivo
                </p>
              </div>
              <a href={blobUrl} download={file.name + '.pdf'}
                className="btn-primary flex items-center gap-2 text-sm px-6 py-3 rounded-xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a4 4 0 004 4h10a4 4 0 004-4v-1" />
                </svg>
                Abrir / Descargar PDF
              </a>
            </div>
          ) : (
            <iframe src={blobUrl} title={file.name} className="w-full h-full border-0" />
          )
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [pathIds, setPathIds]       = useState([])
  const [trail, setTrail]           = useState([])
  const [activeFile, setActiveFile] = useState(null)

  const currentNode = resolveNode(pathIds)
  const items   = currentNode?.children || []
  const folders = items.filter((i) => i.type === 'folder')
  const files   = items.filter((i) => i.type === 'file')

  const navigate = (ids) => {
    setPathIds(ids)
    setActiveFile(null)
    const newTrail = []
    let nodes = TREE
    for (const id of ids) {
      const node = nodes.find((n) => n.id === id)
      if (!node) break
      newTrail.push(node)
      nodes = node.children || []
    }
    setTrail(newTrail)
  }

  return (
    <TechnicianLayout fullWidth>
      <div
        className="flex flex-col rounded-xl overflow-hidden shadow-lg bg-white"
        style={{ height: 'calc(100dvh - 7rem)', minHeight: '480px' }}
      >
        {/* ── VISTA EXPLORADOR ─────────────────────────────────────────────── */}
        {!activeFile && (
          <>
            {/* Banner de imagen superior */}
            <div className="relative flex-shrink-0 h-36 sm:h-44 md:h-48 overflow-hidden bg-[#e8edf2]">
              <img src={fondoDocumentos} alt="Equipos TECPORT"
                className="w-full h-full object-contain object-center" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45 pointer-events-none" />
              <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-5">
                <h1 className="text-white text-base sm:text-lg font-bold leading-tight">
                  TECPORT · Documentos
                </h1>
              </div>
            </div>

            {/* Barra breadcrumb */}
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-border bg-[#f8fafc] flex-shrink-0">
              <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <Breadcrumb trail={trail} onNavigate={navigate} />
            </div>

            {/* Grid de carpetas y archivos */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6M5 8h14M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
                  </svg>
                  <p className="text-sm">Carpeta vacía</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {folders.length > 0 && (
                    <div>
                      <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                        Carpetas
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                        {folders.map((node) => (
                          <FolderCard key={node.id} name={node.name}
                            onClick={() => navigate([...pathIds, node.id])} />
                        ))}
                      </div>
                    </div>
                  )}
                  {files.length > 0 && (
                    <div>
                      <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                        Archivos
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                        {files.map((node) => (
                          <FileCard key={node.id} name={node.name}
                            onClick={() => setActiveFile(node)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── VISTA PDF (reemplaza el explorador) ──────────────────────────── */}
        {activeFile && (
          <PdfViewer file={activeFile} onBack={() => setActiveFile(null)} />
        )}
      </div>
    </TechnicianLayout>
  )
}
