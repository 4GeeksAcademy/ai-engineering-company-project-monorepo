# Architecture Proposal — Backend FastAPI

Este documento presenta la propuesta de arquitectura para el backend de la empresa, justificando el patrón arquitectónico, la estructura de carpetas, la organización de dominios, los endpoints y los riesgos asociados. La propuesta se basa en buenas prácticas de FastAPI y en la realidad de nuestro contexto empresarial: un equipo pequeño, un producto en crecimiento y un frontend separado que consume nuestra API.

---

## 1. Patrón arquitectónico recomendado

### Patrón elegido: **Arquitectura en capas + DDD ligero (Domain-Driven Design)**

### Justificación
Nuestra empresa desarrolla productos donde:
- El **frontend y backend están separados**.
- La API debe ser **estable, versionada y fácil de mantener**.
- El equipo crecerá y necesitamos una estructura **modular y escalable**.
- Habrá múltiples dominios (auth, usuarios, agentes, administración…).

La arquitectura en capas permite separar responsabilidades y evitar que la lógica de negocio se mezcle con los endpoints.  
El enfoque DDD ligero nos ayuda a organizar el backend por **dominios reales del negocio**, lo que facilita la colaboración entre equipos y reduce el acoplamiento.

### Capas propuestas
- **API (routers/endpoints)** → recibe peticiones y delega.
- **Schemas (Pydantic)** → validación de entrada/salida.
- **Services** → lógica de negocio.
- **Repositories** → acceso a base de datos.
- **Models (ORM)** → representación interna de datos.
- **Core** → configuración, seguridad, middlewares.

Este patrón encaja perfectamente con FastAPI, que fomenta la separación de routers, modelos y configuración.

---

## 2. Estructura de carpetas y módulos

Propuesta de estructura:

backend/
├── app/
│    ├── api/
│    │    ├── v1/
│    │    │    ├── auth/
│    │    │    ├── users/
│    │    │    ├── agents/
│    │    │    └── admin/
│    ├── core/
│    │    ├── config.py
│    │    ├── security.py
│    │    └── exceptions.py
│    ├── models/
│    ├── schemas/
│    ├── services/
│    ├── repositories/
│    └── db/
│         ├── session.py
│         └── migrations/
└── tests/



### Criterio de separación
- **Por dominio**: cada área del negocio tiene su propio módulo (auth, users, agents…).  
- **Por responsabilidad**: cada capa tiene su propio directorio (services, repositories, schemas…).  
- **Por versión**: la API se versiona en `/api/v1` para permitir cambios futuros sin romper compatibilidad.

---

## 3. Organización de endpoints y routers (FastAPI)

### Enfoque
Los endpoints se agrupan por **dominio**, no por tipo de operación.  
Cada dominio tendrá su propio router y su propio módulo.

### Ejemplo de organización

#### Dominio: Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

#### Dominio: Users
- `GET /api/v1/users`
- `GET /api/v1/users/{id}`
- `PUT /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}`

#### Dominio: Agents
- `POST /api/v1/agents/run`
- `GET /api/v1/agents`
- `GET /api/v1/agents/{id}`

#### Dominio: Admin
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/logs`

### Criterio de agrupación
- Cada router representa un **dominio funcional**.  
- Los endpoints dentro del router representan **acciones del dominio**.  
- La API se versiona para garantizar estabilidad.

---

## 4. Influencia de las convenciones de FastAPI en la arquitectura

Tras investigar las prácticas estándar de FastAPI, se han incorporado las siguientes convenciones:

- **Separación de routers** por dominio para evitar archivos enormes.
- **Uso de Pydantic** para validar datos y definir contratos claros con el frontend.
- **Separación de lógica en services** para evitar lógica dentro de los endpoints.
- **Uso de repositories** para desacoplar la base de datos del resto del sistema.
- **Directorio core/** para configuración, seguridad y middlewares.
- **Versionado de API** en `/api/v1`.

Estas convenciones permiten que el proyecto sea mantenible, escalable y fácil de entender para nuevos desarrolladores.

---

## 5. Consideraciones cuando frontend y backend están separados

### Separación de repositorios
- El backend y frontend deben estar en repositorios distintos para evitar acoplamiento.
- La comunicación se realiza exclusivamente mediante **API REST**.

### Variables de entorno
- El backend debe exponer variables como:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `FRONTEND_URL`
  - `CORS_ALLOWED_ORIGINS`

### CORS
- Debe habilitarse CORS para permitir que el frontend consuma la API.
- Solo se deben permitir los dominios oficiales del frontend.

### Contratos API
- Los schemas de Pydantic actúan como contrato entre frontend y backend.
- Cambios en schemas deben comunicarse antes de desplegar.

---

## 6. Riesgos y puntos de atención

### 1. Mezclar lógica de negocio dentro de los endpoints
**Riesgo:** endpoints difíciles de mantener y probar.  
**Mitigación:** obligar a usar services y repositories.

### 2. Crecimiento desordenado del proyecto
**Riesgo:** módulos gigantes, rutas duplicadas, confusión en el equipo.  
**Mitigación:** estructura modular desde el inicio y documentación clara.

### 3. Falta de versionado en la API
**Riesgo:** romper el frontend cuando se hagan cambios.  
**Mitigación:** mantener `/api/v1` y planificar `/api/v2` cuando sea necesario.

### 4. Configuración incorrecta de CORS
**Riesgo:** el frontend no podrá consumir la API.  
**Mitigación:** definir correctamente los dominios permitidos.

---

## 7. Conclusión

La arquitectura propuesta combina buenas prácticas de FastAPI con una estructura modular basada en dominios. Esto permitirá que el backend crezca de forma ordenada, facilite la colaboración entre equipos y mantenga una API estable y bien organizada. La separación clara entre capas y dominios reduce riesgos y asegura que el proyecto pueda escalar sin problemas.


