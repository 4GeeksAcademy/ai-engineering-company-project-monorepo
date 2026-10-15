# CONTEXT — Utilidad de Análisis de Datos: Procesador de Reportes de Incidentes

## Empresa: Nexova

---

## Tu empresa

**Nexova** es una firma de consultoría y outsourcing de recursos humanos con sede en Valencia, España, y una oficina en Miami. Entre sus líneas de negocio, Nexova opera un **servicio de outsourcing de soporte al cliente**: 30 agentes gestionan incidentes para clientes de Nexova (tecnología, retail y finanzas) por teléfono, correo electrónico y chat web.

Formas parte del equipo de **Nexova AI Engineering**, bajo la dirección de **Sergio Molina (CTO)**. Tu contacto para este proyecto es **Roberto Díaz (Customer Support Lead)**.

El equipo de Roberto utiliza un helpdesk legado para registrar cada ticket de soporte recibido. Se exportó un mes de datos en CSV para su análisis y tu archivo de prueba tiene **1,000 filas**. El SLA promedio comprometido con clientes es de **24 horas**; actualmente el promedio está en 48 horas. Roberto necesita este análisis para entender el backlog de tickets y las brechas de satisfacción antes de la próxima revisión con clientes.

El objetivo de tu script es dar a Roberto y a los supervisores una visión clara y precisa de los datos de tickets, sin enviar información a herramientas de IA externas.

---

## Estructura del CSV

**Nombre de archivo:** `incidents.csv`  
**Codificación:** UTF-8  
**Separador:** coma (`,`)  
**Fila de encabezado:** sí (fila 1)

| Campo                | Tipo    | Requerido | Valores permitidos / formato                        |
| -------------------- | ------- | --------- | --------------------------------------------------- |
| `ticket_id`          | string  | ✅        | ID único, formato `NXV-XXXXXX` (ej.: `NXV-000001`)  |
| `date`               | string  | ✅        | `YYYY-MM-DD`                                        |
| `client_company`     | string  | ✅        | Nombre de la empresa cliente atendida (texto libre) |
| `category`           | string  | ✅        | Ver categorías abajo                                |
| `description`        | string  | ✅        | Texto libre, mínimo 5 caracteres                    |
| `agent_id`           | string  | ✅        | Formato `AGT-XX` (ej.: `AGT-07`)                    |
| `status`             | string  | ✅        | `OPEN`, `CLOSED`, `DISCARDED`                       |
| `customer_email`     | string  | ✅        | Email válido del cliente final (**sensible**)       |
| `satisfaction_score` | integer | ❌\*      | Entero 1–5. **Requerido si** `status = CLOSED`      |

\*`satisfaction_score` es opcional en la estructura, pero un registro `CLOSED` sin este valor se considera **incompleto**.

> ⚠️ El campo `customer_email` contiene correos reales y por eso este archivo no puede compartirse con herramientas de IA externas. Tu script nunca debe imprimir, registrar ni exportar direcciones de correo individuales en ninguna salida.

### Categorías válidas

| Código      | Descripción                                             |
| ----------- | ------------------------------------------------------- |
| `TECHNICAL` | Problema técnico con un producto o sistema              |
| `BILLING`   | Consulta o disputa de facturación                       |
| `ACCESS`    | Problema de acceso, login o permisos                    |
| `HR_QUERY`  | Consulta de RR. HH. o políticas de personal de clientes |
| `COMPLAINT` | Queja formal sobre la calidad del servicio              |

---

## Reglas de registros inválidos

Un registro debe marcarse como **inválido** si ocurre cualquiera de estos casos:

| Regla                                        | Descripción                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| Falta `client_company`                       | El campo está vacío                                          |
| `category` faltante o inválida               | El campo está vacío o no está entre las 5 categorías válidas |
| `description` vacía                          | El campo está vacío o tiene menos de 5 caracteres            |
| `agent_id` faltante o inválido               | El campo está vacío o no cumple el formato `AGT-XX`          |
| `customer_email` faltante o inválido         | El campo está vacío o no contiene `@`                        |
| `status = CLOSED` y sin `satisfaction_score` | Ticket cerrado sin puntaje registrado                        |
| `satisfaction_score` fuera de rango          | Hay valor, pero no está entre 1 y 5 (inclusive)              |

Tu script debe reportar cuántos registros caen en cada tipo de regla.

---

## Distribución de datos (archivo de prueba provisto)

El archivo `incidents-nexova.csv` se envió como adjunto (ver ficheros `incidents-nexova.csv`). Los siguientes valores describen su contenido y son los que tu script debe producir exactamente.

**Total de filas:** 100

**Registros válidos: 96**
| Categoría | Cantidad |
|---|---|
| `TECHNICAL` | 28 |
| `BILLING` | 18 |
| `ACCESS` | 21 |
| `HR_QUERY` | 17 |
| `COMPLAINT` | 12 |

| Estado      | Cantidad |
| ----------- | -------- |
| `OPEN`      | 27       |
| `CLOSED`    | 56       |
| `DISCARDED` | 13       |

**Registros inválidos: 4**
| Regla activada | Cantidad |
|---|---|
| Falta `client_company` | 1 |
| `category` faltante o inválida | 1 |
| `customer_email` faltante o inválido | 1 |
| `status = CLOSED` sin `satisfaction_score` | 1 |

**Puntajes de satisfacción (56 registros cerrados)**
| Puntaje | Cantidad |
|---|---|
| 1 | 2 |
| 2 | 5 |
| 3 | 10 |
| 4 | 22 |
| 5 | 17 |
Promedio: **3.84**

---

## Salida esperada

Cuando el estudiante ejecute `python analyze.py incidents-nexova.csv` con el archivo provisto, la salida en consola debe mostrar los siguientes valores:

```
============================================================
  NEXOVA — SUPPORT TICKET ANALYSIS
  Source file: incidents-nexova.csv
============================================================

TOTAL RECORDS IN FILE .......... 100
  ├─ Valid records ................ 96
  └─ Invalid / incomplete .......... 4

INVALID RECORDS BREAKDOWN
  ├─ Missing client_company ........ 1
  ├─ Invalid or missing category ... 1
  ├─ Invalid or missing email ...... 1
  └─ Closed ticket, no score ....... 1

BREAKDOWN BY CATEGORY (valid records)
  ├─ TECHNICAL .................... 28  (29.2%)
  ├─ BILLING ...................... 18  (18.8%)
  ├─ ACCESS ....................... 21  (21.9%)
  ├─ HR_QUERY ..................... 17  (17.7%)
  └─ COMPLAINT .................... 12  (12.5%)

BREAKDOWN BY STATUS (valid records)
  ├─ OPEN ......................... 27  (28.1%)
  ├─ CLOSED ....................... 56  (58.3%)
  └─ DISCARDED .................... 13  (13.5%)

SATISFACTION INDEX (closed tickets)
  Scored tickets: 56 of 56
  Average score: 3.84 / 5.00
  ├─ Score 1 (Very dissatisfied) ... 2
  ├─ Score 2 (Dissatisfied) ........ 5
  ├─ Score 3 (Neutral) ............ 10
  ├─ Score 4 (Satisfied) .......... 22
  └─ Score 5 (Very satisfied) ..... 17

============================================================
Export results to CSV? [y / n]:
```

> **Nota:** Se aceptan diferencias menores de formato (espaciado, caracteres de caja), pero todos los valores numéricos deben coincidir exactamente.

---

## Nota de stakeholders

> **De Roberto Díaz (Customer Support Lead):**
> _"Necesitamos esto antes de la revisión con el cliente del viernes. La exportación CSV debe tener una métrica por fila; la voy a pegar en la plantilla del informe. Lo más importante: no incluyan ningún email de cliente en ninguna salida, ni siquiera en errores. Si un registro tiene email inválido, márcalo como 'invalid email', pero nunca imprimas la dirección."_

---

## Ruta en el repositorio

```
incidents-analysis/CONTEXT-nexova.md
```

---

_Documento interno — 4Geeks Academy · AI Engineering Track_  
_Para uso exclusivo en la generación de proyectos del programa_
