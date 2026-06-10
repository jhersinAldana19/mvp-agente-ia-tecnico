export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="text-border mb-4">
          {icon}
        </div>
      )}
      <p className="text-text-main font-medium">{title}</p>
      {description && (
        <p className="text-text-muted text-sm mt-1">{description}</p>
      )}
    </div>
  )
}
