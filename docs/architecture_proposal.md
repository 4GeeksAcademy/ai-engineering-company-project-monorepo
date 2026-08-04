# Propuesta de Arquitectura de Backend - TrackFlow

## 1) Patron arquitectonico propuesto y justificacion

### Decision

Se propone una **arquitectura en capas por dominios (modular monolith + enfoque hexagonal)** implementada con FastAPI.

### Por que este patron es el mas adecuado para TrackFlow

TrackFlow tiene una complejidad funcional alta (inventario, envios, devoluciones, CX, comercial y capa ejecutiva), pero un equipo de tecnologia pequeno (7 personas) y una base tecnologica legacy heterogenea. En este contexto, empezar con microservicios puros aumentaria el costo operativo demasiado pronto.

Este patron permite:

- **Separar claramente responsabilidades por dominio** sin multiplicar despliegues y pipelines desde el primer dia.
- **Reducir el tiempo de entrega** (hoy 1-2 semanas por funcionalidad) al trabajar en un backend unificado con fronteras internas bien definidas.
- **Integrar sistemas legacy de forma incremental** (dos SGA, ERP antiguo, scripts Python) mediante adaptadores por dominio.
- **Escalar por evolucion**: cuando un dominio lo requiera (por carga, criticidad o autonomia de equipo), puede extraerse a servicio independiente sin rehacer toda la base.

En resumen: para la etapa actual de TrackFlow, esta arquitectura equilibra **velocidad, mantenibilidad y riesgo operativo** mejor que MVC simple, microservicios tempranos o serverless total.

## 2) Estructura de carpetas y modulos backend

Se propone crear el backend principal en `services/trackflow-api/`.

```text
services/
	trackflow-api/
		app/
			main.py
			api/
				v1/
					router.py
			core/
				config.py
				security.py
				logging.py
				telemetry.py
				errors.py
			shared/
				db/
					session.py
					models_base.py
				events/
					publisher.py
				contracts/
					pagination.py
					responses.py
			domains/
				inventory/
					api/
						router.py
						schemas.py
					application/
						services.py
						use_cases/
					domain/
						entities.py
						value_objects.py
						repository.py
					infrastructure/
						orm_models.py
						repository_sql.py
						adapters/
							warehouse_la_adapter.py
							warehouse_zgz_adapter.py
				shipping/
					api/
					application/
					domain/
					infrastructure/
						adapters/
							ups_adapter.py
							fedex_adapter.py
							mrw_adapter.py
							seur_adapter.py
				returns/
					api/
					application/
					domain/
					infrastructure/
				customer_experience/
					api/
					application/
					domain/
					infrastructure/
				commercial/
					api/
					application/
					domain/
					infrastructure/
				executive/
					api/
					application/
					domain/
					infrastructure/
			integrations/
				erp/
				email_ingestion/
			jobs/
				weekly_report_job.py
			tests/
				unit/
				integration/
```

### Criterio de separacion usado

Se aplica **separacion por dominio de negocio primero** y **separacion por responsabilidad tecnica dentro de cada dominio**:

- `api/`: contrato HTTP (routers, validacion de entrada/salida).
- `application/`: casos de uso y orquestacion.
- `domain/`: reglas de negocio puras.
- `infrastructure/`: persistencia y conectores externos.

Este criterio evita mezclar reglas de negocio con detalles de framework, base de datos o proveedores externos.

## 3) Organizacion de endpoints y routers en FastAPI

### Regla general de agrupacion

- Prefijo por version: `/api/v1`.
- Agrupacion por dominio: cada dominio expone su propio `router`.
- Convencion de recursos REST y acciones de negocio explicitas cuando aplica.

### Mapa propuesto de routers

#### Inventory router (`/api/v1/inventory`)

- `GET /stock/{sku}`: stock consolidado por SKU.
- `GET /stock/{sku}/by-warehouse`: stock por almacen (LA, Zaragoza).
- `POST /stock/alerts`: crear reglas de alerta de stock bajo.

#### Shipping router (`/api/v1/shipping`)

- `POST /carrier-selection/recommendation`: recomendacion de transportista.
- `GET /tracking/{tracking_id}`: tracking unificado multi-carrier.
- `POST /shipments`: alta de envio.

#### Returns router (`/api/v1/returns`)

- `POST /requests`: solicitud de devolucion.
- `POST /requests/{return_id}/decision`: aprobacion/rechazo automatico o manual.
- `POST /requests/{return_id}/pickup`: programacion de recogida.

#### Customer Experience router (`/api/v1/cx`)

- `POST /tickets`: crear ticket.
- `GET /tickets/{ticket_id}`: estado de ticket.
- `POST /assistant/reply`: respuesta asistida para soporte.

#### Commercial router (`/api/v1/commercial`)

- `GET /clients/{client_id}/health`: score de salud de cliente.
- `POST /reports/monthly`: generar informe de cliente.
- `GET /renewals/risks`: cuentas con riesgo de no renovar.

#### Executive router (`/api/v1/executive`)

- `GET /kpis/global`: KPIs globales en tiempo real.
- `GET /kpis/by-country`: comparativa US vs ES.
- `POST /reports/weekly/generate`: generar informe semanal.

## 4) Estructura habitual en FastAPI y como influye en esta propuesta

En proyectos FastAPI maduros es comun encontrar:

- `main.py` como punto de entrada.
- `api/routers` para separar endpoints.
- `schemas` (Pydantic) separados de modelos ORM.
- `core/config` para settings y secretos.
- `dependencies` para auth, DB y contexto.
- `tests` unitarios e integracion.

Esta propuesta adopta esas convenciones, pero agrega una capa de **dominios explicitos** para no caer en una estructura meramente tecnica (por ejemplo, un unico directorio gigante de `models`, `services` y `routers` sin frontera de negocio).

Impacto practico de esta decision:

- Menor acoplamiento entre equipos y funcionalidades.
- Mejor trazabilidad de cambios por dominio.
- Facilidad para extraer dominios a microservicios en el futuro.

## 5) Frontend y backend separados: consideraciones de arquitectura

TrackFlow ya opera como monorepo con carpetas separadas de UI y servicios. La recomendacion es mantener:

- Frontends en `uis/` (por ejemplo, Next.js para portales y dashboards).
- Backends en `services/` (FastAPI para APIs de dominio).

### Comunicacion

- Contrato principal via HTTP/JSON.
- Versionado de API (`/api/v1`) para compatibilidad hacia atras.
- OpenAPI como contrato publico para consumidores internos.

### Variables de entorno

- Frontend: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ENV`.
- Backend: `APP_ENV`, `DATABASE_URL`, `REDIS_URL`, `ALLOWED_ORIGINS`, `ERP_API_URL`, credenciales de carriers.

### CORS

- Configuracion restrictiva por ambiente.
- En produccion, permitir solo dominios de UIs oficiales.
- Bloquear wildcard `*` salvo en entorno local de desarrollo.

### Despliegue y repositorio

- Monorepo recomendado para esta fase por coordinacion entre equipos pequenos.
- Pipelines CI separados por carpeta (`uis/*`, `services/*`) para no bloquear despliegues independientes.

## 6) Riesgos y puntos de atencion si no se sigue la estructura

1. **Acoplamiento y deuda tecnica acelerada**
Si se mezclan dominios y capas, cualquier cambio pequeno (por ejemplo en devoluciones) puede romper inventario o tracking. El resultado es menor velocidad y mayor riesgo de regresiones.

2. **Dificultad para escalar y operar 24/7**
Sin fronteras claras ni observabilidad uniforme, los incidentes seguiran detectandose tarde (como ocurre hoy por WhatsApp) y el MTTR aumentara.

3. **Integraciones externas fragiles**
Si los adaptadores de carriers/ERP no quedan encapsulados, un cambio en un proveedor externo puede impactar toda la API.

4. **Inconsistencia entre paises (US/ES)**
Sin contratos y modelos unificados, cada sede podria implementar variaciones incompatibles en inventario, tracking o KPIs ejecutivos.

## 7) Conclusiones

La arquitectura propuesta (modular monolith por dominios con capas tipo hexagonal en FastAPI) es la opcion mas equilibrada para la realidad actual de TrackFlow: permite ordenar el caos de sistemas legacy, acelerar entregas y preparar una evolucion controlada hacia servicios mas desacoplados cuando el negocio lo exija.

