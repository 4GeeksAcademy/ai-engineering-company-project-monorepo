# CONTEXT — Gestor de Incidencias Centralizado · Nexova

## Tu empresa

**Nexova** es una consultora de recursos humanos y adquisición de talento con **120 empleados**, con sede en Valencia (España) y oficina en Miami (EE.UU.). Opera en tres líneas de negocio: headhunting, externalización de equipos de soporte al cliente para empresas tecnológicas, y formación corporativa.

Como parte del equipo de **AI Engineering de Nexova**, llevas hitos construyendo la plataforma interna. Este proyecto integra en esa plataforma un gestor centralizado de incidencias. En Nexova, las incidencias no son solo fallos de infraestructura: también incluyen quejas de clientes corporativos, errores en procesos de selección y problemas del equipo de soporte externalizado.

---

## Quién lo usa y por qué

**Sergio Molina (CTO)** necesita visibilidad centralizada de todos los problemas técnicos y operativos que hoy llegan por email, Slack o de viva voz. Sin un registro estructurado, no puede medir ni mejorar los tiempos de resolución.

**Roberto Díaz (Customer Support Lead)** gestiona 30 agentes que atienden incidencias de los clientes de Nexova. Hoy trabajan con un helpdesk legacy y sin base de conocimiento centralizada. Este gestor será el primer paso hacia un sistema estructurado.

**Laura Mendoza (CEO)** quiere saber cuántas incidencias críticas hay abiertas en este momento, desde qué oficina vienen y cuánto tiempo llevan sin resolver.

---

## Oficinas de Nexova

El campo `branch` debe contener exactamente uno de estos valores:

| Valor en base de datos | Nombre para mostrar             |
| ---------------------- | ------------------------------- |
| `central`              | Central — Sede Valencia         |
| `valencia_operations`  | Valencia — Operaciones          |
| `miami_office`         | Miami Office                    |
| `remote`               | Remoto (empleado sin sede fija) |

Usa `central` cuando la incidencia no corresponda a una oficina concreta — por ejemplo, reportes `internal` de dirección o quejas `customer` sin sede asociada. `central` es la sede central de Nexova en Valencia; no uses un valor aparte para headquarters.

---

## Categorías de incidencias

El campo `category` debe contener exactamente uno de estos valores:

| Valor               | Descripción                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| `technical_failure` | Fallo de sistema o herramienta tecnológica (ATS, HubSpot, Zendesk, infraestructura) |
| `process_error`     | Error en un proceso operativo: selección, incorporación, formación, facturación     |
| `client_complaint`  | Queja o reclamación de un cliente corporativo sobre el servicio prestado            |
| `candidate_issue`   | Problema reportado por o relacionado con un candidato en proceso de selección       |
| `staff_issue`       | Incidencia interna de RRHH: ausencia, conflicto, accidente, baja                    |
| `sla_breach`        | Incumplimiento de SLA comprometido con un cliente                                   |
| `data_quality`      | Error o inconsistencia en datos de candidatos, clientes o reportes                  |
| `other`             | Cualquier incidencia que no encaje en las categorías anteriores                     |

---

## Estados y ciclo de vida

| Valor         | Significado en Nexova                                           |
| ------------- | --------------------------------------------------------------- |
| `open`        | Incidencia registrada, sin responsable asignado aún             |
| `in_progress` | Asignada a un equipo o persona, en gestión activa               |
| `resolved`    | Resuelta y confirmada por quien la reportó o por el responsable |
| `discarded`   | Registrada por error, duplicada o fuera de alcance              |

Transiciones válidas: `open → in_progress`, `open → discarded`, `in_progress → resolved`, `in_progress → discarded`. Los estados `resolved` y `discarded` son finales.

---

## Orígenes

| Valor      | Cuándo usarlo en Nexova                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `customer` | Reportada por un cliente corporativo (empresa que contrata servicios de Nexova) |
| `branch`   | Reportada por personal de una de las oficinas de Nexova                         |
| `internal` | Detectada internamente por tecnología, operaciones o dirección                  |

---

## Datos históricos — seed desde CSV

El fichero CSV del proyecto **incidents-file-analyzer** (`incidents-nexova.csv` en `content/contexts/incidents-file-analysis/`) contiene incidencias exportadas del helpdesk de soporte al cliente. Todas corresponden a quejas o problemas reportados por clientes corporativos (`origin: "customer"`).

El esquema del CSV del analizador usa nombres de campo, estados y categorías distintos a los de este gestor. **No insertes filas del CSV directamente.** Reutiliza la lógica de validación compartida del analizador y aplica las transformaciones siguientes antes del insert.

**Campo identificador para idempotencia:** usa `ticket_id` del CSV. Si no existe, usa la combinación `title + created_at`.

### Mapeo directo de campos

| Campo CSV     | Campo del modelo | Transformación                                                                 |
| ------------- | ---------------- | ------------------------------------------------------------------------------ |
| `ticket_id`   | —                | Solo control de duplicados — no se almacena                                    |
| `description` | `title`          | Primeros 120 caracteres de `description`, recortados. Descartar si queda vacío |
| `description` | `description`    | Copiar literalmente                                                            |
| `date`        | `created_at`     | Parsear `YYYY-MM-DD` como medianoche UTC. `updated_at` igual al insertar       |
| —             | `origin`         | Siempre `"customer"` en todos los registros del seed                           |
| —             | `branch`         | Siempre `"central"` (el CSV no tiene campo de oficina)                         |

### Mapeo de estados

| CSV `status` | Modelo `status` |
| ------------ | --------------- |
| `OPEN`       | `open`          |
| `CLOSED`     | `resolved`      |
| `DISCARDED`  | `discarded`     |

### Mapeo de categorías (Nexova)

| CSV `category` | Modelo `category`   |
| -------------- | ------------------- |
| `TECHNICAL`    | `technical_failure` |
| `BILLING`      | `process_error`     |
| `ACCESS`       | `technical_failure` |
| `HR_QUERY`     | `process_error`     |
| `COMPLAINT`    | `client_complaint`  |

Los registros que fallen la validación o no se puedan mapear se descartan y se reportan en consola.

---

## Valores esperados tras el seed

Tras cargar el CSV, `/api/incidents/summary` debe devolver totales por `status` y `category` del **modelo** que coincidan con los siguientes conteos transformados. Corresponden a los **96 registros válidos** de `incidents-nexova.csv` del proyecto analizador (excluidas filas inválidas).

**Por `status` del modelo:**

| Modelo `status` | Conteo |
| --------------- | ------ |
| `open`          | 27     |
| `resolved`      | 56     |
| `discarded`     | 13     |

**Por `category` del modelo:**

| Modelo `category`   | Conteo |
| ------------------- | ------ |
| `technical_failure` | 49     |
| `process_error`     | 35     |
| `client_complaint`  | 12     |

Contrasta con la salida del script analizador: el CSV crudo usa `OPEN`/`CLOSED`/`DISCARDED` y códigos como `TECHNICAL`/`BILLING`. Los totales anteriores son los valores **post-transformación** que debe producir tu gestor.

---

## Notas de implementación

- Nexova opera en dos idiomas: los empleados de Valencia trabajan en español y los de Miami en inglés. Si has implementado soporte bilingüe en hitos anteriores, el formulario y los mensajes de error deben respetarlo.
- Las incidencias de tipo `sla_breach` son críticas para Roberto y para Laura: aunque la alerta automática no es parte de este proyecto, diseña el modelo pensando en que ese filtro debe ser trivial de añadir.
- El campo `remote` en `branch` es frecuente en Nexova: muchos empleados trabajan sin sede fija. Asegúrate de que aparece visible en el desplegable y que no genera ambigüedad con `central` (sede) ni con `valencia_operations` (oficina operativa).
