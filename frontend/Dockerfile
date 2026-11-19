FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_MAP_TILE_URL
ARG VITE_MAP_TILE_ATTRIBUTION
ARG VITE_TILE_URL
ARG VITE_TILE_ATTRIBUTION
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Vite da prioridad a las variables ya exportadas sobre frontend/.env.production.
# Un ARG vacío borraría la config pública de Firebase, así que solo se escribe lo que trae valor.
RUN sh -ec 'write() { if [ -n "$2" ]; then printf "%s=%s\n" "$1" "$2" >> .env.production.local; fi; }; \
  write VITE_MAP_TILE_URL "$VITE_MAP_TILE_URL"; \
  write VITE_MAP_TILE_ATTRIBUTION "$VITE_MAP_TILE_ATTRIBUTION"; \
  write VITE_TILE_URL "$VITE_TILE_URL"; \
  write VITE_TILE_ATTRIBUTION "$VITE_TILE_ATTRIBUTION"; \
  write VITE_FIREBASE_API_KEY "$VITE_FIREBASE_API_KEY"; \
  write VITE_FIREBASE_AUTH_DOMAIN "$VITE_FIREBASE_AUTH_DOMAIN"; \
  write VITE_FIREBASE_PROJECT_ID "$VITE_FIREBASE_PROJECT_ID"; \
  write VITE_FIREBASE_APP_ID "$VITE_FIREBASE_APP_ID"'
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80