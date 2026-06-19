import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

/** Active chat session — survives route changes; clears on logout or full reload. */
export function ChatProvider({ children }) {
  const { session } = useAuth()
  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(null)

  useEffect(() => {
    if (!session) {
      setMessages([])
      setSessionId(null)
    }
  }, [session])

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        sessionId,
        setSessionId,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat debe usarse dentro de ChatProvider')
  return ctx
}
