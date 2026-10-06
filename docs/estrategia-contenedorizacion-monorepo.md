# Contenedorización del Monorepo de la Empresa

## 🎯 Tu reto

> [!IMPORTANT]
> 📌 **Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

El monorepo ya está en marcha: el equipo ha construido los frontends en Next.js, el servicio API en FastAPI y los scripts de soporte. Todo funciona en tu máquina. El problema es que **sólo funciona en tu máquina**.

El equipo de infraestructura ha elevado una RFP interna al squad: cada vez que un nuevo desarrollador se incorpora, la puesta en marcha tarda horas entre conflictos de versiones de Node y Python, dependencias globales instaladas de formas distintas y pasos de configuración que nadie ha documentado del todo. El objetivo de este proyecto es resolver eso de raíz: el entorno de desarrollo debe definirse en código, versionarse junto al proyecto y ejecutarse de forma idéntica en cualquier máquina del equipo sin configuración manual.

Tu tech lead ha asignado el ticket al squad. El brief es directo: **dockerizar el monorepo completo para desarrollo**.
- Los dos frontends — el sitio público (`/uis/website`) y el panel interno (`/uis/backoffice`) — deben ejecutarse desde un **único contenedor de interfaces**.
- El servicio FastAPI va en su **propio contenedor**.
- Ambos tienen que arrancar con **recarga en caliente**, leer su configuración de variables de entorno, y comunicarse entre sí por **nombre de servicio dentro de la red Docker** — *no por localhost*.

---

## 📋 Brief técnico — Ticket #infra-40

El equipo necesita entornos de desarrollo reproducibles. Cada vez que alguien nuevo clona el repositorio, la puesta en marcha se convierte en una sesión de depuración de dependencias.

- **Alcance:** Dockerizar `/uis` (website + backoffice en un único contenedor de interfaces con recarga en caliente) y `/services` (FastAPI con `--reload`). La orquestación se gestiona con Docker Compose.
- **Criterio de aceptación:** Cualquier miembro del equipo puede ejecutar `docker compose up` desde la raíz del repositorio y tener toda la plataforma operativa sin pasos adicionales.

> [!WARNING]
> Los servicios se comunican entre sí por **nombre de servicio Docker**, no por `localhost`. Revisa todas las URLs de conexión entre servicios antes del sign-off.

---

## 🌱 Cómo empezar

1. **Requisitos previos:** Asegúrate de tener Docker Desktop (o Docker Engine + Docker Compose CLI v2) instalado y en ejecución.
2. **Repositorio:** Trabaja desde tu fork del repositorio base:
   - [4GeeksAcademy/ai-engineering-company-project-monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo)
3. **Estructura:** Revisa la estructura actual del monorepo. Deberás crear:
   - Archivos `Dockerfile` y `.dockerignore` en `/uis/` y en `/services/`.
   - Archivo `docker-compose.yml` en la raíz del repositorio.
4. **Variables de entorno:** Crea un archivo `.env` en la raíz antes de escribir ningún `docker-compose.yml`. Las variables de entorno concretas de tu proyecto ya las conoces — llevas semanas trabajando con ellas.

---

## 💻 Lo que debes hacer

### Dockerfile de interfaces (`/uis/Dockerfile`)
- [ ] Crea un `Dockerfile` en `/uis/` basado en una imagen oficial de Node (Alpine). Debe instalar las dependencias de `/uis/website` y `/uis/backoffice` por separado.
- [ ] El `CMD` por defecto del Dockerfile debe invocar un script `start.sh` que arranque ambas aplicaciones Next.js en puertos distintos (`website` en el 3000, `backoffice` en el 3001).
- [ ] Crea un `.dockerignore` en `/uis/` que excluya al menos: `node_modules`, `.next`, `.env*` y `*.log`.

### Dockerfile del backend (`/services/Dockerfile`)
- [ ] Crea un `Dockerfile` en `/services/` basado en una imagen oficial de Python. Debe instalar `uv`, instalar las dependencias desde `requirements.txt` con `uv pip install -r requirements.txt` y arrancar el servidor Uvicorn con `--reload` habilitado.
- [ ] Crea un `.dockerignore` en `/services/` que excluya al menos: `__pycache__`, `*.pyc`, `.env*`, `tests/` y `*.log`.

### Docker Compose (`docker-compose.yml`)
- [ ] Crea `docker-compose.yml` en la raíz con dos servicios: el servicio de interfaces (build desde `/uis/`, con bind mount sobre el código fuente y comando `next dev` para ambas apps) y el servicio de backend (build desde `/services/`, con bind mount y `--reload`).
- [ ] Expón los puertos correctos en cada servicio para que sean accesibles desde el host.
- [ ] Conecta ambos servicios en una red Docker con nombre definido explícitamente. Verifica que las URLs de conexión entre servicios usan el nombre del servicio como host, no `localhost`.

> [!CAUTION]
> 🔒 **Nunca incluyas secretos reales, API keys ni contraseñas en `docker-compose.yml` ni en ningún `Dockerfile`.** Estos archivos se versionan en Git y cualquier persona con acceso al repositorio los podrá leer. Las credenciales van exclusivamente en `.env`, que debe estar en `.gitignore`. Si accidentalmente commiteas un secreto, considera que está comprometido y rótalo inmediatamente.

- [ ] Define todas las variables de entorno de cada servicio mediante un archivo `.env` en la raíz del repositorio (no hardcodeadas en el YAML).
- [ ] Confirma que `.env` está en el `.gitignore` del repositorio.

---

## ✅ Lo que evaluaremos

- [ ] `docker compose up` desde la raíz levanta la plataforma completa sin errores y sin pasos adicionales de configuración.
- [ ] Los cambios en el código del host se reflejan en el navegador sin reconstruir la imagen (bind mounts funcionando en ambos servicios).
- [ ] El servicio de interfaces arranca ambas aplicaciones Next.js en puertos distintos (3000 y 3001) desde un único contenedor.
- [ ] Los servicios se comunican internamente por nombre de servicio Docker, no por `localhost` ni por IP hardcodeada.
- [ ] No hay secretos, API keys ni contraseñas hardcodeadas en ningún `Dockerfile` ni en `docker-compose.yml`.
- [ ] El archivo `.env` está en el `.gitignore` y no aparece en el historial de commits.
- [ ] Existen archivos `.dockerignore` en `/uis/` y en `/services/`.

---

## 📦 Cómo entregar

1. Sube todos los cambios a tu rama en GitHub.
2. Abre un Pull Request desde tu rama hacia `main`.
3. Incluye en la descripción del PR una captura de pantalla mostrando los contenedores en ejecución (`docker compose ps` o la salida de `docker compose up`).
4. Comparte el enlace del PR con tu tech lead para el sign-off final.