# Usamos una imagen oficial y muy ligera de Node (versión 20, recomendada para Next.js)
FROM node:20-alpine
# Definimos el directorio de trabajo
WORKDIR /app
# Copiamos SOLO los archivos de dependencias de ambas apps
COPY website/package*.json ./website/
COPY backoffice/package*.json ./backoffice/
# Instalamos las dependencias de ambas aplicaciones por separado
RUN cd website && npm install
RUN cd backoffice && npm install
#copiamos el resto del código de todas las interfaces y el script start.sh
COPY . .
# Nos aseguramos de que el script tenga permisos de ejecución dentro del contenedor
RUN chmod +x start.sh
# Exponemos ambos puertos para que se puedan conectar desde tu navegador local
EXPOSE 3000
EXPOSE 3001
# Comando maestro que arranca ambas aplicaciones en paralelo
CMD ["./start.sh"]