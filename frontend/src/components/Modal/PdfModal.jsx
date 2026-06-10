import { useEffect } from 'react'

export default function PdfModal({ isOpen, onClose, source }) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !source) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl
                      max-h-[90vh] flex flex-col overflow-hidden z-10">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0">
            <h2 id="pdf-modal-title" className="font-semibold text-text-main text-sm truncate">
              {source.document_name}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Página {source.page}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-text-muted hover:text-text-main hover:bg-surface
                       rounded-lg transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {source.page_image_url ? (
            <img
              src={source.page_image_url}
              alt={`Página ${source.page} de ${source.document_name}`}
              className="w-full rounded-lg border border-border"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-border mb-3" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                     a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-text-muted text-sm">
                Vista previa no disponible para esta página.
              </p>
            </div>
          )}

          {source.snippet && (
            <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
              <p className="text-xs font-medium text-text-muted mb-1">Fragmento relevante</p>
              <p className="text-sm text-text-main">{source.snippet}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
