# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=10000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=60000

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund --prefer-online

COPY . .

ARG VITE_DIRECTUS_URL=https://admin.teanimas.com
ARG VITE_GAME_MASTER_URL=
ARG VITE_BASE_PATH=/
ARG VITE_GAME_SLUG=te-animas
ARG VITE_ALLOW_BOOTSTRAP_FALLBACK=true
ARG VITE_CONTENT_CACHE_HOURS=24
ARG BUILD_RELEASE=2.14.3-r19

ENV VITE_DIRECTUS_URL=${VITE_DIRECTUS_URL} \
    VITE_GAME_MASTER_URL=${VITE_GAME_MASTER_URL} \
    VITE_BASE_PATH=${VITE_BASE_PATH} \
    VITE_GAME_SLUG=${VITE_GAME_SLUG} \
    VITE_ALLOW_BOOTSTRAP_FALLBACK=${VITE_ALLOW_BOOTSTRAP_FALLBACK} \
    VITE_CONTENT_CACHE_HOURS=${VITE_CONTENT_CACHE_HOURS} \
    BUILD_RELEASE=${BUILD_RELEASE}

RUN echo "Building release $BUILD_RELEASE with invite-based accounts and backend-private profiles" \
    && npm run build \
    && printf '{"frontend_release":"%s","game_master_route":"/api/game-master","built_at":"%s"}\n' \
      "$BUILD_RELEASE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      > /app/dist/build-info.json

FROM nginx:1.29-alpine AS runtime

LABEL org.opencontainers.image.version="2.14.3-r19"

ENV GAME_MASTER_UPSTREAM=https://gm.teanimas.com

COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
