# Tasks de implementación - inventory-manager (Fase 3)

Cada TASK debe completarse y verificarse en su propio commit antes de iniciar la siguiente.

## TASK-01: Modelos Pydantic de inventario

- **Criterios EARS:** INV-003, INV-006, INV-008, INV-009, INV-010, INV-011, INV-012, INV-013, INV-014, INV-015, INV-017, INV-018, INV-019, INV-021.
- **Plan:** §1 Modelo de datos.
- **Archivos que toca:** `services/api/models/inventory.py`; `services/api/tests/test_inventory_models.py`.
- **Qué hacer:** Implementar los modelos y enums descritos en el plan, con pruebas unitarias acotadas a sus campos y validaciones.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_models.py"`. Deben aceptarse los valores de dominio válidos y cantidades decimales, y rechazarse categoría/tipo inválidos y datos requeridos ausentes, incluidos autor y fecha.
- **Commit sugerido:** `feat(inventory): add Pydantic domain models`

## TASK-02: Storage y cálculo de stock

- **Criterios EARS:** INV-001, INV-002, INV-004, INV-005, INV-011, INV-012, INV-013, INV-014, INV-015, INV-016, INV-021.
- **Plan:** §2 Cálculo de stock; §3 Almacenamiento.
- **Archivos que toca:** `services/api/storage/inventory.py`; `services/api/tests/test_inventory_storage.py`.
- **Qué hacer:** Añadir las listas y operaciones de storage indicadas en el plan; verificar el cálculo y el rechazo de movimientos antes de persistir cambios.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_storage.py"`. Comprobar saldo cero sin movimientos, aislamiento por artículo y local, suma/resta de los tres tipos, decimales y que un saldo negativo rechazado no añada movimiento ni altere el saldo previo.
- **Commit sugerido:** `feat(inventory): add in-memory movement storage`

## TASK-03: Router y registro de endpoints

- **Criterios EARS:** INV-001, INV-002, INV-003, INV-004, INV-005, INV-006, INV-007, INV-008, INV-009, INV-010, INV-011, INV-012, INV-013, INV-014, INV-015, INV-016, INV-017, INV-018, INV-019, INV-020, INV-021.
- **Plan:** §4 Endpoints.
- **Archivos que toca:** `services/api/routers/inventory.py`; `services/api/main.py`.
- **Qué hacer:** Implementar el router conforme a las rutas, contratos y errores del plan e incluirlo en la API centralizada.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m compileall -q routers/inventory.py main.py` y `python -c "from main import app; assert any(route.path == '/inventory/stock' for route in app.routes)"`. Iniciar `uvicorn main:app --reload` y confirmar en `http://127.0.0.1:8000/docs` que aparecen las rutas del dominio.
- **Commit sugerido:** `feat(inventory): add inventory API router`

## TASK-04: Verificación del backend

- **Criterios EARS:** INV-001, INV-002, INV-003, INV-004, INV-005, INV-006, INV-007, INV-008, INV-009, INV-010, INV-011, INV-012, INV-013, INV-014, INV-015, INV-016, INV-017, INV-018, INV-019, INV-020, INV-021.
- **Plan:** §1 Modelo de datos; §2 Cálculo de stock; §3 Almacenamiento; §4 Endpoints.
- **Archivos que toca:** `services/api/verify_inventory.py`.
- **Qué hacer:** Añadir un verificador repetible con `TestClient`, siguiendo `services/api/verify_incidents.py`; aislar el estado en memoria para que pueda ejecutarse más de una vez y probar casos válidos e inválidos del contrato.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python verify_inventory.py`; cada etapa debe reportar `OK` y el resumen debe indicar cero fallos. El script debe afirmar `201` para registros válidos, `200` para consultas (incluido stock inicial cero), `422` para payload incompleto, `404` para artículo inexistente, `409` para saldo negativo y `405` para métodos de mutación no admitidos; tras los rechazos, saldo e historial deben permanecer iguales. Además, iniciar `uvicorn main:app --reload` y confirmar en `/docs` las rutas documentadas.
- **Commit sugerido:** `test(inventory): add backend API verification script`

## TASK-05: Tipos compartidos

- **Criterios EARS:** INV-001, INV-002, INV-003, INV-004, INV-005, INV-006, INV-008, INV-009, INV-010, INV-011, INV-012, INV-013, INV-014, INV-015, INV-017, INV-018, INV-019, INV-021.
- **Plan:** §5 Tipos compartidos.
- **Archivos que toca:** `packages/shared/types/inventory.ts`; `packages/shared/types/index.ts`.
- **Qué hacer:** Declarar los tipos de dominio, payloads, filtros y respuesta de stock del plan y reexportarlos desde el barrel compartido.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice`. TypeScript debe resolver el barrel compartido sin errores y conservar los tipos actuales de incidencias.
- **Commit sugerido:** `feat(shared-types): add inventory types`

## TASK-06: Cliente API del dominio

- **Criterios EARS:** INV-002, INV-003, INV-004, INV-005, INV-006, INV-007, INV-008, INV-016, INV-017, INV-018, INV-019, INV-020, INV-021.
- **Plan:** §4 Endpoints; §5 Tipos compartidos; §6 Cliente API frontend.
- **Archivos que toca:** `uis/backoffice/src/api/inventory.ts`.
- **Qué hacer:** Implementar las funciones de consulta y registro descritas en el plan, usando tipos de `@repo/shared-types` y el `request<T>` compartido; no añadir llamadas de escritura para stock ni de edición/eliminación de movimientos.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`. Ambos deben finalizar sin errores de TypeScript o ESLint.
- **Commit sugerido:** `feat(backoffice): add inventory API client`

## TASK-07: UI mínima de inventario

- **Criterios EARS:** INV-001, INV-002, INV-003, INV-004, INV-005, INV-006, INV-007, INV-008, INV-009, INV-010, INV-011, INV-012, INV-013, INV-014, INV-015, INV-016, INV-017, INV-018, INV-019, INV-020, INV-021.
- **Plan:** §6 Cliente API frontend; §7 Fuera de este plan.
- **Archivos que toca:** `uis/backoffice/src/App.tsx`; `uis/backoffice/src/App.css` (y los componentes frontend estrictamente necesarios dentro de `uis/backoffice/src/`).
- **Qué hacer:** Incorporar al backoffice un formulario para registrar artículos, un formulario para registrar entradas/salidas/ajustes y una vista para consultar el stock por artículo y local. Mantener la integración con el cliente API de inventario; las decisiones visuales concretas se toman al implementar, siguiendo el patrón existente de incidencias.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`. Para la comprobación funcional, configurar `VITE_API_BASE_URL=http://localhost:8000`, iniciar la API con `uvicorn main:app --reload` desde `services/api/` y el backoffice con `npm run dev --workspace backoffice`; en la interfaz crear un artículo, registrar movimientos y consultar el saldo actualizado. Confirmar que no existe control para editar stock ni para modificar o eliminar movimientos.
- **Commit sugerido:** `feat(backoffice): add minimum inventory workflow`

## TASK-08: Checklist de verificación end-to-end

- **Criterios EARS:** INV-001, INV-002, INV-003, INV-004, INV-005, INV-006, INV-007, INV-008, INV-009, INV-010, INV-011, INV-012, INV-013, INV-014, INV-015, INV-016, INV-017, INV-018, INV-019, INV-020, INV-021.
- **Plan:** §2 Cálculo de stock; §4 Endpoints; §6 Cliente API frontend; §7 Fuera de este plan.
- **Archivos que toca:** `specs/inventory-manager/e2e-checklist.md`.
- **Qué hacer:** Documentar un recorrido reproducible desde la UI para crear artículo, registrar movimientos y consultar el stock; incluir las comprobaciones de rechazo requeridas para los invariantes y confirmar que fallar no modifica el saldo ni el historial.
- **Cómo verificar:** Seguir el checklist con API y backoffice activos. Confirmar el saldo tras el flujo válido; intentar una escritura directa de stock (INV-001, INV-007), una salida o ajuste negativo que cruce cero (INV-016) y `PATCH`/`DELETE` de un movimiento existente (INV-020). Observar rechazo HTTP para cada intento y comprobar después que el saldo e historial siguen intactos. Reiniciar la API antes del recorrido para partir de storage limpio.
- **Commit sugerido:** `docs: add inventory end-to-end checklist`

## Cambio de requisito: catálogos cerrados para local y unidad_medida

### CR-01: Enums cerrados en modelos Pydantic

- **Amplía:** TASK-01.
- **Criterios EARS:** INV-010, INV-021, INV-022, INV-023.
- **Plan:** §1 Modelo de datos.
- **Archivos que toca:** `services/api/models/inventory.py`; `services/api/tests/test_inventory_models.py`.
- **Qué hacer:** Agregar los enums `UnidadMedida` (`kg`, `g`, `l`, `ml`, `unidad`) y `Local` (`Local 01` a `Local 14`); cambiar `Articulo.unidad_medida` y `Movimiento.local` a esos tipos; ampliar pruebas para confirmar que unidades y locales fuera de los catálogos se rechazan.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_models.py"`. Deben aceptarse todos los miembros de ambos enums y rechazarse una unidad y un local no admitidos.
- **Commit sugerido:** `feat(inventory): add closed unit and local enums`

### CR-02: Valores de catálogo en pruebas de storage

- **Amplía:** TASK-02.
- **Criterios EARS:** INV-021.
- **Plan:** §3 Almacenamiento.
- **Archivos que toca:** `services/api/tests/test_inventory_storage.py`.
- **Qué hacer:** Sustituir los locales de texto libre de las pruebas por valores válidos del catálogo, por ejemplo `Local 01` y `Local 02`. No se espera cambio en `storage/inventory.py`, cuya lógica debe seguir agnóstica al tipo del campo `local`.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_storage.py"`. Deben mantenerse las comprobaciones de aislamiento por artículo y local y pasar usando los valores cerrados.
- **Commit sugerido:** `test(inventory): use catalog locals in storage tests`

### CR-03: Validar local cerrado en el router

- **Amplía:** TASK-03.
- **Criterios EARS:** INV-021, INV-023.
- **Plan:** §4 Endpoints.
- **Archivos que toca:** `services/api/routers/inventory.py`.
- **Qué hacer:** Tipar el parámetro `local` de `list_movements` y `get_stock` con el enum `Local`, para que FastAPI/Pydantic rechacen automáticamente valores fuera del catálogo con `422`. Mantener `articulo_id` como identificador de artículo, no como tipo `Local`.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m compileall -q routers/inventory.py main.py` y comprobar en `/docs` que los parámetros `local` muestran los valores permitidos. Enviar una consulta con local inválido a ambos endpoints y confirmar `422`; probar un `Local 01` válido y confirmar que sigue consultando.
- **Commit sugerido:** `feat(inventory): validate local catalog in API queries`

### CR-04: Verificar rechazos de unidad y local

- **Amplía:** TASK-04.
- **Criterios EARS:** INV-022, INV-023.
- **Plan:** §1 Modelo de datos; §4 Endpoints.
- **Archivos que toca:** `services/api/verify_inventory.py`.
- **Qué hacer:** Usar un local válido del catálogo, como `Local 01`, en el flujo de verificación existente y agregar dos etapas: creación de artículo con `unidad_medida` inválida y creación de movimiento con `local` inválido. Ambas deben ser rechazadas por la API.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python verify_inventory.py` dos veces consecutivas. Ambas corridas deben reportar todas las etapas `OK`, incluir `422` para cada catálogo inválido y terminar con cero fallos.
- **Commit sugerido:** `test(inventory): verify closed catalog rejections`

### CR-05: Tipos compartidos para los catálogos cerrados

- **Amplía:** TASK-05.
- **Criterios EARS:** INV-010, INV-021, INV-022, INV-023.
- **Plan:** §5 Tipos compartidos.
- **Archivos que toca:** `packages/shared/types/inventory.ts`.
- **Qué hacer:** Agregar `inventoryUnits`/`InventoryUnit` e `inventoryLocals`/`InventoryLocal` como arrays `const` y unions derivados. Cambiar `unidad_medida` en `InventoryArticle`, `NewInventoryArticle` e `InventoryStock`, y `local` en `InventoryMovement`, `NewInventoryMovement`, `InventoryMovementFilters` e `InventoryStock` para usar esos tipos cerrados.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice`. TypeScript debe aceptar miembros del catálogo en esos campos y rechazar valores arbitrarios en contextos tipados.
- **Commit sugerido:** `feat(shared-types): add closed inventory catalogs`

### CR-06: Tipar parámetros locales del cliente API

- **Amplía:** TASK-06.
- **Criterios EARS:** INV-021, INV-023.
- **Plan:** §5 Tipos compartidos; §6 Cliente API frontend.
- **Archivos que toca:** `uis/backoffice/src/api/inventory.ts`.
- **Qué hacer:** Cambiar el tipo del parámetro `local` en `getStock` y del campo local usado por `getMovements` a `InventoryLocal`, importado desde `@repo/shared-types`, en vez de `string`.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`; ambos deben terminar sin errores.
- **Commit sugerido:** `feat(backoffice): type API local filters from catalog`

### CR-07: Selectores para unidad y local

- **Amplía:** TASK-07.
- **Criterios EARS:** INV-010, INV-021, INV-022, INV-023.
- **Plan:** §5 Tipos compartidos; §6 Cliente API frontend; §7 Fuera de este plan.
- **Archivos que toca:** `uis/backoffice/src/InventoryManager.tsx`.
- **Qué hacer:** Reemplazar el input libre de unidad de medida del formulario de artículos y los inputs libres de local del formulario de movimientos y consulta de stock por selects poblados desde `inventoryUnits` e `inventoryLocals`.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`. Con API y backoffice activos, confirmar visualmente que cada selector solo ofrece los valores del catálogo y completar un registro/consulta usando `Local 01` y una unidad válida.
- **Commit sugerido:** `feat(backoffice): select closed unit and local catalogs`

### CR-08: Actualizar checklist E2E para catálogos cerrados

- **Amplía:** TASK-08.
- **Criterios EARS:** INV-022, INV-023.
- **Plan:** §1 Modelo de datos; §4 Endpoints; §6 Cliente API frontend.
- **Archivos que toca:** `specs/inventory-manager/e2e-checklist.md`.
- **Qué hacer:** Usar un local del catálogo, como `Local 01`, en los ejemplos del flujo y agregar un paso que intente registrar una unidad de medida y un local fuera de catálogo; documentar la expectativa de `422` para ambos.
- **Cómo verificar:** Seguir el checklist actualizado con API y backoffice activos. Confirmar que el flujo válido usa valores de catálogo y que los dos intentos inválidos reciben `422` sin modificar stock ni historial.
- **Commit sugerido:** `docs: verify closed catalogs in inventory E2E checklist`

## Cambio de requisito: local como catálogo gestionable

### CR2-01: Modelar Local como entidad gestionada

- **Criterios EARS:** INV-021, INV-023, INV-024, INV-025.
- **Amplía:** CR-01 y TASK-01.
- **Plan:** §1 Modelo de datos.
- **Archivos que toca:** `services/api/models/inventory.py`; `services/api/tests/test_inventory_models.py`.
- **Qué hacer:** Quitar el enum `Local`; agregar `LocalCreate` con `nombre: TextoNoVacio` y `Local` extendiendo `LocalCreate` con `id: str`, siguiendo el patrón `ArticuloCreate`/`Articulo`. Cambiar `MovimientoCreate.local` a `TextoNoVacio` como referencia por identificador y eliminar pruebas de rechazo por local desconocido a nivel de modelo; adaptar los payloads que usaban el enum.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_models.py"`. Confirmar que `LocalCreate` rechaza nombre ausente o vacío, que `Local` requiere ID y que `MovimientoCreate.local` acepta una referencia string.
- **Commit sugerido:** `feat(inventory): model local as managed entity`

### CR2-02: Gestionar locales en storage

- **Criterios EARS:** INV-021, INV-023, INV-024, INV-025.
- **Amplía:** CR-02 y TASK-02.
- **Plan:** §3 Almacenamiento.
- **Archivos que toca:** `services/api/storage/inventory.py`; `services/api/tests/test_inventory_storage.py`.
- **Qué hacer:** Agregar `locales: list[Local]`, las operaciones `create_local`, `list_locals` y `find_local`, y `LocalNotFoundError`. En `register_movement`, validar la existencia del artículo y del local mediante sus funciones de búsqueda antes de añadir el movimiento. Actualizar las pruebas para crear locales con `create_local` y probar que un local inexistente lanza `LocalNotFoundError` sin mutar el historial.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_storage.py"`. Comprobar creación/listado/búsqueda de locales, aislamiento con IDs distintos y que artículo/local inexistentes no anexan movimientos.
- **Commit sugerido:** `feat(inventory): manage locals in memory storage`

### CR2-03: Endpoints de catálogo de locales

- **Criterios EARS:** INV-021, INV-023, INV-024, INV-025.
- **Amplía:** CR-03 y TASK-03.
- **Plan:** §4 Endpoints.
- **Archivos que toca:** `services/api/routers/inventory.py`.
- **Qué hacer:** Agregar `POST /inventory/locals` (`201`) y `GET /inventory/locals` (`200`) delegando a storage; el POST rechaza con `422` un nombre ausente o vacío. Cambiar `local` de `create_movement`, `list_movements` y `get_stock` a `str`; convertir `LocalNotFoundError` en `404` al crear movimiento y validar con `storage.find_local` las referencias recibidas por los endpoints de listado filtrado y stock antes de continuar. Mantener `articulo_id` como `str`.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m compileall -q routers/inventory.py main.py` y comprobar `/docs`: creación/listado de locales y referencias `local` como string. Con `TestClient` o `/docs`, verificar `201`/`200` para operaciones de locales, `422` para crear un local sin nombre, `404` para ID de local inexistente en creación de movimiento, filtro e inventario, y los comportamientos válidos con un ID existente.
- **Commit sugerido:** `feat(inventory): expose managed local endpoints`

### CR2-04: Verificar flujo con local creado

- **Criterios EARS:** INV-021, INV-023, INV-024.
- **Amplía:** CR-04 y TASK-04.
- **Plan:** §4 Endpoints.
- **Archivos que toca:** `services/api/verify_inventory.py`.
- **Qué hacer:** Añadir al comienzo de `run_verification` una etapa que cree un local válido mediante `POST /inventory/locals`, compruebe `201` y guarde su ID; usar ese ID en todas las etapas restantes en lugar de `Local 01`. Reemplazar la etapa de local inválido `422` por una que intente registrar un movimiento con ID de local inexistente y confirme `404`.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python verify_inventory.py` dos veces consecutivas. Ambas corridas deben reportar todas las etapas `OK`, validar creación del local y `404` para la referencia inexistente, con cero fallos.
- **Commit sugerido:** `test(inventory): verify managed local workflow`

### CR2-05: Tipos compartidos para Local gestionado

- **Criterios EARS:** INV-021, INV-023, INV-024, INV-025.
- **Amplía:** CR-05 y TASK-05.
- **Plan:** §5 Tipos compartidos.
- **Archivos que toca:** `packages/shared/types/inventory.ts`.
- **Qué hacer:** Quitar `inventoryLocals`/`InventoryLocal`; agregar `InventoryLocation` (`id`, `nombre`) y `NewInventoryLocation` (`nombre`). Cambiar `local` en `InventoryMovement`, `NewInventoryMovement`, `InventoryMovementFilters` e `InventoryStock` de `InventoryLocal` a `string`, como referencia por ID.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice`. Confirmar que los tipos de locales gestionados se exportan desde el paquete compartido y que los campos `local` permiten representar IDs string.
- **Commit sugerido:** `feat(shared-types): model managed inventory locations`

### CR2-06: Cliente API para Local gestionado

- **Criterios EARS:** INV-021, INV-023, INV-024, INV-025.
- **Amplía:** CR-06 y TASK-06.
- **Plan:** §5 Tipos compartidos; §6 Cliente API frontend.
- **Archivos que toca:** `uis/backoffice/src/api/inventory.ts`.
- **Qué hacer:** Agregar `getLocals()` y `createLocal(payload)` siguiendo el patrón de `getArticles()`/`createArticle()`, usando `InventoryLocation` y `NewInventoryLocation`. Usar `string` para el ID de local que reciben `getStock` y `getMovements` mediante `InventoryMovementFilters`.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`; ambos deben terminar sin errores.
- **Commit sugerido:** `feat(backoffice): add managed local API client`

### CR2-07: UI para registrar y seleccionar locales

- **Criterios EARS:** INV-021, INV-023, INV-024, INV-025.
- **Amplía:** CR-07 y TASK-07.
- **Plan:** §5 Tipos compartidos; §6 Cliente API frontend; §7 Fuera de este plan.
- **Archivos que toca:** `uis/backoffice/src/InventoryManager.tsx`.
- **Qué hacer:** Agregar un formulario compacto para crear un local proporcionando solo su nombre y cargar locales con `getLocals()` al montar el componente, junto al catálogo de artículos. Reemplazar los selects fijos de local en el formulario de movimientos y consulta de stock por selects poblados dinámicamente, mostrando el nombre y usando el ID como `value`.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`. Con API/backoffice activos, crear un local en la UI, confirmar que aparece en ambos selectores y usarlo para registrar un movimiento y consultar stock.
- **Commit sugerido:** `feat(backoffice): manage and select inventory locals`

### CR2-08: Actualizar verificación E2E para locales gestionados

- **Criterios EARS:** INV-021, INV-023, INV-024.
- **Amplía:** CR-08 y TASK-08.
- **Plan:** §4 Endpoints; §6 Cliente API frontend.
- **Archivos que toca:** `specs/inventory-manager/e2e-checklist.md`.
- **Qué hacer:** Agregar al inicio del recorrido la creación de un local desde la UI y utilizar ese local en el flujo válido. Reemplazar la comprobación de local fuera de catálogo por un movimiento con un ID de local inventado enviado directamente a la API, con expectativa `404`, ya que la UI no permite escribir IDs manualmente.
- **Cómo verificar:** Seguir el checklist con API y backoffice activos. Confirmar que se crea y selecciona el local, que el flujo válido refleja el stock esperado y que el intento con ID inexistente devuelve `404` sin alterar saldo ni historial.
- **Commit sugerido:** `docs: verify managed local catalog end to end`

## Cambio de requisito: punto de reorden por artículo

### CR3-01: Punto de reorden en el modelo de artículo

- **Criterios EARS:** INV-026, INV-027.
- **Plan:** §1 Modelo de datos.
- **Amplía:** TASK-01.
- **Archivos que toca:** `services/api/models/inventory.py`; `services/api/tests/test_inventory_models.py`.
- **Qué hacer:** Añadir el campo `punto_reorden` a `ArticuloCreate`/`Articulo` como `Decimal` obligatorio, validando que sea mayor o igual a cero. Añadir tests que acepten un punto de reorden válido y rechacen su ausencia, un valor negativo o no numérico.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m unittest discover -s tests -p "test_inventory_models.py"`. Deben pasar los casos válidos e inválidos de `punto_reorden`.
- **Commit sugerido:** `feat(inventory): add reorder point to article model`

### CR3-02: Señal de punto de reorden en la consulta de stock

- **Criterios EARS:** INV-026, INV-028.
- **Plan:** §4 Endpoints.
- **Amplía:** TASK-03, CR2-03.
- **Archivos que toca:** `services/api/routers/inventory.py`.
- **Qué hacer:** Extender la respuesta de `GET /inventory/stock` para incluir `punto_reorden` (del artículo) y el booleano `bajo_punto_reorden` (verdadero cuando el stock calculado es menor que el punto de reorden). No cambiar los códigos de respuesta existentes.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python -m compileall -q routers/inventory.py`. Con `TestClient`, confirmar que la respuesta de `/inventory/stock` incluye ambos campos y que `bajo_punto_reorden` cambia correctamente al registrar movimientos que crucen el punto de reorden.
- **Commit sugerido:** `feat(inventory): flag stock below reorder point`

### CR3-03: Verificación del punto de reorden en el backend

- **Criterios EARS:** INV-026, INV-027, INV-028.
- **Plan:** §1 Modelo de datos; §4 Endpoints.
- **Amplía:** TASK-04, CR2-04.
- **Archivos que toca:** `services/api/verify_inventory.py`.
- **Qué hacer:** Añadir etapas que registren un artículo con `punto_reorden`, provoquen que su stock caiga por debajo mediante una salida, y confirmen que `GET /inventory/stock` responde con `bajo_punto_reorden: true`. Añadir una etapa que confirme `422` al registrar un artículo sin `punto_reorden` o con un valor negativo.
- **Cómo verificar:** Desde `services/api/`, ejecutar `python verify_inventory.py` dos veces seguidas; ambas corridas deben reportar todo `OK`.
- **Commit sugerido:** `test(inventory): verify reorder point signal`

### CR3-04: Tipos compartidos para punto de reorden

- **Criterios EARS:** INV-026, INV-028.
- **Plan:** §5 Tipos compartidos.
- **Amplía:** TASK-05, CR2-05.
- **Archivos que toca:** `packages/shared/types/inventory.ts`.
- **Qué hacer:** Añadir `punto_reorden: string` a `InventoryArticle` y `NewInventoryArticle`; añadir `punto_reorden: string` y `bajo_punto_reorden: boolean` a `InventoryStock`.
- **Cómo verificar:** Revisar que el archivo no tiene referencias rotas ni errores de sintaxis internos (los demás archivos que aún no usan estos campos se corrigen en tareas posteriores).
- **Commit sugerido:** `feat(shared-types): add reorder point fields`

### CR3-05: UI de punto de reorden en el backoffice

- **Criterios EARS:** INV-026, INV-028, INV-029.
- **Plan:** §4 Endpoints (Señal de punto de reorden en el backoffice); §5 Tipos compartidos.
- **Amplía:** TASK-07, CR2-07.
- **Archivos que toca:** `uis/backoffice/src/InventoryManager.tsx`.
- **Qué hacer:** Añadir el campo "Punto de reorden" al formulario de creación de artículos. Mostrar el punto de reorden como columna en el listado de artículos. En la consulta de stock, mostrar una señal visible cuando `bajo_punto_reorden` sea verdadero. Cuando el usuario tenga un local seleccionado en la consulta de stock, consultar el stock de cada artículo del catálogo en ese local (reutilizando `getStock`) y marcar visualmente en el listado de artículos los que tengan `bajo_punto_reorden: true`.
- **Cómo verificar:** Desde la raíz, ejecutar `npm run build --workspace backoffice` y `npm run lint --workspace backoffice`. Para la comprobación funcional: crear un artículo con un punto de reorden bajo, registrar movimientos que dejen su stock por debajo, y confirmar visualmente la señal tanto en la consulta de stock como en el listado de artículos para el local seleccionado.
- **Commit sugerido:** `feat(backoffice): surface reorder point signal`

### CR3-06: Checklist de verificación del punto de reorden

- **Criterios EARS:** INV-026, INV-027, INV-028, INV-029.
- **Plan:** §4 Endpoints; §5 Tipos compartidos.
- **Amplía:** TASK-08, CR2-08.
- **Archivos que toca:** `specs/inventory-manager/e2e-checklist.md`.
- **Qué hacer:** Añadir pasos al checklist para crear un artículo con punto de reorden, provocar que su stock caiga por debajo, y confirmar la señal visible tanto en la consulta de stock como en el listado de artículos. Añadir un paso que confirme el rechazo `422` al registrar un artículo sin punto de reorden o con un valor negativo.
- **Cómo verificar:** No requiere ejecutar código; es un documento. Revisar que quede coherente con el resto del checklist.
- **Commit sugerido:** `docs: verify reorder point signal end to end`