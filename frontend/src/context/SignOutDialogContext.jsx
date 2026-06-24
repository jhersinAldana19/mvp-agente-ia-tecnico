import { createContext, useContext } from 'react'
import { useSignOutDialog } from '../hooks/useSignOutDialog'

const SignOutDialogContext = createContext(null)

export function SignOutDialogProvider({ children }) {
  const signOut = useSignOutDialog()

  return (
    <SignOutDialogContext.Provider value={signOut}>
      {signOut.signOutDialog}
      {children}
    </SignOutDialogContext.Provider>
  )
}

export function useSignOutRequest() {
  const ctx = useContext(SignOutDialogContext)
  if (!ctx) {
    throw new Error('useSignOutRequest debe usarse dentro de SignOutDialogProvider')
  }
  return ctx.requestSignOut
}
