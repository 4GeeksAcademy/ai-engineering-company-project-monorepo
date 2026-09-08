# Plan de Implementación: Recuperación y Cambio de Contraseña (AUTH-03)

De acuerdo con el documento `STRATEGY.md` y aplicando el protocolo de la skill `code-refinement-suite`, la implementación de Flujos de Recuperación y Cambio de Contraseña (con integración de email y tokens criptográficos) se clasifica como de **Alta Complejidad (Nivel 3)**.

El ciclo de desarrollo se dividirá en las siguientes fases interactivas. Yo te guiaré paso a paso por el chat actuando como tu tutor, y tú escribirás el código.

## 🏛️ Fase 1: Arquitectura y Diseño (`PACK_ARCHITECT` & `PACK_PLANNER`)
**Objetivo:** Diseñar el modelo de datos para los tokens de restablecimiento y la integración del servicio de email.
1. **Almacenamiento de Tokens:** Crearemos una tabla o archivo en TinyDB (`reset_tokens_db.json`) para guardar los tokens con su `email` asociado, `token` hasheado, `expires_at` y `used` (booleano).
2. **Servicio de Email:** Diseñar un módulo utilitario en FastAPI para enviar correos usando la API oficial del proveedor elegido, manejando los secretos a través de `python-dotenv`.

## 💻 Fase 2: Desarrollo del Backend (`PACK_CODER` - Parte 1)
**Objetivo:** Construir los endpoints seguros en FastAPI.
- `POST /auth/forgot-password`: Verificar email (silenciosamente), generar token seguro (ej. `secrets.token_urlsafe()`), guardarlo en TinyDB y enviar el correo con el enlace. Siempre retorna 200.
- `POST /auth/reset-password`: Validar que el token existe, no está caducado y no se ha usado. Actualizar la contraseña del usuario y marcar el token como `used: true`.
- `POST /auth/change-password`: (Ruta protegida) Validar `current_password` y actualizar a `new_password`.

## 💻 Fase 3: Formularios del Frontend (`PACK_CODER` - Parte 2)
**Objetivo:** Construir la interfaz de usuario en Next.js.
- Construir la vista `/forgot-password` y añadir enlace desde `/login`.
- Construir la vista `/reset-password` leyendo el parámetro `?token=...` de la URL. Manejar errores si el token expiró.
- Construir la vista `/account/change-password` validando que "nueva contraseña" y "confirmar nueva contraseña" coincidan antes de enviarlo.

## 🔎 Fase 4: Verificación y Auditoría (`PACK_AUDITOR`)
**Objetivo:** Pruebas E2E de seguridad y Red Teaming.
- **Red Teaming (Anti-Enumeración):** Intentar recuperar la contraseña de un correo inexistente y verificar que la API devuelve 200 sin revelar información.
- **Auditoría de Expiración:** Intentar usar un token de restablecimiento dos veces o un token modificado para asegurar que es rechazado con un 400.
- **Flujo E2E:** Solicitar correo -> copiar token de la terminal/email -> restablecer -> Iniciar sesión con la nueva clave.

---

## Open Questions / Decisiones Requeridas

> **Selección de Proveedor de Email**  
> Para enviar los enlaces de recuperación, `STRATEGY.md` requiere integrar **Resend** o **SendGrid**. ¿Con cuál de los dos prefieres que trabajemos? Te recomiendo Resend porque es mucho más fácil de configurar para entornos de desarrollo.

> **Persistencia de Tokens**  
> Almacenaremos los tokens en TinyDB (`reset_tokens_db.json`) en lugar de la memoria del servidor para que no se pierdan si reinicias el servidor FastAPI. ¿Estás de acuerdo con este enfoque?

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)
Para garantizar la calidad y seguridad de esta implementación (clasificada como Nivel 3), aplicaremos conceptualmente las siguientes metodologías de nuestra suite:

- **PACK 1 (ARCHITECT):** Aplicamos el criterio de *Sec Specialist* para definir que los tokens deben persistirse (TinyDB) con un booleano de `used` y un `expires_at`, rechazando el uso de un simple JWT sin estado que no se pueda revocar fácilmente.
- **PACK 2 (PLANNER):** Se estructuró este plan aislando las responsabilidades en Backend (API/Email) y Frontend (UI/Validación).
- **PACK 3 (CODER):** Durante el desarrollo aplicaremos simulaciones *TDD*, verificando paso a paso cada endpoint a través de la terminal antes de conectarlo a la UI.
- **PACK 4 (AUDITOR):** Al finalizar, aplicaremos tácticas de *Red Teaming* para intentar enumerar usuarios o forzar tokens caducados, garantizando la inviolabilidad del sistema.
