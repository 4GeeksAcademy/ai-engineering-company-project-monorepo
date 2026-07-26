# Contexto de TrackFlow

TrackFlow es una empresa tecnológica de logística enfocada en operaciones de última milla y gestión de almacén en México y España. La compañía opera una web pública y un backoffice interno, ambos respaldados por un módulo compartido de lógica de negocio en TypeScript.

## Objetivo del negocio

Construir una plataforma operativa coherente para:

- Monitorizar inventario en tiempo real.
- Optimizar la selección de transportista por envío.
- Detectar alertas de bajo stock y riesgo operativo con antelación.
- Estandarizar reglas para que website y backoffice usen la misma lógica.

## Alcance del producto

- `uis/website`: experiencia pública para catálogo y visibilidad de envíos.
- `uis/backoffice`: operaciones internas para inventario, decisiones de envío y gestión diaria.
- `packages/logic`: fuente única de verdad de reglas de negocio (costos, scoring, filtros, validaciones y reportes).

## Entidades de dominio principales

Los contratos de datos de TrackFlow están en `packages/logic/src/trackflow/contracts.ts` e incluyen:

- `Product`: producto con SKU, dimensiones, stock, estado, almacén y costo unitario.
- `Carrier`: transportista con tarifas, confiabilidad, capacidad máxima y soporte de prioridades.
- `Shipment`: envío con origen, destino, prioridad, estado y valor declarado.

Enumeraciones operativas relevantes:

- Almacenes: `Los Angeles`, `Zaragoza`.
- Estado de producto: `Active`, `Low stock`, `Out of stock`.
- Prioridad de envío: `Standard`, `Express`, `Same-day`.
- Estado de envío: `Pending`, `Assigned`, `In transit`, `Delivered`, `Failed`.

## Reglas y restricciones operativas

1. La lógica de negocio vive exclusivamente en `packages/logic`.
2. Las capas UI no pueden duplicar cálculos, scoring ni validaciones.
3. Las transformaciones de datos deben ser inmutables.
4. La selección de transportista debe equilibrar capacidad y costo.
5. Las validaciones deben devolver errores explícitos y trazables.

## KPIs clave de operación

- Tasa de productos en bajo stock por almacén y categoría.
- Valor de inventario en riesgo (bajo stock + alto valor).
- Confiabilidad de entrega a tiempo por transportista.
- Distancia promedio y tendencia de costos por envío.
- Distribución de estados de envío y tasa de fallos.

## Dirección técnica

- Monorepo con npm workspaces.
- Aplicaciones UI en Next.js + TypeScript.
- Importación del paquete compartido (`@trackflow/logic`) desde su ubicación original.
- Sin copia de lógica entre aplicaciones.

## Alineación con ingeniería impulsada por IA

Todo flujo asistido por IA debe leer primero este contexto y el banco de memoria:

- `memory-bank/projectbrief.md`
- `memory-bank/techContext.md`
- `memory-bank/progress.md`
- `AGENTS.md`

Este documento es la referencia de dominio para el Hito 4 y para iteraciones posteriores.
