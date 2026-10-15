# Interfaces: uis/website (Vite) + uis/backoffice (Next.js) in one container.
# Build context: ./uis. The npm workspace root (package.json, lockfile) and packages/shared come in as
# the named context "monorepo" (repository root); see docker-compose.yml.
FROM node:22-alpine
WORKDIR /app

COPY --from=monorepo package.json package-lock.json ./
COPY --from=monorepo packages/shared packages/shared
COPY website/package.json uis/website/package.json
COPY backoffice/package.json uis/backoffice/package.json

# Dependencies of each app, installed separately (cached until its package.json changes).
RUN npm ci --workspace=uis/website --no-audit --no-fund
RUN npm install --workspace=uis/backoffice --no-audit --no-fund

COPY . uis/
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 3000 3001
CMD ["start.sh"]
