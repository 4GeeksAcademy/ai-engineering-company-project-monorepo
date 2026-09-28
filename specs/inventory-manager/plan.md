# Plan técnico del gestor de inventario (Fase 2 - Plan)

Este documento define la arquitectura y los contratos que guiarán la implementación de los criterios INV-001 a INV-025. El backend se integrará en la API FastAPI centralizada; no se crea un microservicio ni se añade una dependencia nueva.

## 1. Modelo de datos

Los modelos persistidos del dominio vivirán en `services/api/models/inventory.py`, siguiendo el estilo Pydantic de `models/incidents.py`. Los esquemas de creación serán payloads separados, sin identificador generado por el cliente.

### `Articulo`

- `id: str`: UUID generado al registrar el artículo; identifica el mismo artículo en todos los locales (INV-003, INV-008, INV-009).
- `nombre: str`: obligatorio y no vacío (INV-003, INV-009).
- `categoria: CategoriaArticulo`: enum limitado a `carne`, `verduras`, `salsas`, `bebidas`, `packaging` y `productos de limpieza` (INV-003, INV-009).
- `unidad_medida: UnidadMedida`: enum limitado a `kg`, `g`, `l`, `ml` y `unidad` (INV-003, INV-010, INV-011).
- `punto_reorden: Decimal`: obligatorio y mayor o igual a cero; aplica por igual en todos los locales del artículo, no varía por local ni por categoría (INV-026, INV-027).

`CategoriaArticulo` y `UnidadMedida` serán enums de texto. El catálogo de artículos no contiene local ni stock: es global y común a todos los locales (INV-001, INV-008). La validación de unidad fuera del catálogo queda a cargo del enum y Pydantic la rechaza automáticamente con `422`; no requiere validación manual adicional (INV-022).

### `Local`

- `LocalCreate.nombre: str`: obligatorio y no vacío (INV-024, INV-025).
- `Local.id: str`: UUID generado al registrar el local; identifica de forma única una entidad del catálogo común de locales (INV-024, INV-025).

`LocalCreate` será el payload de creación y `Local` extenderá ese modelo con el identificador generado, siguiendo el mismo patrón que `ArticuloCreate` y `Articulo`. El catálogo se gestiona como datos de la aplicación, no como un enum fijo ni como texto libre no validado (INV-021, INV-024, INV-025).

### `Movimiento` y `TipoMovimiento`

`TipoMovimiento` será un enum de texto con los valores `entrada`, `salida` y `ajuste` (INV-004, INV-006).

- `id: str`: UUID generado para conservar e identificar cada registro (INV-004, INV-020).
- `articulo_id: str`: referencia obligatoria a un artículo existente; evita mezclar existencias entre artículos (INV-002, INV-004, INV-006).
- `local: str`: identificador obligatorio que referencia un local existente; no es el objeto local embebido ni un valor de un enum fijo (INV-002, INV-004, INV-006, INV-021, INV-023).
- `tipo: TipoMovimiento`: obligatorio y limitado a los tres tipos admitidos (INV-004, INV-006, INV-013).
- `cantidad: Decimal`: obligatoria y admite fracciones. Entrada y salida requieren cantidad mayor que cero; ajuste conserva el signo de la cantidad para sumar o restar (INV-006, INV-012, INV-014, INV-015, INV-016).
- `autor: str`: obligatorio y no vacío; no se sintetiza si falta en el payload (INV-017, INV-018).
- `fecha: datetime`: obligatoria y aportada al registrar; no se sustituye por una fecha implícita si falta (INV-017, INV-018).
- `motivo: str | None`: nota opcional, conservada si se proporciona (INV-019).

`UnidadMedida` es el único de estos campos que permanece como enum de catálogo cerrado; Pydantic rechaza automáticamente valores no admitidos con `422` (INV-022). La existencia de un local se comprueba contra el catálogo gestionado antes de registrar un movimiento.

No habrá campo de stock mutable en `Articulo`, `Movimiento` ni en los payloads de movimiento. Tampoco habrá operaciones para editar o eliminar movimientos (INV-001, INV-007, INV-020). Registrar inventario inicial consiste en crear un movimiento `ajuste` con la cantidad inicial, no una `entrada` (INV-013).

## 2. Cálculo de stock

El stock se obtiene cada vez a partir de los movimientos que coincidan simultáneamente con `articulo_id` y `local`; no se guarda ni se actualiza un saldo independiente. Sin movimientos coincidentes, el resultado es cero (INV-001, INV-002, INV-005).

La lógica reduce el historial aplicando `+cantidad` a una entrada, `-cantidad` a una salida y la cantidad con su signo a un ajuste. Las cantidades se manejan como decimales (`Decimal`) y siempre en la unidad del artículo; el módulo no convierte unidades (INV-011, INV-012, INV-014, INV-015).

Antes de aceptar una salida o un ajuste negativo, el registro calcula el saldo actual para ese artículo y local y calcula el saldo resultante con el movimiento propuesto. Si el resultado es menor que cero, rechaza la operación antes de añadir nada al almacenamiento; por tanto, se conserva tanto el historial como el stock anterior (INV-016). Las entradas y ajustes positivos aumentan el saldo. No existe escritura directa del stock (INV-001, INV-007).

## 3. Almacenamiento

`services/api/storage/inventory.py` mantendrá listas en memoria, siguiendo `services/api/storage/incidents.py`:

- `articulos: list[Articulo]` para el catálogo global.
- `locales: list[Local]` para el catálogo gestionado y común de locales.
- `movimientos: list[Movimiento]` como historial inmutable.

El módulo expondrá operaciones `create_local`, `list_locals` y `find_local` con el mismo patrón que las operaciones de artículo, además de crear y listar artículos, buscar un artículo por identificador, listar y buscar movimientos, calcular stock por artículo y local, y registrar un movimiento. `register_movement` validará que existan tanto el artículo como el local antes de anexar el movimiento y validará el saldo resultante, sin dejar cambios parciales; una referencia de local inexistente producirá `LocalNotFoundError` (INV-021, INV-023, INV-024). No expondrá setters de stock ni funciones de actualización o eliminación de movimientos (INV-001, INV-006, INV-016, INV-020). La persistencia es en memoria, coherente con el patrón de incidencias; no implica base de datos en esta fase.

## 4. Endpoints

El router se ubicará en `services/api/routers/inventory.py`, con prefijo `/inventory` y tag `inventory`, y se incluirá en la API centralizada de `services/api/main.py` igual que el router de incidencias.

| Método y ruta | Comportamiento y criterios | Respuestas de error |
|---|---|---|
| `POST /inventory/locals` | Crea un local con UUID y lo incorpora al catálogo común (INV-021, INV-024, INV-025). Responde `201`. | `422` si falta el nombre o está vacío (INV-024, INV-025). |
| `GET /inventory/locals` | Lista el catálogo común de locales (INV-021, INV-025). Responde `200`. | No aplica. |
| `POST /inventory/articles` | Crea un artículo con UUID y lo incorpora al catálogo común (INV-003, INV-008, INV-009). Responde `201`. | `422` si falta nombre, categoría o unidad, si su valor no es válido (INV-003, INV-009, INV-010), o si `unidad_medida` no pertenece al enum `UnidadMedida` (validación Pydantic, INV-022). |
| `GET /inventory/articles` | Lista el catálogo común, sin duplicarlo por local (INV-008, INV-009). Responde `200`. | No aplica validación de local. |
| `GET /inventory/articles/{article_id}` | Consulta un artículo por su identificador global (INV-003, INV-008). Responde `200`. | `404` si no existe el artículo. |
| `POST /inventory/movements` | Registra una entrada, salida o ajuste y conserva el movimiento y sus metadatos (INV-004, INV-012 a INV-019, INV-021, INV-023). Responde `201`. | `422` ante campos requeridos ausentes, tipo inválido, cantidad no válida o autor/fecha ausentes (INV-006, INV-018); `404` si `articulo_id` no identifica un artículo o `local` no identifica un local del catálogo (INV-006, INV-023); `409` si una salida o ajuste negativo dejaría saldo menor que cero, sin anexar el movimiento (INV-016). |
| `GET /inventory/movements` | Consulta el historial, con filtros opcionales `articulo_id` y `local`; cuando se proporciona, `local` filtra por el identificador de una entidad del catálogo gestionado. Filtrar por ambos permite inspeccionar exactamente el historial que compone un saldo (INV-002, INV-004, INV-017, INV-019, INV-020, INV-021, INV-025). Responde `200`. | `404` si `articulo_id` no identifica un artículo o si `local` no identifica un local existente. |
| `GET /inventory/movements/{movement_id}` | Consulta un movimiento existente con todos sus datos preservados (INV-004, INV-017, INV-019, INV-020). Responde `200`. | `404` si no existe el movimiento. |
| `GET /inventory/stock?articulo_id=…&local=…` | Calcula y devuelve el stock para el par exacto de artículo y local, incluso cero si no hay movimientos; incluye también `punto_reorden` tomado del artículo y el booleano `bajo_punto_reorden`, verdadero cuando el stock calculado es menor que el punto de reorden del artículo. Ambos parámetros son obligatorios y `local` identifica una entidad gestionada existente (INV-001, INV-002, INV-005, INV-008, INV-021, INV-025, INV-028). Responde `200`. | `422` si falta alguno de los dos parámetros; `404` si el artículo o el local no existen en sus catálogos. |

Los cuerpos inválidos usan el `422` de validación de FastAPI/Pydantic. No se implementarán endpoints de escritura de stock ni de `PATCH`, `PUT` o `DELETE` de movimientos. Cuando la ruta del recurso exista, esos métodos no admitidos responderán `405 Method Not Allowed`; las rutas no registradas responden `404`. Así se rechaza la modificación directa del stock y se preserva la inmutabilidad del historial (INV-007, INV-020).

### Señal de punto de reorden en el backoffice

En la sección de consulta de stock, el backoffice reutiliza `GET /inventory/stock`, extendido con `punto_reorden` y `bajo_punto_reorden`, para consultar por cada artículo del catálogo su stock en el local seleccionado por el usuario. Los artículos cuya respuesta traiga `bajo_punto_reorden: true` se marcan visualmente en el listado de artículos. No se crea un endpoint nuevo para esta señal; se reutiliza el existente (INV-029).

## 5. Tipos compartidos

`packages/shared/types/inventory.ts` definirá los tipos que consume el backoffice a través de `@repo/shared-types`, siguiendo `incidents.ts`:

- `inventoryCategories` y `InventoryCategory`, con las seis categorías del modelo.
- `inventoryUnits` y `InventoryUnit`, con `kg`, `g`, `l`, `ml` y `unidad`.
- `InventoryLocation`, con `id` y `nombre`, y `NewInventoryLocation`, con `nombre`, siguiendo el patrón de entidad y payload de creación de artículos.
- `movementTypes` y `MovementType`, con `entrada`, `salida` y `ajuste`.
- `InventoryArticle`, con identificador, nombre, categoría, `unidad_medida: InventoryUnit` y `punto_reorden` decimal representado como `string` en JSON.
- `InventoryMovement`, con identificador, `articulo_id`, `local: string` como referencia, tipo, cantidad decimal representada como `string` en JSON, autor, fecha ISO como `string` y motivo opcional.
- `InventoryStock`, con `articulo_id`, `local: string` como referencia, saldo decimal representado como `string` en JSON, `unidad_medida: InventoryUnit`, `punto_reorden` decimal representado como `string` en JSON y `bajo_punto_reorden: boolean`; es una respuesta calculada, no un campo editable del artículo.
- `NewInventoryArticle`, con nombre, categoría, `unidad_medida: InventoryUnit` y `punto_reorden` decimal representado como `string` en JSON; además de `NewInventoryMovement` e `InventoryMovementFilters` para los payloads y filtros del cliente.

`NewInventoryArticle.unidad_medida` usará `InventoryUnit`. `NewInventoryMovement.local` e `InventoryMovementFilters.local` serán `string` con el identificador del local, no un catálogo cerrado ni un objeto embebido.

`packages/shared/types/index.ts` reexportará `./inventory`; las aplicaciones no redefinirán estos tipos localmente (INV-001 a INV-025, según el campo o contrato correspondiente).

## 6. Cliente API frontend

`uis/backoffice/src/api/inventory.ts` seguirá el patrón de `api/incidents.ts`, importará tipos desde `@repo/shared-types` y delegará cada petición en `request<T>` de `api/client.ts`. No duplicará `fetch`, la URL base ni el manejo de errores.

`createArticle`, `getArticles` y `getStock` no requieren cambios de lógica: el nuevo campo simplemente fluye a través de los tipos ya existentes de `@repo/shared-types`.

Expondrá `getArticles()`, `getArticle(id)`, `createArticle(payload)`, `getLocals()`, `createLocal(payload)`, `getMovements(filters)`, `getMovement(id)`, `createMovement(payload)` y `getStock(articleId, local)`. Las funciones serializarán los payloads como JSON; para filtros y consulta de stock construirán los parámetros con `URLSearchParams`. Los parámetros `local` de `getMovements` y `getStock` serán `string` que contiene el identificador de una entidad local gestionada, no un tipo de catálogo cerrado (INV-021, INV-023, INV-024, INV-025). No habrá función para cambiar stock, editar movimientos ni borrarlos (INV-001, INV-007, INV-020).

## 7. Fuera de este plan

Este plan no decide pantallas, navegación, tablas, formularios, validaciones visuales, estados de carga, mensajes, filtros interactivos ni presentación general del stock, salvo la señal visual de los artículos bajo punto de reorden descrita en §4. Los umbrales o alertas de stock por categoría o local siguen fuera de alcance; solo existe el punto de reorden por artículo. La especificación determina los comportamientos y datos; el diseño de esas decisiones de UI/UX se hará al implementar el frontend. No se incluyen aquí tareas ni orden de implementación; se definirán en el documento separado de Fase 3 (`tasks.md`).