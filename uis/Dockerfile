# ── TrackFlow UIS – Multi-app Next.js Dockerfile ───────────────────────
# Build-stage free: runs `next dev` for local development.
# For production, extend with `next build` steps.

FROM node:20-alpine

# ── System dependencies ─────────────────────────────────────────────────
RUN apk add --no-cache tini

# ── Working directory ───────────────────────────────────────────────────
WORKDIR /app

# ── Install dependencies (layer caching) ────────────────────────────────
# Copy only the dependency manifests first to leverage Docker cache.
COPY website/package.json   website/package.json
COPY backoffice/package.json backoffice/package.json

RUN cd website    && npm install
RUN cd backoffice && npm install

# ── Copy application source code ────────────────────────────────────────
COPY website/    website/
COPY backoffice/ backoffice/

# ── Copy and prepare the launcher script ────────────────────────────────
COPY start.sh start.sh
RUN chmod +x start.sh

# ── Ports ───────────────────────────────────────────────────────────────
EXPOSE 3000
EXPOSE 3001

# ── Entrypoint (tini reaps zombies and forwards signals) ────────────────
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "/app/start.sh"]