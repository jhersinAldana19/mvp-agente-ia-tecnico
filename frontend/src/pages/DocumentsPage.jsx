import { useCallback, useEffect, useRef, useState } from 'react'
import TechnicianLayout from '../components/Layout/TechnicianLayout'
import api from '../services/api'
import imgCarpeta from '../assets/documentos/imagen-carpeta.webp'

// ─── Árbol de documentos (estructura estática) ────────────────────────────────
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

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Dado un array de IDs de breadcrumb, devuelve el nodo actual del árbol */
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

// ─── Iconos ───────────────────────────────────────────────────────────────────

function IconPdf() {
  return (
    <svg className="w-10 h-12 text-red-500" viewBox="0 0 32 40" fill="none">
      <rect width="32" height="40" rx="3" fill="#fee2e2" />
      <rect x="0" y="24" width="32" height="10" rx="0" fill="#ef4444" />
      <text x="50%" y="33" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">PDF</text>
      <path d="M20 0 L32 12 L20 12 Z" fill="#fca5a5" />
      <path d="M20 0 L32 12 L20 12 V0Z" fill="#ef4444" opacity="0.4" />
    </svg>
  )
}

// ─── Tarjeta de carpeta ───────────────────────────────────────────────────────

function FolderCard({ name, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border
                 bg-white hover:border-primary/40 hover:shadow-md transition-all group
                 cursor-pointer text-center w-full"
    >
      <img src={imgCarpeta} alt="carpeta" className="w-16 h-16 object-contain
                group-hover:scale-105 transition-transform" />
      <span className="text-xs font-semibold text-text-main leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  )
}

// ─── Tarjeta de archivo ───────────────────────────────────────────────────────

function FileCard({ name, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                  cursor-pointer text-center w-full group
                  ${active
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border bg-white hover:border-primary/40 hover:shadow-md'
                  }`}
    >
      <div className="group-hover:scale-105 transition-transform">
        <IconPdf />
      </div>
      <span className="text-xs font-medium text-text-main leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  )
}

// ─── Viewer PDF ───────────────────────────────────────────────────────────────

function PdfViewer({ file, onClose }) {
  const [blobUrl, setBlobUrl]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const prevUrl = useRef(null)

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

  return (
    <div className="flex flex-col h-full">
      {/* Header del viewer */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-white">
        <div className="flex-shrink-0"><IconPdf /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-main truncate">{file.name}</p>
          <p className="text-xs text-text-muted truncate">{file.serverPath}</p>
        </div>
        <button onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface text-text-muted
                     hover:text-text-main transition-colors"
          title="Cerrar visor">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Cargando documento…</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
              {error}
            </p>
          </div>
        )}
        {blobUrl && !loading && (
          <iframe
            src={blobUrl}
            title={file.name}
            className="w-full h-full border-0"
          />
        )}
      </div>
    </div>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ trail, onNavigate }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      <button
        onClick={() => onNavigate([])}
        className="text-primary font-medium hover:underline"
      >
        Documentos
      </button>
      {trail.map((node, idx) => (
        <span key={node.id} className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5l7 7-7 7" />
          </svg>
          {idx === trail.length - 1 ? (
            <span className="text-text-main font-semibold">{node.name}</span>
          ) : (
            <button
              onClick={() => onNavigate(trail.slice(0, idx + 1).map((n) => n.id))}
              className="text-primary hover:underline"
            >
              {node.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [pathIds, setPathIds]       = useState([])   // IDs del breadcrumb actual
  const [trail, setTrail]           = useState([])   // nodos del breadcrumb
  const [activeFile, setActiveFile] = useState(null) // archivo seleccionado

  const currentNode = resolveNode(pathIds)
  const items = currentNode?.children || []

  const navigate = (ids) => {
    setPathIds(ids)
    setActiveFile(null)
    // Reconstruir trail
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

  const openFile = (node) => {
    setActiveFile((prev) => (prev?.id === node.id ? null : node))
  }

  const folders = items.filter((i) => i.type === 'folder')
  const files   = items.filter((i) => i.type === 'file')

  return (
    <TechnicianLayout fullWidth>
      <div
        className="flex gap-0 rounded-xl border border-border overflow-hidden bg-white shadow-sm"
        style={{ height: 'calc(100dvh - 7rem)', minHeight: '500px' }}
      >

        {/* ── Panel izquierdo: browser ─────────────────────────────────────── */}
        <div
          className={`flex flex-col border-r border-border overflow-hidden transition-all
            ${activeFile ? 'w-full lg:w-[46%]' : 'w-full'}`}
        >
          {/* Barra superior */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0 bg-[#f8fafc]">
            <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <Breadcrumb trail={trail} onNavigate={navigate} />
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-5">
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
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Carpetas
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {folders.map((node) => (
                        <FolderCard key={node.id} name={node.name}
                          onClick={() => openFolder(node)} />
                      ))}
                    </div>
                  </div>
                )}
                {files.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Archivos
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

        {/* ── Panel derecho: visor PDF ─────────────────────────────────────── */}
        {activeFile && (
          <div className="hidden lg:flex flex-col flex-1 min-w-0">
            <PdfViewer file={activeFile} onClose={() => setActiveFile(null)} />
          </div>
        )}

        {/* ── Modal móvil: visor PDF ───────────────────────────────────────── */}
        {activeFile && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white">
            <PdfViewer file={activeFile} onClose={() => setActiveFile(null)} />
          </div>
        )}

      </div>
    </TechnicianLayout>
  )
}
