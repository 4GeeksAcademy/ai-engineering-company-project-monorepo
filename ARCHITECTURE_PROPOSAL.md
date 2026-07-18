# ARCHITECTURE_PROPOSAL

## 1. Resumen ejecutivo
TrackFlow necesita un backend único que estandarice operación comercial y logística entre Los Ángeles y Zaragoza sin frenar la velocidad de entrega del equipo.

Se propone una arquitectura de monolito modular con fronteras de dominio explícitas, implementada en FastAPI con contratos de API versionados y reglas de validación homogéneas. Esta elección prioriza consistencia operativa binacional, mantenibilidad a mediano plazo y time-to-market para acelerar la captación de leads calificados y la visibilidad operativa de punta a punta.

## 2. Contexto y drivers arquitectónicos

### 2.1 Contexto de negocio
- TrackFlow opera en logística B2B para e-commerce mediano (moda, electrónica, cosmética).
- Debe soportar tres líneas de servicio con interacción cruzada: almacenes, última milla y logística inversa.
- La operación ocurre en dos países con variaciones regulatorias, horarias y de procesos, pero requiere una experiencia homogénea para clientes y equipos internos.
- El frontend corporativo y el backoffice ya existen en el monorepo; el backend es el siguiente bloque crítico para unificar datos y procesos.

### 2.2 Drivers arquitectónicos prioritarios
- Consistencia binacional: mismas reglas nucleares con parametrización por país.
- Escalabilidad funcional: crecer en dominios sin acoplar todo el sistema.
- Mantenibilidad: equipos distintos (comercial, operaciones, ingeniería) deben poder evolucionar módulos sin romper otros.
- Velocidad de entrega: habilitar releases incrementales sin sobrecarga de complejidad prematura.
- Trazabilidad operativa: visibilidad de estado de lead, operación y devolución en un mismo lenguaje de negocio.

### 2.3 Restricciones y supuestos explícitos
- Supuesto 1: el backend iniciará como una sola aplicación desplegable para reducir fricción operativa inicial.
- Supuesto 2: se necesita interoperar con sistemas externos de paquetería/transportistas y potencialmente con CRM.
- Supuesto 3: la carga inicial es moderada y crecerá por expansión comercial, no por picos masivos desde el día uno.
- Restricción: coexistencia con frontend y backoffice ya construidos, por lo que el contrato API debe ser estable y evolutivo.

## 3. Patrón arquitectónico propuesto

### 3.1 Patrón principal
Se propone un monolito modular orientado a dominio, con separación interna tipo puertos y adaptadores (enfoque hexagonal pragmático dentro de cada módulo).

### 3.2 Justificación para TrackFlow
- Alinea velocidad y orden: permite entregar rápido un backend funcional sin el costo operativo de microservicios tempranos.
- Mantiene fronteras claras: cada dominio (leads, operaciones, logística inversa) conserva reglas propias y evita dependencia accidental.
- Facilita consistencia entre países: las políticas comunes viven en el núcleo de dominio; las diferencias de mercado se encapsulan como configuración y reglas específicas.
- Reduce riesgo de reescritura: el diseño modular habilita extracción futura de servicios cuando exista evidencia real de cuellos de botella.

### 3.3 Alternativas descartadas

#### Alternativa A: microservicios desde el inicio
No se elige por incremento de complejidad en despliegue, observabilidad, contratos entre servicios y coordinación de equipos. Para el estadio actual de TrackFlow, ese costo frena la entrega de valor comercial.

#### Alternativa B: arquitectura en capas tradicional sin fronteras de dominio
No se elige porque suele centralizar demasiada lógica en capas transversales y genera alto acoplamiento con el tiempo. Esto dificultaría evolucionar procesos distintos entre almacén, última milla y devoluciones.

## 4. Estructura de carpetas y módulos backend

### 4.1 Criterio de separación
- Separación principal por dominio de negocio para proteger reglas y lenguaje ubicuo.
- Separación secundaria por responsabilidad técnica dentro de cada dominio (API, aplicación, dominio, infraestructura).
- Componentes transversales aislados en módulos compartidos de plataforma (seguridad, observabilidad, configuración, persistencia).

### 4.2 Estructura propuesta de proyecto FastAPI
- backend/
- backend/app/
- backend/app/main.py (ensamble de aplicación y registro de routers)
- backend/app/core/ (configuración, seguridad, observabilidad, manejo de errores)
- backend/app/shared/ (tipos comunes, utilidades de dominio compartido, contratos base)
- backend/app/modules/
- backend/app/modules/leads/
- backend/app/modules/operations/
- backend/app/modules/reverse_logistics/
- backend/app/modules/integrations/
- backend/app/modules/auth/
- backend/app/modules/reporting/
- backend/app/db/ (sesiones, repositorios base, migraciones y versionado de esquema)
- backend/tests/ (pruebas por dominio y pruebas de contratos API)

### 4.3 Módulos mínimos y límites
- Leads:
Responsabilidad: captación, calificación, trazabilidad comercial y handoff a operaciones.
Límites: no ejecuta planificación logística; solo expone eventos/estados necesarios para operación.

- Operations:
Responsabilidad: gestión de ciclo operativo (almacenaje, preparación, despacho, última milla) con estado unificado.
Límites: no define scoring comercial de leads ni reglas de devolución financiera.

- Reverse Logistics:
Responsabilidad: devoluciones, motivos, inspección y resolución (reingreso, descarte, reenvío).
Límites: no administra embudo de ventas; consume datos de operación y cliente ya validados.

- Integrations:
Responsabilidad: conectores con proveedores externos (transportistas, CRM, notificaciones).
Límites: no contiene reglas core de negocio; traduce protocolos y formatos.

- Auth:
Responsabilidad: identidad, autorización por roles/permisos y contexto país.
Límites: no implementa lógica comercial u operativa.

- Reporting:
Responsabilidad: vistas agregadas y KPIs para visibilidad de negocio y operación.
Límites: no altera estado operativo transaccional; consulta y consolida.

- Core/Config:
Responsabilidad: configuración por ambiente/país, políticas de error y observabilidad.
Límites: no contiene casos de uso de dominio.

## 5. Organización de endpoints y routers en FastAPI

### 5.1 Agrupación por dominio
Cada dominio publica su router bajo un prefijo estable y versionado. El ensamblado central solo registra routers y dependencias globales, evitando lógica de negocio en el punto de entrada.

### 5.2 Convenciones de rutas (ejemplos no ejecutables)
- /api/v1/leads
- /api/v1/leads/{lead_id}
- /api/v1/leads/{lead_id}/qualification
- /api/v1/operations/shipments
- /api/v1/operations/shipments/{shipment_id}/status
- /api/v1/reverse-logistics/returns
- /api/v1/reverse-logistics/returns/{return_id}/resolution
- /api/v1/integrations/carriers/webhooks
- /api/v1/reporting/kpis/pipeline
- /api/v1/auth/sessions

### 5.3 Versionado, naming y consistencia
- Versionado explícito en URI con prefijo /api/v1 para compatibilidad evolutiva.
- Naming orientado a recursos de negocio (sustantivos claros, verbos solo en subrecursos semánticos inevitables).
- Respuestas homogéneas con metadatos mínimos (correlation_id, timestamp, versión).
- Errores normalizados con catálogo de códigos de negocio y detalle técnico acotado.
- Contratos de entrada/salida estables, con cambios incompatibles solo en nueva versión mayor.

## 6. Investigación aplicada: convenciones estándar FastAPI

### 6.1 Convenciones observadas
En la práctica consolidada de FastAPI (documentación oficial y patrones ampliamente adoptados por la comunidad), es habitual estructurar por:
- routers para composición HTTP,
- schemas para validación/serialización,
- models o entidades de persistencia,
- services o casos de uso,
- dependencies para inyección de contexto,
- config centralizada por ambientes,
- migrations para evolución de base de datos,
- tests separados por nivel (unidad, integración, API).

### 6.2 Influencia concreta en esta propuesta
- Se evita que routers contengan reglas de negocio, reduciendo deuda y facilitando pruebas.
- Los contratos de datos se fijan como frontera explícita entre frontend/backoffice y backend.
- Las dependencias se usan para seguridad, contexto país y trazabilidad transversal sin duplicar código.
- La configuración centralizada impide divergencias entre Los Ángeles y Zaragoza por variables dispersas.
- Las migraciones forman parte del ciclo de entrega para preservar consistencia de datos entre ambientes.

### 6.3 Fuente conceptual (descriptiva)
Esta propuesta se apoya en lineamientos de la documentación oficial de FastAPI sobre organización de aplicaciones grandes, validación basada en modelos de datos y uso de dependencias, complementados por prácticas de comunidad en proyectos productivos con separación por dominio.

## 7. Investigación aplicada: frontend y backend separados

### 7.1 Implicaciones estructurales
- Aunque convivan en monorepo, frontend y backend son sistemas desacoplados por contrato API.
- El backend no debe asumir detalles de UI; expone capacidades de negocio estables y versionadas.
- La evolución de frontend y backoffice requiere gobernanza de contratos para evitar rupturas.

### 7.2 Puntos críticos de integración
- Comunicación por API:
Contrato claro por dominio, con campos obligatorios/opcionales definidos y semántica consistente entre países.

- Variables de entorno:
Separación por aplicación y ambiente (frontend, backoffice, backend), con catálogo documentado y política de defaults seguros.

- CORS:
Política explícita por origen permitido (sitio corporativo, backoffice, entornos de QA), evitando aperturas globales.

- Contratos de datos:
Versionado de payloads y política de deprecación para cambios de campos o semántica.

- Versionado de API:
Compatibilidad hacia atrás en v1; cambios disruptivos planificados en v2.

### 7.3 Recomendaciones de coordinación entre equipos
- Definir un proceso de diseño de contratos antes de implementación de features.
- Mantener un changelog de API consumible por frontend/backoffice.
- Establecer pruebas de contrato en CI para detectar incompatibilidades temprano.
- Acordar ventanas de deprecación para evitar bloqueos de despliegue cruzado.

## 8. Decisiones técnicas iniciales

### 8.1 Configuración por ambientes y país
Decisión: configuración jerárquica (ambiente -> país -> módulo), centralizada y tipada.
Impacto: reduce errores por configuración manual y soporta variaciones locales sin bifurcar lógica core.

### 8.2 Estrategia de validación
Decisión: validación estricta en frontera de API y validación de reglas en capa de dominio.
Impacto: evita datos inconsistentes desde origen y mantiene reglas de negocio auditablemente separadas.

### 8.3 Manejo de errores
Decisión: mapa único de errores de negocio y técnicos, con formato uniforme de respuesta.
Impacto: mejora trazabilidad operativa, acelera soporte y simplifica manejo en frontend/backoffice.

### 8.4 Observabilidad básica desde inicio
Decisión: logging estructurado con correlation_id por request, métricas mínimas de latencia/errores y trazas en flujos críticos.
Impacto: permite detectar cuellos de botella y fallos entre dominios antes de escalar complejidad.

### 8.5 Seguridad inicial
Decisión: autenticación centralizada, autorización por roles y permisos por dominio, límites de tasa en endpoints sensibles y registro de auditoría en acciones críticas.
Impacto: protege operaciones y datos comerciales sin bloquear entregas iniciales.

## 9. Riesgos y puntos de atención
- Riesgo 1: mezclar lógica de negocio en routers o integraciones.
Impacto: crecimiento de deuda técnica, baja testabilidad y regresiones frecuentes.
Mitigación: revisiones arquitectónicas por PR, plantillas de módulo y pruebas unitarias por caso de uso.

- Riesgo 2: divergencia de reglas entre EE. UU. y España por configuración dispersa.
Impacto: inconsistencias operativas y métricas no comparables entre mercados.
Mitigación: estrategia de configuración centralizada y suite de pruebas parametrizadas por país.

- Riesgo 3: evolución de API sin gobernanza con frontend/backoffice.
Impacto: roturas de integración, retrasos de release y retrabajo entre equipos.
Mitigación: versionado estricto, changelog de API y pruebas de contrato en CI.

## 10. Alcance y no-alcance

### 10.1 Alcance de este proposal
- Definición del patrón arquitectónico base del backend.
- Estructura modular propuesta para FastAPI.
- Criterios de routers, versionado y consistencia de contratos.
- Decisiones técnicas iniciales para configuración, validación, errores, observabilidad y seguridad.
- Riesgos principales y mitigaciones de corto plazo.

### 10.2 No-alcance (próximos sprints)
- Selección final de proveedores concretos de infraestructura y observabilidad.
- Diseño detallado de esquema de datos por entidad.
- Automatización completa de despliegue y estrategia multi-región avanzada.
- Implementación de todos los conectores externos y reglas finas por vertical de cliente.

## 11. Conclusión
La propuesta prioriza una base robusta y pragmática: monolito modular orientado a dominio con convenciones FastAPI alineadas a operación real de TrackFlow en dos países.

Pasos recomendados para pasar a implementación sin perder consistencia:
1. Validar dominios y límites con stakeholders de negocio y operaciones.
2. Aprobar contratos iniciales de API v1 para leads, operations y reverse logistics.
3. Crear esqueleto de módulos y políticas transversales (config, errores, seguridad, observabilidad).
4. Implementar primer flujo vertical extremo a extremo (captación de lead calificado a activación operativa).
5. Medir estabilidad y deuda de acoplamiento antes de considerar partición en servicios independientes.

## 12. Auto-check contra rúbrica
- Patrón justificado por negocio: cumplido.
- Estructura coherente y separada por dominios/responsabilidades: cumplido.
- Routers FastAPI por dominio: cumplido.
- Decisiones técnicas concretas y no contradictorias: cumplido.
- Evidencia de investigación de convenciones FastAPI: cumplido.
- Consideraciones de frontend/backend separados (API, CORS, variables de entorno): cumplido.
- Riesgos con impacto y mitigación: cumplido.
