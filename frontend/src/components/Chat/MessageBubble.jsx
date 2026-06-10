import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import SourceList from '../Sources/SourceList'
import { useAuth } from '../../context/AuthContext'
import perfilAgente from '../../assets/agente/perfil-agente.webp'

const MD_COMPONENTS = {
  p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul:     ({ children }) => <ul className="mb-2 pl-4 list-disc space-y-0.5">{children}</ul>,
  ol:     ({ children }) => <ol className="mb-2 pl-4 list-decimal space-y-0.5">{children}</ol>,
  li:     ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-text-main">{children}</strong>,
  em:     ({ children }) => <em className="italic">{children}</em>,
  h1:     ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
  h2:     ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
  h3:     ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
  code:   ({ children }) => (
    <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
  ),
}

function SofiaAvatar() {
  return (
    <img
      src={perfilAgente}
      alt="SOFIA"
      className="flex-shrink-0 w-9 h-9 rounded-full object-cover border border-border"
    />
  )
}

function UserAvatar({ avatarUrl, name }) {
  const [broken, setBroken] = useState(false)

  if (avatarUrl && !broken) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="flex-shrink-0 w-9 h-9 rounded-full object-cover border border-border"
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-surface border border-border
                    flex items-center justify-center">
      <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24"
        stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  )
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MessageBubble({ message, onViewSource }) {
  const { profile } = useAuth()
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 items-start">
        <div className="max-w-[75%]">
          <div className="bg-primary text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm
                          leading-relaxed">
            {message.content}
          </div>
          <p className="text-xs text-text-muted mt-1 text-right">
            {formatTime(message.created_at)}
          </p>
        </div>
        <UserAvatar avatarUrl={profile?.avatar_url} name={profile?.full_name} />
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      <SofiaAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-main">SOFIA</span>
          <span className="text-xs text-text-muted">{formatTime(message.created_at)}</span>
        </div>
        <div className="card px-4 py-3 text-sm text-text-main leading-relaxed">
          <ReactMarkdown components={MD_COMPONENTS}>
            {message.content}
          </ReactMarkdown>
        </div>
        {message.sources?.length > 0 && (
          <SourceList sources={message.sources} onViewSource={onViewSource} />
        )}
      </div>
    </div>
  )
}
