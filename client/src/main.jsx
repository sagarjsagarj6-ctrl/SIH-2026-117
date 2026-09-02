import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { HardwareProvider } from './context/HardwareContext'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <HardwareProvider>
          <App />
        </HardwareProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
