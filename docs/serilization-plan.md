# 🎓 Plan de Implementación: Auditoría y Serialización de API (Módulo de Aprendizaje)

> **Ruta:** `.github/implementation-plan.md`  
> **Nivel de Complejidad (Code Refinement Suite):** Nivel 3 — Arquitectura / Módulo Crítico  
> **Modalidad:** Mentoría Interactiva Paso a Paso (El estudiante escribe el código guiado por el mentor).

---

## 🎯 Objetivo Pedagógico y Técnico

El propósito de este plan es doble:
1. **Técnico:** Eliminar el retorno de objetos ORM / diccionarios en crudo en toda la API de FastAPI, estableciendo contratos Pydantic estrictos (`response_model`), previniendo fugas de credenciales (passwords hasheados, emails innecesarios) y optimizando los payloads de red.
2. **Pedagógico:** Que aprendas a auditar superficies de API en producción, diseñar esquemas Pydantic desacoplados (Base, Create, Read, ListItem, Public), configurar `from_attributes=True` y aplicar principios de seguridad defensiva por defecto en backend.

---

## 📐 PACK 1: ARCHITECT (Evaluación ToT y 3 Expertos)

Antes de escribir esquemas, evaluamos 3 posibles enfoques de serialización mediante **Tree of Thoughts (ToT)**:

### Rama 1: Serialización implícita reutilizando modelos de base de datos (SQLModel / TinyDB)
- **Veredicto UX:** Malo; expone IDs internas y campos redundantes que confunden al frontend.
- **Veredicto Dev:** Rápido al inicio, pero acopla fuertemente el esquema de DB al contrato de la API. Cambiar una columna en DB rompe el frontend.
- **Veredicto Seguridad:** ❌ Crítico; riesgo inminente de exponer `hashed_password`, tokens de recuperación y flags internos.

### Rama 2: Un único esquema `UserResponse` compartido para todas las operaciones (Create, List, Detail)
- **Veredicto UX:** Regular; en listas grandes se descargan datos anidados que la tabla no muestra (over-fetching).
- **Veredicto Dev:** Aceptable para proyectos pequeños, pero genera schemas con campos opcionales ambiguos (`Optional[...]`) que debilitan el tipado.
- **Veredicto Seguridad:** ⚠️ Riesgo moderado; las operaciones de auth pueden terminar devolviendo campos que no deberían reenviarse.

### Rama 3: Arquitectura de Esquemas Específicos por Caso de Uso (Elegida ✅)
- **Veredicto UX:** Excelente; payloads ligeros, rápidos y adaptados a la vista exacta (listados planos, detalles enriquecidos).
- **Veredicto Dev:** Excelente; desacoplamiento total entre base de datos (`models.py`) y contrato de API (`schemas.py`), código autodocumentado en `/docs`.
- **Veredicto Seguridad:** ✅ Máxima protección; principio de menor privilegio sobre los datos expuestos (Zero Leakage).

---

## 📝 PACK 2: PLANNER (Diseño Desacoplado y Estrategia Didáctica)

Diseñamos la estructura organizativa y las reglas de diseño:
1. **Regla de oro de Schemas:** Todo endpoint que devuelva datos debe contar con `response_model=...`.
2. **Separación de roles:** 
   - Esquemas de Entrada (`*Create`, `*Update`): Validan lo que el cliente envía.
   - Esquemas de Salida (`*Read`, `*Public`, `*ListItem`): Modelan exactamente lo que el cliente recibe.
3. **Flujos de Auth:** Registro y login devuelven tokens/mensajes genéricos; nunca reenvían contraseñas ni emails (excepto `GET /auth/me` para perfil propio).
4. **Archivo de Auditoría:** `docs/serialization-audit.md` como fuente de verdad que registra el antes y el después de cada endpoint.

---

## 🗺️ Mapa de Trabajo por Fases (Roadmap)

### Fase 1: Auditoría y Diagnóstico (`docs/serialization-audit.md`)
- [x] **Paso 1.1:** Crear el archivo `docs/serialization-audit.md` con la plantilla de auditoría.
- [x] **Paso 1.2:** Auditar e inventariar rutas de Autenticación (`services/api/routes/auth.py`).
- [x] **Paso 1.3:** Auditar e inventariar rutas de Usuarios y Perfiles (`users.py` y `profiles.py`).
- [x] **Paso 1.4:** Auditar e inventariar rutas de Proveedores e Incidencias (`suppliers.py` y `incidents.py`).
- [x] **Paso 1.5:** Auditar e inventariar rutas de Inventario y Candidatos (`inventory.py` y `candidates.py`).
- [x] **Paso 1.6:** Clasificar cada endpoint en el informe: ✅ Ya serializado, ⚠️ Parcialmente serializado, o ❌ Sin serializar.

### Fase 2: Implementación de Esquemas y Serializers (Tutoría Paso a Paso)
- [x] **Paso 2.1:** Diseñar y agregar en `schemas.py` los esquemas seguros para Auth y Usuarios (`UserPublic`, `UserListItem`, `UserAuthResponse`).
- [x] **Paso 2.2:** Aplicar `response_model` y filtros en `services/api/routes/auth.py` (proteger login, registro, reset password).
- [x] **Paso 2.3:** Aplicar `response_model` y serializers en `services/api/routes/users.py` (evitar fugas en `get_all_users` y `get_user`).
- [ ] **Paso 2.4:** Auditar y blindar `services/api/routes/profiles.py` asegurando que no exponga campos innecesarios.
- [ ] **Paso 2.5:** Corregir endpoint sin serializer en `services/api/routes/incidents.py` (`/summary` y creación).
- [ ] **Paso 2.6:** Refinar esquemas en `services/api/routes/suppliers.py` (listados vs creación/edición).
- [ ] **Paso 2.7:** Validar coherencia en `services/api/routes/inventory.py` y `candidates.py`.

### Fase 3: Verificación, CoVe y Auditoría Red Teaming
- [ ] **Paso 3.1:** Ejecutar suite de pruebas (`pytest` o scripts de prueba del monorepo con `uv run`).
- [ ] **Paso 3.2:** Inspección interactiva en Swagger UI (`/docs`) validando el contrato de al menos 3 endpoints clave.
- [ ] **Paso 3.3:** Verificación Red Teaming (simulación de petición maliciosa para detectar si se puede extraer `hashed_password`).
- [ ] **Paso 3.4:** Actualizar `docs/serialization-audit.md` marcando todos los endpoints como ✅.
- [ ] **Paso 3.5:** Solicitud de confirmación final antes de cualquier commit/push.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

1. **Tree of Thoughts (ToT - PACK 1):** Exploración de 3 arquitecturas de esquemas evaluando trade-offs entre simplicidad, mantenibilidad y riesgo de fuga de datos.
2. **Step-Back Prompting & Self-Refinement (PACK 2):** Abstracción conceptual del contrato de API desacoplado del almacenamiento físico (DB) y estructuración en fases didácticas.
3. **Chain of Verification (CoVe - PACK 3):** Comprobación fáctica de cada atributo en los modelos contra el código real de las rutas antes de que el usuario lo escriba.
4. **Red Teaming (PACK 4):** Inspección de seguridad enfocada en autenticación, asegurando que ningún payload filtre credenciales o hashes.
5. **Modo Mentor (AGENTS.md):** Ningún archivo de código es modificado automáticamente por la IA; el usuario escribe, prueba y aprende en cada iteración.
