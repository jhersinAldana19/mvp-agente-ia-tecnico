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
  if (ids.length === 0) return { id: 'root', name: 'Documentos', type: 'folder', children: TREE }
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
  const cls = size === 'sm' ? 'w-8 h-10' : 'w-10 h-12'
  return (
    <svg className={cls} viewBox="0 0 32 40" fill="none">
      <rect width="32" height="40" rx="3" fill="#fee2e2" />
      <rect x="0" y="26" width="32" height="10" rx="0" fill="#ef4444" />
      <text x="50%" y="34.5" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">PDF</text>
      <path d="M20 0 L32 12 L20 12 Z" fill="#fca5a5" />
    </svg>
  )
}

// ─── Tarjeta carpeta ──────────────────────────────────────────────────────────
function FolderCard({ name, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-white shadow-sm
                 hover:bg-blue-50 hover:shadow-md transition-all group cursor-pointer text-center w-full"
    >
      <img src={imgCarpeta} alt="carpeta"
        className="w-12 h-12 sm:w-16 sm:h-16 object-contain group-hover:scale-105 transition-transform" />
      <span className="text-[11px] sm:text-xs font-semibold text-text-main leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  )
}

// ─── Tarjeta archivo ──────────────────────────────────────────────────────────
function FileCard({ name, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl shadow-sm transition-all
                  cursor-pointer text-center w-full group
                  ${active ? 'bg-blue-100 shadow-md' : 'bg-white hover:bg-blue-50 hover:shadow-md'}`}
    >
      <div className="group-hover:scale-105 transition-transform">
        <IconPdf />
      </div>
      <span className="text-[11px] sm:text-xs font-medium text-text-main leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  )
}

// ─── Visor PDF ────────────────────────────────────────────────────────────────
function PdfViewer({ file, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState('')
  const prevUrl = useRef(null)

  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const load = useCallback(async () => {
    if (!file) return
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

  const openInTab = () => {
    if (blobUrl) window.open(blobUrl, '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex-shrink-0"><IconPdf size="sm" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-text-main truncate">{file.name}</p>
        </div>
        {blobUrl && (
          <button onClick={openInTab}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface text-text-muted
                       hover:text-text-main transition-colors"
            title="Abrir en nueva pestaña">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
        <button onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface text-text-muted
                     hover:text-text-main transition-colors"
          title="Cerrar visor">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
          isMobileDevice ? (
            /* En móvil: iframe + botón de respaldo visible */
            <div className="flex flex-col h-full">
              <iframe
                src={blobUrl}
                title={file.name}
                className="flex-1 w-full border-0"
              />
              <div className="flex-shrink-0 p-3 bg-white border-t border-border flex gap-2 justify-center">
                <button
                  onClick={openInTab}
                  className="btn-primary flex items-center gap-2 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir en Safari / navegador
                </button>
              </div>
            </div>
          ) : (
            <iframe
              src={blobUrl}
              title={file.name}
              className="w-full h-full border-0"
            />
          )
        )}
      </div>
    </div>
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
            <span className="text-text-main font-semibold truncate max-w-[120px] sm:max-w-none">{node.name}</span>
          ) : (
            <button
              onClick={() => onNavigate(trail.slice(0, idx + 1).map((n) => n.id))}
              className="text-primary hover:underline truncate max-w-[80px] sm:max-w-none"
            >
              {node.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [pathIds, setPathIds]       = useState([])
  const [trail, setTrail]           = useState([])
  const [activeFile, setActiveFile] = useState(null)

  const currentNode = resolveNode(pathIds)
  const items  = currentNode?.children || []
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

  const openFolder = (node) => navigate([...pathIds, node.id])
  const openFile   = (node) => setActiveFile((prev) => (prev?.id === node.id ? null : node))

  return (
    <TechnicianLayout fullWidth bgImage={fondoDocumentos}>
      <div
        className="flex gap-0 rounded-xl overflow-hidden shadow-lg bg-white/95 backdrop-blur-sm"
        style={{ height: 'calc(100dvh - 7rem)', minHeight: '480px' }}
      >
        {/* ── Browser panel ──────────────────────────────────────────────── */}
        <div
          className={`flex flex-col border-r border-border overflow-hidden transition-all duration-200
            ${activeFile ? 'w-full lg:w-[45%]' : 'w-full'}`}
        >
          {/* Barra breadcrumb */}
          <div className="flex items-center gap-2 px-3 sm:px-5 py-3 border-b border-border flex-shrink-0 bg-[#f8fafc]">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <Breadcrumb trail={trail} onNavigate={navigate} />
          </div>

          {/* Grid de items */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6M5 8h14M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
                </svg>
                <p className="text-sm">Carpeta vacía</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {folders.length > 0 && (
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 sm:mb-3">
                      Carpetas
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {folders.map((node) => (
                        <FolderCard key={node.id} name={node.name} onClick={() => openFolder(node)} />
                      ))}
                    </div>
                  </div>
                )}
                {files.length > 0 && (
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 sm:mb-3">
                      Archivos
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {files.map((node) => (
                        <FileCard key={node.id} name={node.name}
                          active={activeFile?.id === node.id}
                          onClick={() => openFile(node)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel PDF desktop ───────────────────────────────────────────── */}
        {activeFile && (
          <div className="hidden lg:flex flex-col flex-1 min-w-0">
            <PdfViewer file={activeFile} onClose={() => setActiveFile(null)} />
          </div>
        )}

        {/* ── Modal PDF móvil ─────────────────────────────────────────────── */}
        {activeFile && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
            <PdfViewer file={activeFile} onClose={() => setActiveFile(null)} />
          </div>
        )}
      </div>
    </TechnicianLayout>
  )
}
