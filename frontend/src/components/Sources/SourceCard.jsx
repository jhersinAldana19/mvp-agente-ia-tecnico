export default function SourceCard({ source, onViewSource }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface border border-border
                    rounded-lg hover:border-primary/30 transition-colors">
      <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-lg flex items-center
                      justify-center">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
               a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-main truncate" title={source.document_name}>
          {source.document_name}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          Página {source.page}
        </p>
        {source.snippet && (
          <p className="text-xs text-text-muted mt-1 line-clamp-2">{source.snippet}</p>
        )}
      </div>

      <button
        onClick={() => onViewSource(source)}
        className="flex-shrink-0 text-xs text-primary font-medium hover:underline
                   whitespace-nowrap"
      >
        Ver fuente
      </button>
    </div>
  )
}
