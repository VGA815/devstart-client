# syntax=docker/dockerfile:1

# --- Build stage --------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching.
# --legacy-peer-deps: @ngrx/*@21 declares Angular 21 peers but runs on Angular 19.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Bake the backend URLs into the build (see DEPLOYMENT.md).
# Single origin: API_URL defaults to the relative "/api" (same host as the SPA), so it
# works behind the edge nginx without changes. WS_URL has no sane same-origin default —
# override it for prod with wss://<domain>/connection/websocket (docker-compose.prod.yml
# passes it from ${DOMAIN}).
ARG API_URL=/api
ARG WS_URL=ws://localhost:8082/connection/websocket
RUN sed -i \
      -e "s|apiUrl: '[^']*'|apiUrl: '${API_URL}'|" \
      -e "s|wsUrl: '[^']*'|wsUrl: '${WS_URL}'|" \
      src/environments/environment.ts

RUN npm run build -- --configuration=production

# --- Runtime stage ------------------------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/devstart-client/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
