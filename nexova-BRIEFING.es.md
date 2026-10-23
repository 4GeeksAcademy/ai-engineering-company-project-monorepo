# BRIEFING — Nexova

## Proyectos de Telemetría (Plan · Captura · Almacenamiento · Reporte)

<!-- hide -->

_These instructions are [available in English](./nexova-BRIEFING.md)._

<!-- endhide -->

---

## 1. Tu compañía

Nexova es una consultora de RRHH con tres líneas de negocio: headhunting, outsourcing de soporte al cliente, y formación corporativa. A diferencia de una cadena de restaurantes o un operador logístico, Nexova no vende productos físicos — pero sí gestiona un inventario real y crítico para el negocio: **el material de formación y certificación** que Elena (L&D) produce y distribuye a clientes, candidatos y a los propios consultores de Nexova, y los **kits de incorporación** (laptops, credenciales, manuales) que Patricia (RRHH) entrega a cada nueva contratación, incluyendo los 30 agentes de soporte outsourced de Roberto.

El sistema de inventario controla ese material: cuántos kits de cada programa existen, cuántos se han entregado, y cuándo hace falta reponer.

Tu Plan de Telemetría, tu captura, tu almacenamiento y tu reporte técnico giran alrededor de ese sistema. Más adelante, esta misma telemetría alimentará el dashboard de L&D de Elena y el reporte ejecutivo semanal de Laura.

---

## 2. Entidades del sistema de inventario en Nexova

| Entidad         | En Nexova significa...                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `Product`      | Un ítem de material formativo o de incorporación: ej. `kit de certificación en ventas B2B`, `manual de onboarding — soporte`, `credencial de acceso`, `laptop de asignación temporal`. Cada producto tiene una categoría (`training_kit`, `certification`, `onboarding_equipment`) y pertenece a un programa o área. |
| `InboundOrder`  | Una orden de entrada: llegada de un nuevo lote de material desde un proveedor (imprenta, plataforma de e-learning, proveedor de hardware). |
| `OutboundOrder` | Una orden de salida: entrega de un kit o certificado a un cliente, candidato, consultor o agente de soporte. |
| `office`        | Valencia o Miami.                                                                                            |
| `programme`     | El programa de formación o certificación al que pertenece el material (ej. `ventas-b2b`, `liderazgo-basico`). |

---

## 3. Métricas obligatorias de telemetría

Estas son las métricas que Nexova necesita medir **desde ya**, sin importar qué más identifiques en tu propio catálogo. Van directamente al piso de tu Plan de Telemetría (Fase 1) y deben estar instrumentadas de punta a punta al final de la serie de proyectos.

> Estas métricas alimentarán, más adelante en el curso, el dashboard de L&D de Elena (matrículas por programa, tasa de finalización) y el reporte ejecutivo semanal de Laura. Diséñalas pensando en que se agregarán por oficina y por programa.

| `event_type`                     | Se dispara cuando...                                                                       | Hipótesis de negocio                                                                                  | Decisión que habilita                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `inbound_order_created`            | Llega un nuevo lote de material de formación o de incorporación desde un proveedor            | Necesitamos saber cuánto material se produce/compra, para qué programa y con qué costo                     | Planificar la producción de material según demanda esperada de matrículas (Elena)                  |
| `outbound_order_created`           | Se entrega un kit o certificado a un cliente, candidato, consultor o agente                    | Necesitamos saber qué programas consumen más material y a qué ritmo                                        | Anticipar necesidades de reposición antes de una ola grande de matrículas (Elena)                   |
| `stock_threshold_triggered`        | El stock de un ítem de material cae por debajo del mínimo configurado                          | Necesitamos saber con qué frecuencia un programa se queda sin material disponible                          | Ajustar el umbral mínimo o acelerar la reimpresión/reproducción de ese material                     |
| `direct_stock_edit_rejected`       | Un usuario intenta modificar el stock directamente (fuera de una orden) y el sistema lo rechaza | Necesitamos saber si el personal intenta saltarse el control de trazabilidad del material                  | Reforzar capacitación o permisos en la oficina donde esto ocurre con más frecuencia (Patricia)       |
| `kit_cost_variance_detected`       | El costo unitario de una orden de entrada varía más de un umbral (ej. 10%) respecto al histórico del mismo material/proveedor | Necesitamos saber cuándo un proveedor de material sube precios de forma anómala                            | Alertar a Elena y a Laura para renegociar o buscar proveedor alterno                                |

**Campos mínimos en `properties` para los eventos de inventario** (además del envelope estándar): `office` (`valencia`/`miami`), `product_id`, `product_category` (`training_kit`/`certification`/`onboarding_equipment`), `programme_id`, `quantity`, `currency` (`EUR`/`USD`).

⚠️ No incluyas nombres de candidatos, clientes ni consultores en `properties` — usa solo el identificador del programa o del kit, nunca datos personales.

---

## 4. Cómo estas métricas conectan con el futuro

Estas métricas no son solo para el reporte técnico de hoy. A medida que avance el curso, estos mismos datos se van a reutilizar para automatizaciones y para reportes a nivel ejecutivo — con un nivel de agregación y de pulido bastante mayor al que estás construyendo ahora mismo. Diséñalas como si alguien más, más adelante, fuera a depender de ellas sin poder preguntarte cómo funcionan.

---

## 5. Datos semilla sugeridos

Genera al menos:

- 6–8 ítems de material distintos, cubriendo las 3 categorías (`training_kit`, `certification`, `onboarding_equipment`)
- Al menos 3 programas distintos
- 12–15 órdenes de entrada distribuidas entre Valencia y Miami
- 12–15 órdenes de salida (entregas)
- Al menos 2 casos que disparen `stock_threshold_triggered` y 1 caso de `kit_cost_variance_detected`

---

## 6. Restricciones de negocio

- Los montos deben registrarse en la moneda de la oficina (`EUR` para Valencia, `USD` para Miami) — no conviertas monedas en la capa de telemetría.
- El stock nunca se modifica directamente: toda modificación pasa por `InboundOrder` u `OutboundOrder`, trazable a un usuario.
- No mezcles el idioma de la interfaz (español/inglés) con la oficina — son dimensiones independientes.
