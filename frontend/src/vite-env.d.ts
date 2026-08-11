/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTGREST_URL: string
  readonly VITE_COGNITO_REGION: string
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_CREAR_USUARIO_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  Buffer: typeof globalThis.Buffer
}
