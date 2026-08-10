import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // amazon-cognito-identity-js asume el entorno de Node (usa `global` y
  // Buffer internamente); Vite no los polyfillea por defecto en el navegador.
  define: {
    global: 'globalThis',
  },
})
