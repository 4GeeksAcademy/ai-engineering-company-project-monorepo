# CONTEXT — Utilidad de Análisis de Datos: Procesador de Reportes de Incidentes

## Empresa: TrackFlow

---

## Tu empresa

**TrackFlow** es una empresa de logística de última milla y gestión de almacenes que opera en Los Ángeles (EE. UU.) y Zaragoza (España). Sus clientes son marcas de e-commerce que externalizan toda su operación logística.

Formas parte de la unidad interna **TrackFlow Tech**, bajo la dirección de **Thomas Harry (CEO)** y **el tech lead interno**. Tu contacto para este proyecto es **Valentina Cruz (CX Manager)**.

El equipo de Valentina (15 agentes) gestiona incidentes de dos tipos de clientes: **marcas (B2B)** que contratan servicios de TrackFlow y **consumidores finales (B2C)** que reciben los paquetes. Todos los incidentes se registran actualmente en un helpdesk legado. Se exportó un mes de datos en CSV para análisis y tu archivo de prueba tiene **1,000 filas**.

El volumen de incidencias es alto: el 80% de las consultas podría automatizarse, pero primero el equipo necesita entender qué está llegando. Este análisis es la base del agente de soporte de primera línea que se construirá en una fase posterior. Tu script debe dar a Valentina una visión clara del volumen, la calidad y la satisfacción antes de empezar ese trabajo.

---

## Estructura del CSV

**Nombre de archivo:** `incidents.csv`  
**Codificación:** UTF-8  
**Separador:** coma (`,`)  
**Fila de encabezado:** sí (fila 1)

| Campo                | Tipo    | Requerido | Valores permitidos / formato                        |
| -------------------- | ------- | --------- | --------------------------------------------------- |
| `incident_id`        | string  | ✅        | ID único, formato `TRF-XXXXXX` (ej.: `TRF-000001`)  |
| `date`               | string  | ✅        | `YYYY-MM-DD`                                        |
| `country`            | string  | ✅        | `US` o `ES`                                         |
| `customer_type`      | string  | ✅        | `B2B` o `B2C`                                       |
| `tracking_number`    | string  | ✅        | Número de tracking del carrier, mínimo 8 caracteres |
| `carrier`            | string  | ✅        | Ver carriers abajo                                  |
| `category`           | string  | ✅        | Ver categorías abajo                                |
| `description`        | string  | ✅        | Texto libre, mínimo 5 caracteres                    |
| `status`             | string  | ✅        | `OPEN`, `CLOSED`, `DISCARDED`                       |
| `customer_email`     | string  | ✅        | Email válido del cliente que reporta (**sensible**) |
| `satisfaction_score` | integer | ❌\*      | Entero 1–5. **Requerido si** `status = CLOSED`      |

\*`satisfaction_score` es opcional en la estructura, pero un registro `CLOSED` sin este valor se considera **incompleto**.

> ⚠️ El campo `customer_email` contiene correos reales y por eso este archivo no puede compartirse con herramientas de IA externas. Tu script nunca debe imprimir, registrar ni exportar correos individuales en ninguna salida.

### Carriers válidos

| País | Carriers                            |
| ---- | ----------------------------------- |
| `US` | `UPS`, `FEDEX`, `DHL_US`            |
| `ES` | `MRW`, `SEUR`, `DHL_ES`, `LOCAL_ES` |

Un registro es **inválido** si el carrier no pertenece a la lista válida para su país declarado.

### Categorías válidas

| Código             | Descripción                            |
| ------------------ | -------------------------------------- |
| `LOST_PARCEL`      | Paquete reportado como perdido         |
| `DELAYED_DELIVERY` | Entrega fuera de la fecha esperada     |
| `WRONG_ADDRESS`    | Paquete enviado a dirección incorrecta |
| `RETURN_REQUEST`   | Cliente solicita devolución            |
| `DAMAGE`           | Producto recibido con daños            |

---

## Reglas de registros inválidos

Un registro debe marcarse como **inválido** si ocurre cualquiera de estos casos:

| Regla                                        | Descripción                                                    |
| -------------------------------------------- | -------------------------------------------------------------- |
| `country` faltante o inválido                | Vacío o distinto de `US` / `ES`                                |
| `carrier` faltante o inválido                | Vacío, desconocido o carrier que no opera en el país declarado |
| Falta `tracking_number`                      | Vacío o con menos de 8 caracteres                              |
| `category` faltante o inválida               | Vacía o fuera de las 5 categorías válidas                      |
| `description` vacía                          | Vacía o con menos de 5 caracteres                              |
| `customer_email` faltante o inválido         | Vacío o sin `@`                                                |
| `status = CLOSED` y sin `satisfaction_score` | Incidente cerrado sin puntaje                                  |
| `satisfaction_score` fuera de rango          | Hay valor, pero no está entre 1 y 5 (inclusive)                |

Tu script debe reportar cuántos registros caen en cada tipo de regla.

---

## Distribución de datos (archivo de prueba provisto)

El archivo `incidents-trackflow.csv` se envió como adjunto (ver ficheros `incidents-trackflow.csv`). Los siguientes valores describen su contenido y son los que tu script debe producir exactamente.

**Total de filas:** 100

**Registros válidos: 95**
| Categoría | Cantidad |
|---|---|
| `LOST_PARCEL` | 14 |
| `DELAYED_DELIVERY` | 38 |
| `WRONG_ADDRESS` | 19 |
| `RETURN_REQUEST` | 17 |
| `DAMAGE` | 7 |

| Estado      | Cantidad |
| ----------- | -------- |
| `OPEN`      | 29       |
| `CLOSED`    | 52       |
| `DISCARDED` | 14       |

**Métrica recomendada (no obligatoria para aprobar):**

| País | Cantidad |
| ---- | -------- |
| `US` | 50       |
| `ES` | 45       |

**Registros inválidos: 5**
| Regla activada | Cantidad |
|---|---|
| `tracking_number` faltante o inválido | 1 |
| Carrier inválido para el país declarado | 1 |
| `category` faltante o inválida | 1 |
| `customer_email` faltante o inválido | 1 |
| `status = CLOSED` sin `satisfaction_score` | 1 |

**Puntajes de satisfacción (52 registros cerrados)**
| Puntaje | Cantidad |
|---|---|
| 1 | 6 |
| 2 | 11 |
| 3 | 15 |
| 4 | 14 |
| 5 | 6 |
Promedio: **3.06**

---

## Salida esperada

Cuando el estudiante ejecute `python analyze.py incidents-trackflow.csv` con el archivo provisto, la salida en consola debe mostrar los valores siguientes en todas las secciones **obligatorias** (totales, desglose de inválidos, categoría, estado y satisfacción). El bloque `BREAKDOWN BY COUNTRY` es **recomendado** para TrackFlow — contexto útil para stakeholders, pero no obligatorio para aprobar.

```
============================================================
  TRACKFLOW — INCIDENT REPORT ANALYSIS
  Source file: incidents-trackflow.csv
============================================================

TOTAL RECORDS IN FILE .......... 100
  ├─ Valid records ................ 95
  └─ Invalid / incomplete .......... 5

INVALID RECORDS BREAKDOWN
  ├─ Invalid tracking number ....... 1
  ├─ Carrier/country mismatch ...... 1
  ├─ Invalid or missing category ... 1
  ├─ Invalid or missing email ...... 1
  └─ Closed incident, no score ..... 1

BREAKDOWN BY CATEGORY (valid records)
  ├─ LOST_PARCEL .................. 14  (14.7%)
  ├─ DELAYED_DELIVERY ............. 38  (40.0%)
  ├─ WRONG_ADDRESS ................ 19  (20.0%)
  ├─ RETURN_REQUEST ............... 17  (17.9%)
  └─ DAMAGE ........................ 7   (7.4%)

BREAKDOWN BY STATUS (valid records)
  ├─ OPEN ......................... 29  (30.5%)
  ├─ CLOSED ....................... 52  (54.7%)
  └─ DISCARDED .................... 14  (14.7%)

BREAKDOWN BY COUNTRY (valid records) — recomendado, no obligatorio
  ├─ US ........................... 50  (52.6%)
  └─ ES ........................... 45  (47.4%)

SATISFACTION INDEX (closed incidents)
  Scored incidents: 52 of 52
  Average score: 3.06 / 5.00
  ├─ Score 1 (Very dissatisfied) ... 6
  ├─ Score 2 (Dissatisfied) ....... 11
  ├─ Score 3 (Neutral) ............ 15
  ├─ Score 4 (Satisfied) .......... 14
  └─ Score 5 (Very satisfied) ...... 6

============================================================
Export results to CSV? [y / n]:
```

> **Nota:** Se aceptan diferencias menores de formato (espaciado, caracteres de caja), pero todos los valores numéricos de las secciones **obligatorias** deben coincidir exactamente. El desglose por país es una extensión **recomendada** de TrackFlow — inclúyelo si quieres salida lista para stakeholders, pero no se evalúa contra la rúbrica del README del proyecto.

---

## Nota de stakeholders

> **De Valentina Cruz (CX Manager):**
> _"Los puntajes de satisfacción en logística suelen ser más bajos que el promedio, eso es normal en nuestro sector. Lo que necesito entender es si el problema es más grave en EE. UU. o en España, y si está concentrado en categorías como_ `DELAYED_DELIVERY` _o_ `LOST_PARCEL`_. Un desglose por país en consola me ayudaría — inclúyelo si puedes. La exportación CSV debe tener una fila por métrica; la usaré en el reporte para clientes. Y como siempre: ningún correo de cliente en la salida, nunca."_

---

## Ruta en el repositorio

```
incidents-analysis/CONTEXT-trackflow.md
```

---

_Documento interno — 4Geeks Academy · AI Engineering Track_  
_Para uso exclusivo en la generación de proyectos del programa_
