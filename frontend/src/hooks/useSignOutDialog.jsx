import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { useAuth } from '../context/AuthContext'

export function useSignOutDialog() {
  const [visible, setVisible] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const requestSignOut = () => setVisible(true)

  const handleSignOut = async () => {
    setVisible(false)
    await signOut()
    navigate('/')
  }

  const signOutDialog = (
    <Dialog
      visible={visible}
      onHide={() => setVisible(false)}
      header=" "
      closable
      modal
      dismissableMask
      draggable={false}
      resizable={false}
      className="signout-dialog"
      style={{ width: '26rem', maxWidth: '92vw' }}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            label="Cancelar"
            className="admin-btn-secondary"
            onClick={() => setVisible(false)}
          />
          <Button
            type="button"
            label="Sí, cerrar sesión"
            className="admin-btn-primary"
            onClick={handleSignOut}
          />
        </div>
      }
    >
      <p className="text-text-main text-base leading-relaxed m-0">
        ¿Estás seguro de que deseas cerrar sesión?
      </p>
    </Dialog>
  )

  return { requestSignOut, signOutDialog }
}
