FROM node:20-alpine AS builder

WORKDIR /app

COPY website/package*.json ./website/
RUN cd website && npm ci
COPY website/ ./website/
RUN cd website && npm run build

COPY backoffice/package*.json ./backoffice/
RUN cd backoffice && npm ci
COPY backoffice/ ./backoffice/
RUN cd backoffice && npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/website ./website
COPY --from=builder /app/backoffice ./backoffice
COPY start.sh ./start.sh

RUN chmod +x /app/start.sh

EXPOSE 3000 3001

CMD ["/app/start.sh"]
