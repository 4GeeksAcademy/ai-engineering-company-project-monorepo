BRIEFING — Brasaland (Pipeline de Desempeño de Negocio)
Proyectos de Data Pipeline (Diseño · Implementación · Subflows y Tests)
These instructions are available in English.

Este archivo es autocontenido: te da todo lo necesario para acotar, construir y probar el pipeline de desempeño de negocio de Brasaland, sin tener que buscar en otros documentos. Se construye directamente sobre las métricas obligatorias ya definidas en tu brasaland-BRIEFING.md (telemetría) — léelo primero si no lo has hecho.

1. El entregable de negocio
   Mariana (CEO) quiere un reporte semanal que pueda abrir cada lunes sin tener que llamar a nadie, comparando cómo está funcionando cada uno de los 14 locales en costo y merma — las dos palancas que Felipe y Lucía siguen mencionando pero que hoy nadie centraliza.

Entregable objetivo: un consolidado semanal, por local y por país, de costo de compra, costo de merma y actividad de quiebre de stock — el "Reporte Semanal de Costo y Merma por Local".

Este es el único entregable concreto para el que existe tu pipeline. Todo lo que escribas en tu PIPELINE_DESIGN.md debe poder rastrearse hasta aquí.

Audiencia: Mariana (CEO) y Felipe (Director de Operaciones) — stakeholders no técnicos que necesitan números, no eventos crudos. Frecuencia: semanal (el dato debe estar fresco la mañana del lunes, alineado con la expectativa que ya tiene el equipo de liderazgo de un "reporte semanal automático").

2. KPIs a medir
   Estos son los KPIs para los que existe este pipeline. Todo lo demás en este documento — eventos de origen, lógica de agregación, esquema de tabla — es detalle de implementación al servicio de estos cinco números. Si no tienes claro qué construir a continuación, vuelve a esta lista.

KPI Qué mide Por qué le importa a Brasaland
Costo de compra por local Cuánto gastó un local comprando ingredientes a proveedores durante la semana. Muestra dónde se concentra el gasto y alimenta las negociaciones de compra entre locales (Lucía).
Costo de merma por local Cuánto perdió un local por producto vencido, error de cocina o robo durante la semana, en términos monetarios. La merma golpea directamente el margen — es el número que Felipe necesita para priorizar auditorías.
Ratio de merma El costo de merma como proporción del costo de compra, para ese local y esa semana. La señal de eficiencia: un local puede gastar mucho y ser eficiente si la merma se mantiene baja, o gastar poco y ser un problema si la merma es alta en relación con sus propias compras.
Frecuencia de quiebre de stock Cuántas veces durante la semana el stock de algún ingrediente en un local cayó por debajo del mínimo configurado. Un indicador temprano de riesgo de servicio — quiebres frecuentes significan que la cocina puede quedarse sin un ingrediente clave a media operación.
Frecuencia de alertas de precio Cuántas veces durante la semana el costo de un ingrediente subió de forma anómala respecto a su histórico. Le indica a Lucía cuándo necesita renegociar o buscar un proveedor alterno antes de que la tendencia de costo se agrave.
Todo lo que sigue existe únicamente para calcular estos cinco números de forma correcta, confiable y auditable.

3. Datos de origen
   Un chequeo rápido de esquema primero: este pipeline necesita un valor de costo en inbound_order_created y stock_waste_registered (ej. un campo unit_cost o total_cost en properties) para calcular el costo de compra y de merma. Si tu esquema de telemetría del hito anterior aún no lo tiene, agrégalo ahora — es una extensión natural de un evento obligatorio existente, no un tipo de evento nuevo.

Tu fuente es telemetry_events, filtrada a las métricas obligatorias ya definidas en tu BRIEFING de telemetría:

event_type Alimenta qué KPI(s)
inbound_order_created Costo de compra por local
outbound_order_created (solo volumen operativo — no es un KPI de este reporte, pero es contexto útil para detectar anomalías)
stock_waste_registered Costo de merma por local, Ratio de merma
stock_threshold_triggered Frecuencia de quiebre de stock
ingredient_price_variance_detected Frecuencia de alertas de precio
No necesitas ningún evento fuera de esta lista para la v1 — resiste la tentación de ampliar el alcance.

4. Agregación requerida
   Grano: una fila por location_id por semana ISO (week_start = el lunes de esa semana, UTC).
   Dimensiones: location_id, country (CO/US), week_start.
   Campos calculados por fila (cada uno mapea directamente a un KPI de la sección 2):
   total_purchase_cost — Costo de compra por local: suma de los costos de inbound_order_created de la semana, en la moneda local del local
   total_waste_cost — Costo de merma por local: suma de los costos de stock_waste_registered de la semana
   waste_ratio — Ratio de merma: total_waste_cost / total_purchase_cost (0 si no hubo compras esa semana)
   stockout_events_count — Frecuencia de quiebre de stock: conteo de stock_threshold_triggered de la semana
   price_alert_events_count — Frecuencia de alertas de precio: conteo de ingredient_price_variance_detected de la semana
   currency — COP o USD, según el país del local. No conviertas monedas en este pipeline — eso es un tema de v2, cuando exista una fuente de tipo de cambio.
5. Tabla de destino
   Crea esta tabla bajo un esquema dedicado reporting — nunca escribas en telemetry_events:

create table reporting.weekly_location_performance (
id uuid primary key default gen_random_uuid(),
location_id text not null,
country text not null,
week_start date not null,
total_purchase_cost numeric not null default 0,
total_waste_cost numeric not null default 0,
waste_ratio numeric not null default 0,
stockout_events_count integer not null default 0,
price_alert_events_count integer not null default 0,
currency text not null,
computed_at timestamptz not null default now(),
unique (location_id, week_start)
);
El constraint unique (location_id, week_start) es en el que debe apoyarse tu estrategia de idempotencia (upsert).

6. Nuevo endpoint de reporte
   Expón el resultado de este pipeline a través de un módulo nuevo, services/reporting/, separado de services/telemetry/:

GET /reporting/weekly-location-performance — acepta un week_start opcional (por defecto, la semana calculada más reciente); devuelve todos los locales de esa semana:
{
"week_start": "2026-07-13",
"locations": [
{
"location_id": "medellin-centro",
"country": "CO",
"total_purchase_cost": 8420000,
"total_waste_cost": 610000,
"waste_ratio": 0.072,
"stockout_events_count": 2,
"price_alert_events_count": 1,
"currency": "COP"
}
]
}
GET /reporting/pipeline-runs/latest — estado y metadata de la última corrida del pipeline (puedes reutilizar este mismo patrón para cualquier pipeline futuro).
POST /reporting/pipeline-runs — dispara una corrida manual. 7. Restricciones de negocio
Nunca mezcles monedas en una sola fila agregada — los locales en COP y USD se reportan por separado, lado a lado, no sumados entre sí.
Este pipeline lee telemetry_events en modo solo lectura. Nunca escribe de vuelta ahí.
services/telemetry/analysis.py y GET /telemetry/report quedan fuera del alcance de este hito — no los modifiques.
