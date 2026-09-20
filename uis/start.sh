#!/bin/sh
trap 'kill %1 %2' SIGINT SIGTERM
echo "Iniciando Website en puerto 3000..."
cd /app/website
npm run dev -- -p 3000 &
echo "Iniciando Backoffice en puerto 3001..."
cd /app/backoffice
npm run dev -- -p 3001 &

wait