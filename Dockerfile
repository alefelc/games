# syntax=docker/dockerfile:1.7
# Build context MUST be the release root; Dockerfile path: games-main/Dockerfile.
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json release.json ./
COPY packages/contracts/package.json packages/contracts/tsconfig.json ./packages/contracts/
COPY games-main/package.json games-main/tsconfig*.json games-main/vite.config.ts games-main/index.html ./games-main/
COPY te-animas-game-master-main/package.json ./te-animas-game-master-main/
COPY directus-installer/package.json ./directus-installer/
RUN npm ci --no-audit --no-fund

COPY packages/contracts ./packages/contracts
COPY games-main ./games-main

ARG VITE_DIRECTUS_URL=https://admin.teanimas.com
ARG VITE_GAME_MASTER_URL=
ARG VITE_BASE_PATH=/
ARG VITE_GAME_SLUG=te-animas
ARG VITE_ALLOW_BOOTSTRAP_FALLBACK=true
ARG VITE_CONTENT_CACHE_HOURS=24
ARG BUILD_RELEASE=3.0.0-r1
ENV VITE_DIRECTUS_URL=${VITE_DIRECTUS_URL} \
    VITE_GAME_MASTER_URL=${VITE_GAME_MASTER_URL} \
    VITE_BASE_PATH=${VITE_BASE_PATH} \
    VITE_GAME_SLUG=${VITE_GAME_SLUG} \
    VITE_ALLOW_BOOTSTRAP_FALLBACK=${VITE_ALLOW_BOOTSTRAP_FALLBACK} \
    VITE_CONTENT_CACHE_HOURS=${VITE_CONTENT_CACHE_HOURS} \
    BUILD_RELEASE=${BUILD_RELEASE}
RUN npm run build:web && printf '{"frontend_release":"%s","built_at":"%s"}\n' \
  "$BUILD_RELEASE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > games-main/dist/build-info.json

FROM nginx:1.29-alpine AS runtime
ARG BUILD_RELEASE=3.0.0-r1
LABEL org.opencontainers.image.title="¿Te animás? Web" \
      org.opencontainers.image.version=${BUILD_RELEASE}
ENV GAME_MASTER_UPSTREAM=https://gm.teanimas.com
COPY games-main/deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/games-main/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
