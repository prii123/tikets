import { Buffer } from 'buffer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// amazon-cognito-identity-js usa Buffer internamente (cálculos SRP);
// Vite no polyfillea los globals de Node como Webpack, hay que exponerlo.
window.Buffer = window.Buffer ?? Buffer

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
