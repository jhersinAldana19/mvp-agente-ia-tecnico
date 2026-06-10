const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`
        ${SIZE_CLASSES[size]}
        border-2 border-border border-t-primary rounded-full animate-spin
        ${className}
      `}
    />
  )
}
