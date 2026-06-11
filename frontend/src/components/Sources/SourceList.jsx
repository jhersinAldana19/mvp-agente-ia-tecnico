import SourceCard from './SourceCard'

const MAX_VISIBLE = 5

export default function SourceList({ sources, onViewSource }) {
  if (!sources?.length) return null

  const visible = sources.slice(0, MAX_VISIBLE)

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-text-muted mb-2">
        Fuentes consultadas:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((source, idx) => (
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
