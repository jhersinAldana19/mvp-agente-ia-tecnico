export default function ChatInput({ value, onChange, onSubmit, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="flex items-end gap-2 p-4 bg-white border-t border-border">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu pregunta técnica..."
        disabled={disabled}
        rows={1}
        className="flex-1 input-field resize-none overflow-hidden leading-relaxed"
        style={{ minHeight: '40px', maxHeight: '120px' }}
        onInput={(e) => {
          e.target.style.height = 'auto'
          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
        }}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-lg
                   flex items-center justify-center hover:bg-primary-hover
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Enviar pregunta"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )
}
