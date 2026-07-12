# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json .npmrc ./

RUN npm ci --no-audit --no-fund --prefer-online

COPY . .

ARG VITE_DIRECTUS_URL=https://websites-games.chn0vc.easypanel.host
ARG VITE_BASE_PATH=/

ENV VITE_DIRECTUS_URL=${VITE_DIRECTUS_URL} \
    VITE_BASE_PATH=${VITE_BASE_PATH}

RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY deploy/nginx-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
