import SourceCard from './SourceCard'

export default function SourceList({ sources, onViewSource }) {
  if (!sources?.length) return null

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-text-muted mb-2">
        Fuentes consultadas:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sources.map((source, idx) => (
          <SourceCard
            key={`${source.document_name}-${source.page}-${idx}`}
            source={source}
            onViewSource={onViewSource}
          />
        ))}
      </div>
    </div>
  )
}
