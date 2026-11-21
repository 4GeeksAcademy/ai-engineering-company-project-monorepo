# Referencia: OWASP Top 10:2025 (Checklist de Auditoría Web y API)

Usa esta referencia durante el **Modo 1 (Modelado de Amenazas Pre-Código)** y el **Modo 2 (Auditoría Web y API)**.

---

## 1. Control de Acceso Roto (A01 — Riesgo #1)
**Fallo raíz:** El servidor confía en identificadores enviados por el cliente o en controles del frontend sin verificar propiedad ni permisos en el servidor.

- **Verificaciones de Auditoría:**
  - [ ] Todo endpoint que consulte, modifique o elimine datos de negocio exige autenticación (**Denegar por Defecto**).
  - [ ] Toda búsqueda de recurso (`/resource/:id`, `/ws/{session_id}`, `/tickets/{ticket_id}`) verifica **propiedad o rol RBAC explícito** (`recurso.owner_id == usuario_actual.id` o rol autorizado) — previene **IDOR**.
  - [ ] Las pruebas automatizadas invocan explícitamente los endpoints como **usuario no autenticado (`401`)** Y como **otro usuario distinto (`403`)**.
- **Señal de Alerta:** Buscar registros en DB usando únicamente `req.params.id` o un parámetro de ruta sin contrastar `user_id` o `tenant_id`.

---

## 2. Configuración Incorrecta de Seguridad (A02 — Riesgo #2 en 2025)
**Fallo raíz:** Conveniencias de desarrollo que nunca se desactivaron al pasar a staging/producción.

- **Verificaciones de Auditoría:**
  - [ ] Cero credenciales predeterminadas en paneles de administración, bases de datos, Flower, Redis o cuentas semilla en producción.
  - [ ] Modo Debug desactivado en producción (`DEBUG=False`, sin depuradores interactivos expuestos).
  - [ ] Respuestas de error genéricas — sin trazas de pila, nombres de tablas/columnas SQL, versiones de librerías ni rutas internas expuestas al cliente.
  - [ ] Política CORS explícita con orígenes confiables (nunca `allow_origins=["*"]` combinado con `allow_credentials=True`).
  - [ ] Listado de directorios deshabilitado; puertos no usados, apps de ejemplo y buckets públicos cerrados.
  - [ ] Configuración bajo control de versiones y separada por entorno (`dev`, `test`, `prod`).

---

## 3. Fallos en la Cadena de Suministro y de Integridad (Nuevo en 2025)
**Fallo raíz:** Código o artefactos de terceros no confiables o actualizados silenciosamente entran en la compilación o ejecución.

- **Verificaciones de Auditoría:**
  - [ ] Archivos de bloqueo (*lockfiles*) versionados y exigidos (`uv.lock`, `package-lock.json`, `yarn.lock`).
  - [ ] Versiones fijadas en dependencias críticas y revisión de dependencias transitivas (`npm ls`, `uv tree`).
  - [ ] Escaneo automatizado de vulnerabilidades configurado (Dependabot / Snyk / `npm audit`).
  - [ ] Scripts cargados desde CDNs externos con **Integridad de Subrecursos (SRI)**: `integrity="sha384-..." crossorigin="anonymous"`.
  - [ ] Entradas serializadas externas (JSON, XML, YAML) validadas estrictamente con esquemas (Pydantic/Zod/Ajv); **nunca** usar deserializadores inseguros (`pickle.loads`, `yaml.load` sin `SafeLoader`).

---

## 4. Fallos Criptográficos
**Fallo raíz:** Datos sensibles (contraseñas, tokens, PII, registros financieros/salud) almacenados o transmitidos de forma débil.

- **Verificaciones de Auditoría:**
  - [ ] Minimización de datos: no almacenar campos sensibles que no sean estrictamente necesarios.
  - [ ] **En Tránsito:** Todo el tráfico (incluido el interno/administrativo) viaja cifrado con TLS (`https://`, `wss://`) en producción.
  - [ ] **Contraseñas:** Hasheadas con algoritmos lentos y con sal (`bcrypt`, `scrypt`, `Argon2`) — **nunca** cifrado reversible ni hashes rápidos (`MD5`, `SHA-1`, `SHA-256` crudo).
  - [ ] Tokens y enlaces de restablecimiento generados con aleatoriedad criptográficamente segura (`secrets`, `crypto.randomBytes`).
  - [ ] Claves criptográficas y secretos JWT cargados desde entorno o gestor de secretos (nunca hardcodeados) con estrategia de rotación.
  - [ ] Contraseñas y tokens nunca expuestos en logs, cachés públicas, URLs o analíticas.

---

## 5. Inyección (SQLi, Inyección de Comandos, XSS)
**Fallo raíz:** Una entrada no confiable llega a un intérprete que no puede distinguir datos de código ejecutable.

- **Verificaciones de Auditoría:**
  - [ ] **SQL:** 100% consultas parametrizadas o ORM (`$1`, `:param`, SQLModel/SQLAlchemy `where(...)`). Cero concatenación de strings o f-strings en SQL.
  - [ ] **Comandos de SO:** Nunca pasar entrada no confiable a `os.system`, `subprocess(..., shell=True)` o `child_process.exec`. Usar arrays de argumentos (`subprocess.run(["ls", "-l", path], shell=False)`, `execFile`).
  - [ ] **XSS:** Usar motores con escape automático (React JSX `{text}`). Nunca usar `dangerouslySetInnerHTML` / `innerHTML` sin sanitización estricta (p. ej. DOMPurify).
  - [ ] **Path Traversal:** Sanitizar nombres de archivo subidos con `Path(filename).name` (solo nombre base) y validar extensión/MIME permitidos.

---

## 6. Diseño Inseguro
**Fallo raíz:** Debilidades arquitectónicas o de lógica de negocio que un código impecable no puede arreglar (*"Un buen código no arregla un mal diseño"*).

- **Verificaciones de Auditoría:**
  - [ ] Valores críticos de negocio (precios, descuentos, roles, estados de aprobación, SLAs) se calculan y verifican en el servidor, nunca se confía en lo enviado por el cliente.
  - [ ] Recuperación de cuentas, cupones y flujos sensibles aplican límites de abuso (tope de intentos, tokens de un solo uso, expiración).
  - [ ] Modelado de amenazas previo a programar: preguntar *"¿Qué pasa si el usuario miente aquí?"* y *"¿Qué pasa si este paso se repite 1,000 veces?"*.

---

## 7. Fallos de Autenticación
**Fallo raíz:** Controles débiles de credenciales, gestión rota de sesiones o enumeración de cuentas.

- **Verificaciones de Auditoría:**
  - [ ] Limitación de tasa (*rate limiting*) en login, recuperación de contraseña y emisión de tokens (por IP y por usuario).
  - [ ] Mensajes de error genéricos en login/registro (`"Correo electrónico o contraseña inválidos"`) con comportamiento consistente para evitar **enumeración de cuentas**.
  - [ ] Sesiones/tokens con expiración finita (`exp`), regeneración al iniciar sesión (evita fijación de sesión) e invalidación al cerrar sesión o cambiar contraseña.
  - [ ] MFA (TOTP/WebAuthn) evaluado/exigido en cuentas administrativas.
  - [ ] Flujos de recuperación auditados con el mismo rigor que el inicio de sesión.

---

## 8. Registro y Alertas de Fallos
**Fallo raíz:** Brechas sin detectar, o logs que filtran credenciales.

- **Verificaciones de Auditoría:**
  - [ ] Registrar eventos relevantes de seguridad: éxitos/fallos de autenticación, denegaciones de autorización (`401`/`403`), fallos de validación, cambios de privilegios y transacciones críticas incluyendo **quién, qué, cuándo y dónde (IP)**.
  - [ ] **NUNCA registrar:** contraseñas, JWTs/claves API en claro, IDs de sesión, números completos de tarjeta ni PII sensible sin enmascarar.
  - [ ] Alertas calibradas para evitar fatiga de falsos positivos y probadas activamente (disparar un fallo controlado para verificar que la alerta llega).

---

## 9. Manejo Incorrecto de Condiciones Excepcionales (Nuevo en 2025)
**Fallo raíz:** Errores, timeouts, agotamiento de recursos o condiciones de carrera provocan fallos abiertos (*fail-open*) o fugas de información.

- **Verificaciones de Auditoría:**
  - [ ] Auditar cada `try/except` y `try/catch`: confirmar que el fallback **niega/aborta** (*fail-secure*) y nunca concede permiso ni continúa silenciosamente.
  - [ ] Timeouts explícitos en toda llamada externa HTTP/DB/LLM/tool (`AbortController`, `timeout=...`) para evitar workers colgados.
  - [ ] Operaciones sensibles a concurrencia (saldos, inventario, aprobaciones, turnos de streaming) protegidas con transacciones atómicas (`SELECT ... FOR UPDATE`) o bloqueos asíncronos (`asyncio.Lock`).
  - [ ] Manejador centralizado de errores devolviendo mensajes `500` genéricos al usuario y guardando el detalle completo únicamente en el servidor.
