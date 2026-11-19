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
# Un build-arg vacío sigue existiendo en el entorno, y Vite lo prefiere sobre
# frontend/.env.production (apagaría Firebase). En este shell se quitan los vacíos;
# los que traen valor sustituyen al archivo de producción.
RUN sh -ec 'for key in VITE_MAP_TILE_URL VITE_MAP_TILE_ATTRIBUTION VITE_TILE_URL VITE_TILE_ATTRIBUTION VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_APP_ID; do val=$(printenv "$key" || true); if [ -z "$val" ]; then unset "$key"; fi; done; npm run build'

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80