import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { HardwareProvider } from './context/HardwareContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <HardwareProvider>
        <App />
      </HardwareProvider>
    </AuthProvider>
  </StrictMode>,
)
