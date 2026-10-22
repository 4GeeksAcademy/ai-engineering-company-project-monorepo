# Progress Log — TrackFlow

## AUTH-03 — 2026-10-22
- Implementados `POST /auth/forgot-password`, `/auth/reset-password` y `/auth/change-password` sobre FastAPI/TinyDB, conforme al `CONTEXT.md` actualizado (Resend).
- Recuperacion con respuesta 200 uniforme para emails validos existentes o desconocidos, envio en segundo plano por API HTTPS de Resend, plantilla HTML movil y texto plano. Los errores del proveedor no revelan la existencia de cuentas.
- JWT de recuperacion con proposito separado y expiracion de 30 minutos; solo el SHA-256 pendiente se persiste en el usuario. Escritura de contrasena bcrypt y consumo del token bajo bloqueo, en una unica actualizacion. Emitir otro token o cambiar la contrasena invalida el anterior; no se revocan los JWT de sesion previos.
- Frontend React/Vite: login minimo (no existia), enlace de recuperacion, `/forgot-password`, `/reset-password` y `/account/change-password`. Incluye confirmacion, bloqueo de duplicados, errores accesibles, verificacion de sesion y redireccion con exito. Bearer en proveedores, sesion por pestana y cierre de sesion.
- Documentadas `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PASSWORD_RESET_URL`, restricciones del proveedor, proxy `/auth` y comandos Codespaces. `.gitignore` ahora excluye `.env` y `.env.*` en cualquier carpeta; no se leyo ni modifico el `.env` del usuario.
- Validaciones ejecutadas: `uv run --directory services/api pytest -q tests/test_auth.py`: 6 correctas (advertencia Starlette/httpx preexistente). Comprobacion HTTP aislada con TestClient/base temporal y correo simulado: respuesta uniforme, reset correcto, segundo uso 400, token invalido/expirado 400, token de recuperacion rechazado como sesion, sesion rechazada como recuperacion, cambio sin sesion 401, contrasena actual incorrecta 400 y login con nueva contrasena correcto. Payload Resend con HTML/texto verificado mediante transporte simulado. Comprobacion adicional: token vacio 400 y texto uniforme exacto.
- Frontend: `npm --prefix uis/backoffice run build` y `npm --prefix uis/backoffice run lint`: correctos. Diagnosticos del editor sin errores en los archivos nuevos y modelos/rutas tocados. No se crearon archivos nuevos de pruebas ni se ejecuto la suite completa.
- Entorno: se instalaron `uv`, dependencias Python/frontend y Chromium para poder verificar. Primera compilacion bloqueada por dependencias ausentes; correcta tras `npm install`.
- Bloqueos: Chromium no arranca por falta de `libatk-1.0.so.0`; no se ejecutaron las interacciones, capturas ni la comprobacion responsive visual. Falta entrega real de correo con clave/remitente Resend validos y URL publica configurada. PageSpeed no medido sin URL publica. No se accedio a secretos ni se cambiaron rutas protegidas fuera del progreso y del nuevo archivo historico autorizado.
- Frontend local iniciado en `http://localhost:5174`; requiere la API FastAPI en 8081 y configuracion de correo para el flujo real. No se creo commit.
- Contexto activo archivado integro en `memory-bank/history/AUTH03-CONTEXT.md`; se conserva el contexto raiz modificado por el usuario y el historico AUTH-01.
- Siguiente paso: configurar variables privadamente, iniciar FastAPI, instalar dependencias Linux de Chromium con permisos adecuados y validar recepcion real del correo, flujo de navegador y responsive. Rate limiting y auditoria opcionales no implementados.

## Estado general
- Actualizacion 2026-10-15: implementado AUTH-01 (Hito 10) sobre la API FastAPI/TinyDB; suite backend completa con 35 pruebas correctas.
- El `CONTEXT.md` AUTH-01 activo se archivo integro en `memory-bank/history/HITO10-CONTEXT.md`; no se modifico el contexto de raiz.
- AUTH-01 implementa JWT stateless, hash bcrypt con libpass, usuarios y perfiles en TinyDB, y protege las seis rutas de proveedores.
- La verificacion automatica cubre `/docs`/OpenAPI, registro-login-Bearer, 401/403 y JWT expirado. La secuencia visual manual en Swagger aun no se ejecuto.
- La clave real no se crea ni se versiona en este cambio; `services/api/README.md` documenta generacion local de `.env`, excluido de Git.
- Actualizacion 2026-10-08: implementado el Hito 09, directorio de proveedores de TrackFlow, conforme al contexto archivado y la rubrica de entrega.
- Backend y frontend funcionales; backend, persistencia real, integracion HTTP, build y lint verificados. Verificacion visual de navegador pendiente por bibliotecas del contenedor.
- Contexto del Hito 09 archivado integro en `memory-bank/history/HITO09-CONTEXT.md`; el original de raiz se conserva.
- Se mantiene el analizador de incidencias anterior, cuyo contexto esta archivado en `memory-bank/history/INCIDENTS-ANALYSIS-CONTEXT.md`.
- Regla permanente de archivo y progreso incorporada en `AGENTS.md`, independiente de commits, con autorizacion del desarrollador para estas actualizaciones.

## Protocolo para nuevas funciones
- Antes de implementar o anadir cualquier funcion, leer este `progress.md` y revisar los contextos de `memory-bank/history/` para conocer el estado, las decisiones y las funciones existentes.
- Contrastar esos antecedentes con el `CONTEXT.md` activo; no inventar requisitos ni duplicar implementaciones existentes.
- Al cerrar cada hito, archivar una copia integra del contexto en `memory-bank/history/` y actualizar este archivo, incluso sin commit. Preservar historicos existentes y registrar expresamente pruebas pendientes o bloqueadas.

## Completado
- Hito 10 - AUTH-01:
  - Modelos `User` con email, contraseña hasheada, estado, rol enum y fecha; `Profile` independiente, 1:1 por `user_id`. El modelo User no incluye nombre ni contacto.
  - Servicios TinyDB para crear/buscar/listar/actualizar/eliminar usuarios y leer/actualizar perfiles; el registro crea el perfil asociado y la eliminación lo borra.
  - `/users` ofrece registro público con rol fijo `user`; CRUD protegido con reglas de dueño/admin y modificación de roles limitada a admin.
  - `/auth/login` emite JWT firmado, con expiración `ACCESS_TOKEN_EXPIRE_MINUTES`; `/auth/me` incluye perfil. Bcrypt usa `libpass[bcrypt]` y `from passlib.hash import bcrypt`.
  - `/profiles/me` solo opera sobre el perfil propio. `get_current_user` valida Bearer, firma, expiración y existencia/estado del usuario; tokens ausentes, inválidos y expirados reciben 401, recursos ajenos 403.
  - Los seis endpoints existentes de `/suppliers` ahora requieren JWT. OAuth2 bearer y HTTP bearer están publicados en OpenAPI para usar `/docs` y pegar el token.
  - Clave tomada desde `services/api/.env`, nunca definida en código; el archivo se ignora en Git. `README.md` documenta crearla con `openssl rand` y ejecutar el servicio.
  - Se archivó el contexto activo completo como `memory-bank/history/HITO10-CONTEXT.md`; `AGENTS.md` explicita que debe hacerse incluso si se indica que el contexto ya está actualizado.
- Hito 09 - directorio de proveedores:
  - Estructura de entrega: `services/api/main.py`, `models.py`, `database.py`, `routes/suppliers.py` y `seed.py`.
  - Modelos Pydantic separados de entrada/respuesta con los campos exactos, categorias del contexto, estados `active`/`suspended`, tarifa positiva y finita, moneda por pais y `updated_at` UTC generado por el sistema.
  - CRUD `/suppliers`, filtros combinados por pais/categoria, actualizacion de tarifa con timestamp y errores 404/422. ID generado por TinyDB.
  - Seeder ejecutable con `uv run seed`: 15 proveedores exactos, comprobacion previa por nombre/pais, sin duplicados ni sobrescritura de tarifas modificadas; informa del numero de inserciones.
  - Persistencia TinyDB compartida por API y seeder; bloqueo dentro del proceso, una instancia/worker y seeder con API detenida.
  - API Node existente conserva incidencias y redirige `/suppliers` a FastAPI; arranque conjunto con `npm run dev`.
  - Pagina en `uis/backoffice/src/app/suppliers/SupplierDirectory.tsx`, accesible desde el menu: listado API, filtros sin recarga, formulario completo con errores, tarifas editables y controles de suspension/reactivacion con estados diferenciados.
  - Se mantiene `uis/backoffice` como aplicacion interna React/Vite; no se duplica en `uis/application` ni se migra a Next.js.
  - Comandos de instalacion, seeder, ejecucion y pruebas documentados en los README de API y backoffice.
  - Contexto archivado y regla permanente actualizada por peticion explicita del desarrollador.
- Fase 1 - analisis CSV local:
  - Creada la CLI `scripts/analyze.py` y el modulo reutilizable `scripts/incidents_analysis.py` con validacion del esquema, clasificacion de errores, metricas, CSAT y exportacion a `results.csv`.
  - El archivo de referencia `incidents-trackflow.csv` se compara con los resultados declarados en `CONTEXT.md`; las discrepancias detienen el proceso.
  - Validado mediante fixture sintetico anonimizado con los conteos de referencia: 100 filas, 95 validas, 5 invalidas y CSAT 3.06. La exportacion se comprobo sin correos.
  - Confirmado que `satisfaction_score` puede omitirse del encabezado; los registros `CLOSED` sin puntuacion se clasifican como invalidos.
  - Validacion final con el CSV real: coincidencia exacta con totales, categorias, estados, paises, cinco reglas de error y CSAT declarados en `CONTEXT.md`.
- Fase 2 - integracion en plataforma:
  - La API expone `POST /api/incidents/analyze` (multipart/form-data) y `GET /api/incidents/results/export`, reutiliza el procesador Python y responde con errores descriptivos.
  - El backoffice ofrece la vista navegable de analisis, carga por selector/drag-and-drop, metricas, desgloses, errores de validacion y descarga CSV.
  - Documentados los comandos y configurado proxy `/api` de Vite hacia el servicio local.
  - Prueba web end-to-end con el CSV real: reporte y descarga correctos; la respuesta y el CSV no contienen emails.
- Analisis del contexto TrackFlow (operacion en Los Angeles y Zaragoza, retos de inventario, carrier management, devoluciones y CX).
- Revision de estructura actual del monorepo y convenciones de carpetas `uis/` y `services/`.
- Creacion de `memory-bank/` con:
  - `projectbrief.md`
  - `techContext.md`
  - `progress.md` (este archivo)
- Creacion de `AGENTS.md` con:
  - Archivos obligatorios de lectura al inicio de sesion.
  - Flujo obligatorio pre-commit (revision, validaciones, reglas, actualizacion de progreso y commit).
  - Rutas protegidas que no deben tocarse sin confirmacion explicita.
- Creacion de `.agents/rules/component-naming-convention.md` con alcance siempre activo para `uis/website/**` y `uis/backoffice/**`.
- Creacion de skill reusable en `.agents/skills/create-reusable-ui-component/SKILL.md` con objetivo, inputs y criterios verificables.
- Inicializacion y personalizacion de `uis/website`:
  - React + TypeScript + Vite + Tailwind.
  - Web corporativa completa en `/` (mision, vision, servicios, equipo, contacto).
  - Formulario funcional con validaciones y boton de limpiar.
  - Metadatos SEO y JSON-LD en `index.html`.
- Inicializacion y personalizacion de `uis/backoffice`:
  - Layout interno independiente.
  - Vista de entrada con KPIs y alertas operativas visibles en pantalla.
- Creacion de `services/api` con endpoint `GET /health` y README operativo.

## En progreso
- Hito 10: pendiente abrir `/docs` en navegador y ejecutar allí el registro-login-Authorize manual; el flujo HTTP, los esquemas OpenAPI, errores 401/403 y expiración ya están cubiertos por pruebas.
- Hito 09: pendiente completar la verificacion visual/funcional en Chromium (desktop y movil) tras instalar las dependencias de sistema del navegador.

## Validaciones ejecutadas
- Hito 10: `cd services/api && uv run pytest -q`: 35 pruebas correctas; una advertencia preexistente de Starlette/httpx.
- Hito 10: `uv run pytest -q tests/test_auth.py`: 6 pruebas correctas, incluyendo registro, hash bcrypt, login JSON/formulario OAuth2, roles, permisos, perfil, JWT inválido/expirado y esquema OpenAPI.
- Hito 10: persistencia de proveedores validada con autorización Bearer a través de reinicio real de Uvicorn.
- Hito 10: compilación Python y registro de rutas en OpenAPI validados; import de `jose.jwt`, `dotenv.load_dotenv` y `passlib.hash.bcrypt` validado.
- Hito 09: `cd services/api && uv run pytest -q --tb=short`: 29 pruebas correctas; incluye comparacion literal de seeder/categorias/estados con `CONTEXT.md` y reinicio de un proceso Uvicorn real con recuperacion de los datos.
- Hito 09: `uv run seed` dos veces sobre base temporal nueva: `Proveedores insertados: 15` y `Proveedores insertados: 0`. Base existente: 0 y 0.
- Hito 09: `cd uis/backoffice && npm run test:e2e -- --grep 'API integrada'`: 1 prueba correcta a traves de Vite/Node/FastAPI, con validaciones, CRUD y conservacion del endpoint de incidencias.
- Hito 09: `npm run build` y `npm run lint` en `uis/backoffice`: correctos despues de reorganizar la pagina.
- Hito 09: prueba visual Playwright preparada (filtros, alta, validacion cliente, errores API, tarifas, estados, desktop/movil); no se considera aprobada porque Chromium no inicia sin `libatk-1.0.so.0`.
- `npm run typecheck` en raiz: OK (tras instalar dependencias raiz con `npm install`).
- `npm run build` en `uis/website`: OK.
- `npm run build` en `uis/backoffice`: OK.
- Smoke test backend: `GET /health` responde `status: ok`.
- `python3 scripts/analyze.py` con fixture sintetico anonimo: coincidencia de referencias (100 total, 95 validos, 5 invalidos, CSAT 3.06); exportacion sin correos.
- `python3 scripts/analyze.py scripts/incidents-trackflow.csv`: OK, resultados coinciden con el contexto; filas invalidas 4, 26, 43, 69 y 98, sin exposicion de emails.
- Prueba API multipart y exportacion: OK; CSV vacio devuelve 422 y extension incorrecta 400.
- Prueba end-to-end a traves de Vite con CSV real: carga, metricas y descarga OK; respuesta y CSV sin emails.
- `npm --prefix uis/backoffice run build`: OK.

## Proximos pasos
- Hito 10: generar `services/api/.env` siguiendo el comando de `services/api/README.md` y completar la comprobacion manual visual de `/docs`.
- Instalar bibliotecas Linux de Chromium con `npx playwright install-deps chromium` desde una terminal con permisos adecuados y ejecutar `npm run test:e2e` en el backoffice con ambos servicios activos.
- Revisar por separado la vulnerabilidad alta preexistente de `source-map-js@1.2.1`, detectada por npm audit; no se ha aplicado una actualizacion ajena al alcance.

## Riesgos / bloqueos conocidos
- Aun no existe pipeline CI del monorepo para validar todos los subproyectos de forma unificada.
- Captura automatica con Playwright bloqueada en este entorno por dependencia de sistema faltante (`libatk-1.0.so.0`).
- TinyDB requiere una unica instancia/worker; no admite escrituras multiproceso seguras ni seeder concurrente con la API.
- Dependencia preexistente `source-map-js@1.2.1` con aviso de seguridad alto. Starlette TestClient muestra una advertencia de deprecacion de httpx, sin fallos de pruebas.
