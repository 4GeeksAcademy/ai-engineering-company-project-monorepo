# Implementation Plan: Hito 5 — Backoffice: Interfaz de Gestión de Inventario (Nexova)

## Objetivo
Construir una interfaz funcional en Next.js (`uis/backoffice`) para que el equipo de Operaciones de **Nexova Solutions** pueda gestionar los **Activos Corporativos** (Assets), registrar adquisiciones (entradas) y asignaciones a departamentos (salidas), consumiendo la API construida en el Hito 4 de forma segura.

## 🧠 Reflexión y Análisis de Arquitectura (Pre-Planning)

Antes de estructurar las fases, se aplicó la técnica de *Step-Back Prompting* (de la Code Refinement Suite) para abstraer las necesidades del dominio de **Nexova Solutions** y las exigencias estrictas de `STRATEGY.md`. Las reflexiones que dan forma a este plan son:

1. **Desacoplamiento de Red (El porqué de la Fase 1):** El requerimiento prohíbe el uso de `fetch` directo en los componentes React. Por ello, la Fase 1 aísla toda la comunicación en `lib/inventory.ts`. Esto garantiza que la inyección del token JWT y la intercepción de errores HTTP 400 (ej. Stock insuficiente) se realice de forma centralizada y segura.
2. **Protección Global de Rutas:** Como se exige que *todas* las páginas validen la sesión, se planifica un `AuthGuard` global en lugar de proteger componente por componente, cerrando cualquier brecha de seguridad accidental.
3. **Separación de Flujos Críticos (El porqué de la Fase 3):** Se dividen los formularios de Inbound y Outbound porque la regla de negocio de "mostrar el stock disponible de forma reactiva antes de enviar" en las salidas requiere un manejo de estado cliente (React State) mucho más complejo para prevenir el stock negativo a nivel de UX.
4. **Vocabulario de Dominio:** Todo el plan se diseñó sustituyendo el concepto retail de "Productos" por "Activos Corporativos" y "Departamentos", alineándose milimétricamente con tu archivo `CONTEXT-company.md`.

> [!WARNING]
> ## Open Questions (Bloqueo Crítico)
> El documento `STRATEGY.md` menciona: *"Navega a `uis/backoffice`"*. Sin embargo, **esta carpeta no existe**.
> **Pregunta pendiente:** ¿Deseas que en la Fase 0 yo inicialice un nuevo proyecto de Next.js (App Router) desde cero en `uis/backoffice`, o traerás los archivos base de otro lado?

---

## 🏗️ Fases de Implementación

### Fase 0: Inicialización y Configuración Base (`PACK_ARCHITECT`)
- [x] **Paso 1:** Inicializar la aplicación Next.js en la carpeta `uis/backoffice` (usando `npx create-next-app` con configuración estándar).
- [x] **Paso 2:** Instalar dependencias necesarias (lucide-react para iconos, axios/fetch handlers si procede).
- [x] **Paso 3:** Configurar `.env.local` con `NEXT_PUBLIC_INVENTORY_API_URL=http://localhost:8000` y agregarlo a `.gitignore`.

### Fase 1: Capa de Integración y Seguridad (`PACK_CODER` - Parte 1)
- [x] **Paso 1:** Crear el archivo `lib/inventory.ts`. Este módulo centralizará todas las peticiones (`getAssets`, `createInboundOrder`, etc.).
- [x] **Paso 2:** Configurar `lib/inventory.ts` para que todas las llamadas inyecten automáticamente la cabecera `Authorization: Bearer <token>` obteniendo el token de `localStorage`.
- [x] **Paso 3:** Implementar la lógica para atrapar errores HTTP `4xx` y `5xx` devolviendo mensajes limpios al cliente.
- [x] **Paso 4:** Crear un componente `AuthGuard` o Middleware para redirigir automáticamente a `/login` a cualquier usuario que no esté autenticado intentando acceder a rutas `/inventory/*`.

### Fase 2: Página de Productos (`PACK_CODER` - Parte 2)
- [x] **Paso 1:** Crear la ruta y vista principal en `app/inventory/products/page.tsx`.
- [x] **Paso 2:** Hacer fetch de datos reales usando `GET /inventory/products` a través de `lib/inventory.ts`.
- [x] **Paso 3:** Renderizar una tabla con: Nombre (`Asset`), SKU, Departamento y `current_stock`.
- [x] **Paso 4:** Añadir indicadores visuales (Píldoras o iconos) para el stock: Saludable (Verde), Bajo (Naranja), Agotado (Rojo) y documentar los umbrales en un comentario en el código.
- [x] **Paso 5:** Añadir botones "Registrar Entrada" y "Registrar Salida" en cada fila para facilitar la navegación.

### Fase 3: Formularios de Órdenes (`PACK_CODER` - Parte 3)
- [x] **Paso 1:** Crear `app/inventory/orders/inbound/page.tsx` (Formulario de Entrada). Debe tener un selector desplegable con los nombres de los productos (no IDs en bruto) y campos para enviar al endpoint `POST /inventory/orders/inbound`.
- [x] **Paso 2:** Implementar limpieza del formulario Inbound tras el éxito y visualización de errores (ej. 400 o 500) en pantalla.
- [x] **Paso 3:** Crear `app/inventory/orders/outbound/page.tsx` (Formulario de Salida). Este es el más crítico.
- [x] **Paso 4:** Añadir reactividad al Outbound: Al seleccionar un producto en el dropdown, mostrar automáticamente su `current_stock` en la pantalla *antes* de que el usuario envíe el formulario.
- [x] **Paso 5:** Implementar salvaguarda UX en Outbound: Mostrar advertencia si el `quantity` tipeado es mayor al `current_stock` visible.
- [x] **Paso 6:** Atrapar errores HTTP 400 (Stock insuficiente) de la API y renderizar el mensaje inline junto al input de cantidad.

### Fase 4: Página de Historial de Órdenes (`PACK_CODER` - Parte 4)
- [x] **Paso 1:** Crear `app/inventory/orders/page.tsx` (Historial).
- [x] **Paso 2:** Llamar a `GET /inventory/orders` y pintar todas las transacciones (AssetAcquisition y AssetAssignment).
- [x] **Paso 3:** Asegurar que la tabla muestra: Nombre de producto, cantidad, tipo (Entrada/Salida), fecha y `user_uuid`.
- [x] **Paso 4:** Aplicar distinción visual clara entre entradas (ej. etiqueta verde) y salidas (ej. etiqueta roja). Debe ser *sólo lectura*.

### Fase 5: Verificación y Auditoría (`PACK_AUDITOR`)
- [x] **Paso 1:** Probar el bloqueo de seguridad (AuthGuard) intentando acceder en modo incógnito.
- [x] **Paso 2:** Ejecutar el flujo Inbound real y verificar que la tabla de productos sube el stock a color verde.
- [x] **Paso 3:** Ejecutar el flujo Outbound real excediendo la cantidad y validar que la UI ataje el error 400 sin romperse.
- [x] **Paso 4:** Preparar confirmación de calidad y subir los cambios a la rama remota del alumno.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)
Para garantizar la calidad de esta implementación (clasificada como Nivel 3 - Integración Completa de Frontend y Seguridad), aplicaremos nuestra suite:

- **PACK 1 (ARCHITECT) & PACK 2 (PLANNER):** Se aplicó *Step-Back Prompting* para diseñar la arquitectura SPA de Next.js. El plan se estructuró dividiendo responsabilidades estrictas (Fase 1: Motor API, Fase 2-4: UI).
- **PACK 3 (CODER):** Durante el desarrollo usaremos *Chain of Verification (CoVe)* contrastando siempre que la UI se alinea exactamente con los esquemas Pydantic del backend en Python, y ejecutaremos el código paso a paso esperando confirmación del alumno.
- **PACK 4 (AUDITOR):** Cerraremos con un *Red Teaming* de UX (forzando envíos nulos o stock negativo) y un *Checklist pre-push* verificando las variables de entorno en `.gitignore`.
