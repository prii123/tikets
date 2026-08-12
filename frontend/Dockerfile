# Vite incrusta las variables VITE_* en el bundle en tiempo de build (no de
# arranque del contenedor), por eso se reciben como build args: si cambian,
# hay que reconstruir la imagen (docker compose build frontend).
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_POSTGREST_URL
ARG VITE_COGNITO_REGION
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_CREAR_USUARIO_URL
ENV VITE_POSTGREST_URL=$VITE_POSTGREST_URL \
    VITE_COGNITO_REGION=$VITE_COGNITO_REGION \
    VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_CREAR_USUARIO_URL=$VITE_CREAR_USUARIO_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
