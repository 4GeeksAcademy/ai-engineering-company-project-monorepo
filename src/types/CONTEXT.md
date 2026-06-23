# Contexto de Modelos de Dominio (`src/types/models.ts`)

Este módulo define los tipos y entidades principales para operaciones de logística, última milla, devoluciones y soporte al cliente.

## 1) Tipos base

- `CountryCode`: países soportados (`US`, `ES`).
- `WarehouseCode`: almacenes (`LA`, `ZGZ`).
- `CarrierCode`: transportistas (`UPS`, `FEDEX`, `DHL`, `MRW`, `SEUR`, `LOCAL_1`, `LOCAL_2`).
- `ShipmentStatus`: estado de envío (`pending`, `in_transit`, `delivered`, `failed`, `returned`).
- `TicketChannel`: canal de ticket (`email`, `whatsapp`, `phone`).
- `TicketPriority`: prioridad de ticket (`low`, `medium`, `high`).
- `ReturnCondition`: condición del producto devuelto (`new`, `opened`, `damaged`, `unusable`).

## 2) Interfaces por dominio

### Warehouse

Representa un almacén físico.

- Propiedades clave: `id`, `code`, `name`, `city`, `country`, `capacityUnits`, `active`.
- Método:
	- `occupancyRate(currentUnits: number): number` calcula ocupación en porcentaje.

### InventoryItem

Representa stock de una SKU en un almacén.

- Propiedades clave: `sku`, `warehouseCode`, `quantityAvailable`, `reorderPoint`, `unitCostEur`, `updatedAt`.
- Métodos:
	- `inventoryValue(): number` calcula valor total del inventario de la SKU.
	- `isLowStock(): boolean` indica si está en o por debajo del punto de reposición.

### CarrierPerformance

Métricas de desempeño de transportista por país.

- Propiedades clave: `carrier`, `country`, `totalShipments`, `onTimeShipments`, `incidents`, `avgCostPerKgEur`.
- Métodos:
	- `onTimeRate(): number` tasa de entregas a tiempo.
	- `incidentRate(): number` tasa de incidencias.

### Shipment

Representa un envío de pedido.

- Propiedades clave: `id`, `orderId`, `carrier`, `originWarehouse`, `destinationCountry`, `weightKg`, `priority`, `shippedAt`, `estimatedDeliveryAt`, `deliveredAt?`, `status`.
- Método:
	- `isLate(referenceDateISO?: string): boolean` valida retraso si no está entregado y ya superó la fecha estimada.

### ReturnRequest

Representa una solicitud de devolución.

- Propiedades clave: `id`, `orderId`, `customerId`, `country`, `reason`, `condition`, `approved`, `requestedAt`, `processedAt?`.
- Método:
	- `autoApprovalEligible(): boolean` determina elegibilidad de autoaprobación según condición.

### SupportTicket

Representa una incidencia de cliente.

- Propiedades clave: `id`, `customerId`, `channel`, `language`, `topic`, `priority`, `firstResponseMinutes?`, `createdAt`.
- Método:
	- `isSlaBreached(maxMinutes: number): boolean` verifica incumplimiento de SLA por tiempo de primera respuesta.

## 3) Objetos literales de ejemplo

El archivo incluye instancias concretas para validación rápida y aprendizaje:

- `warehouseLA`: ejemplo de almacén en Los Ángeles.
- `inventorySkuA100`: inventario de SKU con método de valor y low stock.
- `carrierSeurSpain`: performance de SEUR en España.
- `shipmentExample`: envío urgente en tránsito con cálculo de retraso.
- `returnExample`: devolución en estado `opened` con evaluación de autoaprobación.
- `ticketExample`: ticket de tracking por WhatsApp con validación SLA.

## 4) Dataset agregado

- `sampleData` agrupa todos los ejemplos en colecciones:
	- `warehouses`
	- `inventory`
	- `carrierPerformance`
	- `shipments`
	- `returns`
	- `tickets`

## 5) Notas de diseño

- Los métodos en interfaces permiten encapsular reglas de negocio simples en cada entidad.
- Se usan tipos literales para restringir valores válidos y evitar estados inválidos en tiempo de compilación.
- El módulo está orientado a servir como base de ejercicios, tests y prototipos funcionales del dominio logístico.
