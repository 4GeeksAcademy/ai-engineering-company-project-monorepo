FROM node:22-alpine

WORKDIR /workspace
COPY --from=shared / /workspace/packages/shared

COPY website/package.json website/package-lock.json /workspace/uis/website/
WORKDIR /workspace/uis/website
RUN npm ci

COPY backoffice/package.json backoffice/package-lock.json /workspace/uis/backoffice/
WORKDIR /workspace/uis/backoffice
RUN npm ci

COPY start.sh /workspace/uis/start.sh
RUN chmod +x /workspace/uis/start.sh

EXPOSE 3000 3001
CMD ["/workspace/uis/start.sh"]