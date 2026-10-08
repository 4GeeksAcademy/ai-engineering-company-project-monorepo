# Plan de Implementación: Autenticación en el Frontend (AUTH-02)

De acuerdo con el documento `STRATEGY.md` y aplicando el protocolo de la skill `code-refinement-suite`, la implementación de Flujos de Autenticación JWT en el Frontend se clasifica como de **Alta Complejidad (Nivel 3)**.

El ciclo de desarrollo se dividirá en las siguientes fases interactivas. Como siempre, yo te guiaré paso a paso por el chat actuando como tu tutor, y tú escribirás el código.

## 🏛️ Fase 1: Arquitectura y Diseño (`PACK_ARCHITECT` & `PACK_PLANNER`)
**Objetivo:** Decidir la estrategia de protección de rutas y gestión del estado del JWT antes de tocar el código.
- [x] **Interceptor HTTP / Cliente:** Definir cómo interceptaremos cada llamada a la API para inyectar automáticamente la cabecera `Authorization: Bearer <token>` (ej. usando un wrapper de `fetch` o `axios`).
- [x] **Estrategia de Protección (Auth Guard):** Diseñar un componente de React (HOC o Layout) o un Hook personalizado que se encargue de leer el `localStorage`, verificar la existencia del token y expulsar a los usuarios hacia `/login` si es inválido, sin romper el sitio web público.

## 💻 Fase 2: Formularios de Login y Registro (`PACK_CODER` - Parte 1)
**Objetivo:** Construir la puerta de entrada a la aplicación.
- [x] Construir la vista `/login` (formulario de email/password), gestionar el estado y los errores.
- [x] Guardar el JWT recibido en `localStorage` al hacer login exitoso.
- [x] Construir la vista `/register` (campos de credenciales + perfil opcional). Tras el éxito, hacer login automático y redirigir.

## 💻 Fase 3: Vista de Perfil (`PACK_CODER` - Parte 2)
**Objetivo:** Consumir los endpoints protegidos con el token real.
- [x] Construir `/account/profile`.
- [x] Consumir `GET /auth/me` enviando el token en la cabecera para pintar el email, nombre, teléfono y dirección.
- [x] Implementar la edición de datos consumiendo `PUT /profiles/me`.

## 🛡️ Fase 4: Protección de Rutas Global y Logout (`PACK_CODER` - Parte 3)
**Objetivo:** Cerrar el candado en todo el frontend.
- [x] Envolver todas las páginas privadas de Next.js con el `AuthGuard` definido en la Fase 1.
- [x] Implementar la lógica de cierre de sesión (borrar token de `localStorage` y redirigir).
- [x] Implementar interceptor pasivo: Si en cualquier momento la API responde un `401 Unauthorized` a una petición del frontend, forzar el borrado del token y enviar al `/login`.

## 🔎 Fase 5: Verificación y Auditoría (`PACK_AUDITOR`)
**Objetivo:** Pruebas E2E (End-to-End) y garantía de no regresión.
- [x] **Flujo feliz:** Navegar Registro -> Login -> Editar Perfil -> Logout exitosamente.
- [x] **Flujo de rechazo:** Intentar entrar manualmente por la URL a `/account/profile` sin token y ser rechazado.
- [x] **Auditoría de regresión:** Asegurarnos de que el website público del Hito 1 siga siendo 100% accesible sin requerir autenticación.
- [x] Preparar la rama para el Pull Request final.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)
Para garantizar la calidad y seguridad de esta implementación (clasificada como Nivel 3), aplicaremos conceptualmente las siguientes metodologías de nuestra suite:

- **PACK 1 (ARCHITECT):** Se utilizó *Tree of Thoughts (ToT)* y el criterio de *3 Expertos* (Dev Lead para la arquitectura del interceptor HTTP, UX/UI para las redirecciones fluidas del usuario, y Sec Specialist para la custodia segura del JWT en el cliente).
- **PACK 2 (PLANNER):** Se aplicó *Step-Back Prompting* para abstraer el problema (crear un AuthGuard global en lugar de proteger componente por componente) y estructurar este plan.
- **PACK 3 (CODER):** Durante el desarrollo aplicaremos *Chain of Verification (CoVe)* contrastando cada paso con la API real, y simularemos *TDD* verificando los flujos paso a paso.
- **PACK 4 (AUDITOR):** En la fase final aplicaremos *Red Teaming* (intentando evadir nuestra propia seguridad entrando directamente por URL) y un *Checklist pre-push*.
