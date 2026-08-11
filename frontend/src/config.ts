function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Falta la variable de entorno ${name} (revisa tu .env.local)`)
  return value
}

export const config = {
  postgrestUrl: required('VITE_POSTGREST_URL', import.meta.env.VITE_POSTGREST_URL),
  cognito: {
    region: required('VITE_COGNITO_REGION', import.meta.env.VITE_COGNITO_REGION),
    userPoolId: required('VITE_COGNITO_USER_POOL_ID', import.meta.env.VITE_COGNITO_USER_POOL_ID),
    clientId: required('VITE_COGNITO_CLIENT_ID', import.meta.env.VITE_COGNITO_CLIENT_ID),
  },
  // Lambda Function URL que crea usuarios en Cognito (admin/agente).
  crearUsuarioUrl: required('VITE_CREAR_USUARIO_URL', import.meta.env.VITE_CREAR_USUARIO_URL),
}
