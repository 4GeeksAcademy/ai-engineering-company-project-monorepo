# BRIEFING — Brasaland

## Proyectos de Telemetría (Plan · Captura · Almacenamiento · Reporte)

<!-- hide -->

_These instructions are [available in English](./brasaland-BRIEFING.md)._

<!-- endhide -->

---

## 1. Tu compañía

Brasaland es una cadena de restaurantes de comida a la brasa con 14 locales entre Colombia y Florida. El sistema de gestión de inventario es el que usa cada local para controlar sus ingredientes: carnes, vegetales, salsas, bebidas y empaques. Ese sistema ya está en producción — pero, como dice tu tech lead, "el equipo de operaciones no tiene idea de qué está pasando dentro de él".

Tu Plan de Telemetría, tu captura, tu almacenamiento y tu reporte técnico giran alrededor de ese sistema de inventario, y son la base sobre la que, más adelante, Brasaland construirá su dashboard ejecutivo y sus reportes de negocio (ventas por local, comparación Colombia vs. Florida, alertas estratégicas para Mariana y Felipe).

---

## 2. Entidades del sistema de inventario en Brasaland

| Entidad         | En Brasaland significa...                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `Product`      | Un ingrediente o insumo: ej. `lomo de res`, `pollo entero`, `salsa de la casa`, `empaque para llevar`. Cada producto tiene una unidad de medida (kg, unidad, litro) y pertenece a una categoría (proteína, vegetal, salsa, bebida, empaque, limpieza). |
| `InboundOrder`  | Una orden de entrada: mercancía recibida de un proveedor en un local específico.            |
| `OutboundOrder` | Una orden de salida: consumo de ingredientes en la preparación de platos, o merma registrada (producto vencido, error de cocina, robo). |
| `location`      | Cada uno de los 14 locales, identificado por país (`CO`/`US`) y ciudad.                     |
| `supplier`      | Uno de los ~20 proveedores de Brasaland, distintos por país.                                |

---

## 3. Métricas obligatorias de telemetría

Estas son las métricas que Brasaland necesita medir **desde ya**, sin importar qué más identifiques en tu propio catálogo. Van directamente al piso de tu Plan de Telemetría (Fase 1) y deben estar instrumentadas de punta a punta (captura → almacenamiento) al final de la serie de proyectos.

> Estas métricas no son solo para hoy: más adelante en el curso alimentarán el dashboard operativo de Felipe y el reporte ejecutivo semanal de Mariana. Diséñalas pensando en que en el futuro se van a agregar por local, por país y por semana.

| `event_type`                    | Se dispara cuando...                                                             | Hipótesis de negocio                                                                                  | Decisión que habilita                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `inbound_order_created`         | Un local registra la llegada de mercancía de un proveedor                        | Necesitamos saber cuánto y qué se está comprando, por local y por proveedor                              | Consolidar compras entre locales para negociar mejores precios (Lucía)                          |
| `outbound_order_created`        | Un local registra consumo de ingredientes en la preparación de un plato          | Necesitamos saber qué ingredientes se consumen más, y a qué ritmo, por local                              | Ajustar la sugerencia automática de pedidos a proveedores (Felipe)                               |
| `stock_waste_registered`        | Un local registra merma (producto vencido, error de cocina, o pérdida/robo)      | Necesitamos saber cuánto producto se pierde, por qué razón, y en qué local                                | Priorizar auditorías de merma en los locales con peor indicador (Felipe)                        |
| `stock_threshold_triggered`     | El stock de un producto cae por debajo del mínimo configurado para ese local     | Necesitamos saber con qué frecuencia un local se queda corto de un ingrediente clave                     | Ajustar el umbral mínimo o la frecuencia de reabastecimiento de ese producto                     |
| `direct_stock_edit_rejected`    | Un usuario intenta modificar el stock directamente (fuera de una orden) y el sistema lo rechaza | Necesitamos saber si el personal está intentando saltarse el control de trazabilidad                     | Reforzar capacitación o permisos en los locales donde esto ocurre con más frecuencia (Jake)      |
| `ingredient_price_variance_detected` | El costo unitario de una orden de entrada varía más de un umbral (ej. 10%) respecto al histórico del mismo producto/proveedor | Necesitamos saber cuándo un ingrediente clave (ej. carne) sube de precio de forma anómala                | Alertar a Lucía y a Mariana para renegociar o buscar proveedor alterno                            |

**Campos mínimos en `properties` para los eventos de inventario** (además del envelope estándar): `location_id`, `country` (`CO`/`US`), `product_id`, `product_category`, `quantity`, `unit`, `currency` (`COP`/`USD`), y para `outbound_order_created`/`stock_waste_registered` además `reason` (solo para merma: `expired`, `kitchen_error`, `theft_suspected`).

⚠️ No incluyas nombres de empleados ni datos de clientes en `properties` — estos eventos describen productos y locales, no personas.

---

## 4. Cómo estas métricas conectan con el futuro

Estas métricas no son solo para el reporte técnico de hoy. A medida que avance el curso, estos mismos datos se van a reutilizar para automatizaciones y para reportes a nivel ejecutivo — con un nivel de agregación y de pulido bastante mayor al que estás construyendo ahora mismo. Diséñalas como si alguien más, más adelante, fuera a depender de ellas sin poder preguntarte cómo funcionan.

Diseñar bien el envelope y el allowlist de estos eventos hoy evita tener que reinstrumentarlos más adelante.

---

## 5. Datos semilla sugeridos

Genera al menos:

- 8–10 productos distintos, cubriendo al menos 3 categorías (proteína, vegetal/salsa, empaque)
- 3 locales (al menos uno en Colombia y uno en Florida)
- 15–20 órdenes de entrada distribuidas entre esos locales y al menos 3 proveedores
- 15–20 órdenes de salida, incluyendo al menos 3 registros de merma con distintas razones
- Al menos 2 casos que disparen `stock_threshold_triggered` y 1 caso de `ingredient_price_variance_detected`

---

## 6. Restricciones de negocio

- Los montos deben registrarse en la moneda del local (`COP` para Colombia, `USD` para Florida) — no conviertas monedas en la capa de telemetría, eso es trabajo del pipeline de reporting ejecutivo más adelante.
- El stock nunca se modifica directamente: toda modificación pasa por `InboundOrder` u `OutboundOrder`, trazable a un usuario.
- Cualquier evento relacionado con el idioma de la interfaz (español/inglés) es independiente de estas métricas — no mezcles idioma de UI con `country` del local.
