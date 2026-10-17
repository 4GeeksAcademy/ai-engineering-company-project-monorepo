# ============================================
# Dockerfile - uis/backoffice (TrackFlow Backoffice)
# ============================================
# Panel de administración interno Next.js 16 con TypeScript y Tailwind CSS.
# Depende del paquete local @trackflow/logic desde packages/logic.

FROM node:22-alpine AS deps

WORKDIR /app

# Copiar archivos de configuración del monorepo
COPY package.json tsconfig.json ./
COPY packages/ packages/

# Copiar el backoffice
COPY uis/backoffice/ uis/backoffice/

# Instalar dependencias
RUN npm install

# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app /app

# Build del backoffice
RUN npm run build --workspace=uis/backoffice

# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app/uis/backoffice

ENV NODE_ENV=production
ENV PATH=/app/uis/backoffice/node_modules/.bin:/app/node_modules/.bin:$PATH

# Copiar todo el backoffice compilado + node_modules + packages locales
COPY --from=builder /app/uis/backoffice ./
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3002

CMD ["next", "start", "-p", "3002"]