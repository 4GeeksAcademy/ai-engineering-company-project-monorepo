# ============================================
# Dockerfile - uis/website (TrackFlow Website)
# ============================================
# Sitio web público Next.js 16 con TypeScript y Tailwind CSS.
# Depende del paquete local @trackflow/logic desde packages/logic.

FROM node:22-alpine AS deps

WORKDIR /app

# Copiar archivos de configuración del monorepo
COPY package.json tsconfig.json ./
COPY packages/ packages/

# Copiar el website
COPY uis/website/ uis/website/

# Instalar dependencias
RUN npm install

# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app /app

# Build del website
RUN npm run build --workspace=uis/website

# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app/uis/website

ENV NODE_ENV=production
ENV PATH=/app/uis/website/node_modules/.bin:/app/node_modules/.bin:$PATH

# Copiar todo el website compilado + node_modules
COPY --from=builder /app/uis/website ./
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3000

CMD ["next", "start"]