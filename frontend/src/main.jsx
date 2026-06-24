import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PrimeReactProvider } from 'primereact/api'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { SignOutDialogProvider } from './context/SignOutDialogContext'
import { ChatProvider } from './context/ChatContext'
import 'primereact/resources/themes/lara-light-blue/theme.css'
import 'primereact/resources/primereact.css'
import 'primeicons/primeicons.css'
import './styles/fonts.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PrimeReactProvider>
        <AuthProvider>
          <SignOutDialogProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </SignOutDialogProvider>
        </AuthProvider>
      </PrimeReactProvider>
    </BrowserRouter>
  </React.StrictMode>
)
