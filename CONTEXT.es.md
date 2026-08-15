# Contexto Nexova - Operaciones Ejecutivas AgentHub

## Empresa
Nexova es una empresa de consultoria de RR. HH. y adquisicion de talento que opera en Chile y Argentina.
Este repositorio se centra en un producto de operaciones ejecutivas llamado AgentHub.

## Alcance del producto
AgentHub centraliza indicadores operativos de departamentos clave y ofrece:
- snapshots de KPIs por departamento
- alertas ejecutivas basadas en umbrales y rangos
- reportes ejecutivos semanales para direccion

## Usuario administrador principal
- Nombre: Laura Mendoza
- Rol: CEO
- Objetivo principal: monitorear la salud del negocio y anticipar riesgos

## Departamentos base
- sales
- recruiting
- training
- support
- hr
- marketing

## Entidades canonicas

### AdministratorUser
- `id: string`
- `createdAt: string` (fecha-hora ISO)
- `updatedAt: string` (fecha-hora ISO)
- `fullName: string`
- `email: string`
- `role: "ceo" | "director" | "manager"`
- `darkModeEnabled: boolean`
- `activeSkills: string[]`

### KpiSnapshot
- `id: string`
- `createdAt: string` (fecha-hora ISO)
- `updatedAt: string` (fecha-hora ISO)
- `department: "sales" | "recruiting" | "training" | "support" | "hr" | "marketing"`
- `snapshotDate: string` (fecha ISO)
- `revenueUSD: number`
- `openRoles: number`
- `avgTimeToHireDays: number`
- `slaCompliancePct: number`
- `leadsGenerated: number`

### ExecutiveAlert
- `id: string`
- `createdAt: string` (fecha-hora ISO)
- `updatedAt: string` (fecha-hora ISO)
- `department: Department`
- `severity: "low" | "medium" | "high" | "critical"`
- `message: string`
- `detectedAt: string` (fecha-hora ISO)
- `resolvedAt?: string` (fecha-hora ISO)

### WeeklyExecutiveReport
- `id: string`
- `createdAt: string` (fecha-hora ISO)
- `updatedAt: string` (fecha-hora ISO)
- `periodStart: string` (fecha ISO)
- `periodEnd: string` (fecha ISO)
- `generatedAt: string` (fecha-hora ISO)
- `totalRevenueUSD: number`
- `departmentSnapshots: KpiSnapshot[]`
- `highPriorityAlerts: ExecutiveAlert[]`

## Reglas de validacion de negocio
- Los campos obligatorios deben estar presentes antes de procesar o almacenar.
- Rangos numericos:
	- `revenueUSD`: 0 a 10,000,000 (snapshot individual)
	- `openRoles`: 0 a 10,000
	- `avgTimeToHireDays`: 0 a 365
	- `slaCompliancePct`: 0 a 100
	- `leadsGenerated`: 0 a 1,000,000
	- `totalRevenueUSD`: 0 a 100,000,000 (reporte semanal)
- Coherencia de fechas:
	- `periodStart <= periodEnd <= generatedAt`
	- `detectedAt <= resolvedAt` cuando la alerta este resuelta

## Operaciones de colecciones requeridas
- Filtrar colecciones por predicados.
- Ordenar colecciones asc/desc.
- Agrupar por categoria/departamento.
- Busqueda lineal para arrays no ordenados.
- Busqueda binaria para arrays ordenados.
- Manejo de arrays vacios y no encontrados como comportamiento base.

## Requisitos de transformaciones y agregaciones
- Conteo por categoria/departamento.
- Suma de valores numericos.
- Calculo de minimos y maximos.
- Calculo de promedios.
- Construccion de salidas ejecutivas tipadas.

## Restricciones tecnicas de este hito
- Codigo TypeScript modular.
- Tipado explicito en interfaces y firmas de funciones.
- Funciones pequenas de responsabilidad unica y nombres descriptivos.
