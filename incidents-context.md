# CONTEXT — Utilidad de Análisis de Datos: Procesador de Reportes de Incidentes

## Empresa: Brasaland

---

## Tu empresa

**Brasaland** es una cadena de restaurantes de comida a la parrilla con 14 sedes entre Colombia y Florida (EE. UU.). Formas parte del equipo interno **Brasaland Digital**, trabajando bajo la dirección de **Nicolás Park (CTO)** y en coordinación cercana con **Felipe Guerrero (Director de Operaciones)**.

El departamento de Operaciones registra cada incidente operativo que ocurre en la cadena: fallas de equipos, problemas de abastecimiento, quejas de clientes, incidentes de calidad de alimentos y situaciones relacionadas con personal. Hasta ahora, cada gerente de sede registraba incidentes en una hoja de cálculo compartida. Esa hoja se exportó a CSV y tu archivo de prueba tiene **1,000 filas** que representan un mes de historial en las 14 sedes.

El objetivo de tu script es validar y resumir estos datos antes de que se usen como base del dashboard operativo en tiempo real que reemplazará por completo la hoja de cálculo.

---

## Estructura del CSV

**Nombre de archivo:** `incidents.csv`  
**Codificación:** UTF-8  
**Separador:** coma (`,`)  
**Fila de encabezado:** sí (fila 1)

| Campo                | Tipo    | Requerido | Valores permitidos / formato                       |
| -------------------- | ------- | --------- | -------------------------------------------------- |
| `incident_id`        | string  | ✅        | ID único, formato `BRS-XXXXXX` (ej.: `BRS-000001`) |
| `date`               | string  | ✅        | `YYYY-MM-DD`                                       |
| `location_id`        | string  | ✅        | Uno de: `COL-01` a `COL-10`, `FLA-01` a `FLA-04`   |
| `category`           | string  | ✅        | Ver categorías abajo                               |
| `description`        | string  | ✅        | Texto libre, mínimo 5 caracteres                   |
| `status`             | string  | ✅        | `OPEN`, `CLOSED`, `DISCARDED`                      |
| `customer_id`        | string  | ❌        | Opcional. Formato `CLI-XXXXXX`. Puede estar vacío  |
| `satisfaction_score` | integer | ❌\*      | Entero 1–5. **Requerido si** `status = CLOSED`     |
| `reporter_id`        | string  | ✅        | ID de encargado, formato `MGR-XX`                  |

\*`satisfaction_score` es opcional en la estructura, pero un registro `CLOSED` sin este valor se considera **incompleto**.

### Categorías válidas

| Código               | Descripción                                          |
| -------------------- | ---------------------------------------------------- |
| `CUSTOMER_COMPLAINT` | Queja de cliente (servicio, tiempo de espera, trato) |
| `EQUIPMENT`          | Falla o avería de equipamiento                       |
| `SUPPLY`             | Problema de abastecimiento o falta de stock          |
| `FOOD_QUALITY`       | Incidente de calidad de alimentos                    |
| `STAFF`              | Incidente relacionado con personal                   |

---

## Reglas de registros inválidos

Un registro debe marcarse como **inválido** si ocurre cualquiera de estos casos:

| Regla                                        | Descripción                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Falta `location_id`                          | El campo está vacío o no corresponde a uno de los 14 códigos válidos |
| `category` faltante o inválida               | El campo está vacío o no pertenece a las 5 categorías válidas        |
| `description` vacía                          | El campo está vacío o tiene menos de 5 caracteres                    |
| Falta `reporter_id`                          | El campo está vacío                                                  |
| `status = CLOSED` y sin `satisfaction_score` | Caso cerrado sin puntaje registrado                                  |
| `satisfaction_score` fuera de rango          | Hay valor, pero no está entre 1 y 5 (inclusive)                      |

Tu script debe reportar cuántos registros caen en cada tipo de regla.

---

## Distribución de datos (archivo de prueba provisto)

El archivo `incidents-brasaland.csv` se envió como adjunto (ver ficheros `incidents-brasaland.csv`). Los siguientes valores describen su contenido y son los que tu script debe producir exactamente.

**Total de filas:** 100

**Registros válidos: 96**
| Categoría | Cantidad |
|---|---|
| `CUSTOMER_COMPLAINT` | 29 |
| `EQUIPMENT` | 17 |
| `SUPPLY` | 22 |
| `FOOD_QUALITY` | 19 |
| `STAFF` | 9 |

| Estado      | Cantidad |
| ----------- | -------- |
| `OPEN`      | 32       |
| `CLOSED`    | 50       |
| `DISCARDED` | 14       |

**Registros inválidos: 4**
| Regla activada | Cantidad |
|---|---|
| Falta `location_id` | 1 |
| `category` faltante o inválida | 1 |
| `description` vacía o demasiado corta | 1 |
| `status = CLOSED` sin `satisfaction_score` | 1 |

**Puntajes de satisfacción (50 registros cerrados)**
| Puntaje | Cantidad |
|---|---|
| 1 | 4 |
| 2 | 6 |
| 3 | 12 |
| 4 | 19 |
| 5 | 9 |
Promedio: **3.46**

---

## Salida esperada

Cuando el estudiante ejecute `python analyze.py incidents-brasaland.csv` con el archivo provisto, la salida en consola debe mostrar los siguientes valores:

```
============================================================
  BRASALAND — INCIDENT REPORT ANALYSIS
  Source file: incidents-brasaland.csv
============================================================

TOTAL RECORDS IN FILE .......... 100
  ├─ Valid records ................ 96
  └─ Invalid / incomplete .......... 4

INVALID RECORDS BREAKDOWN
  ├─ Missing location_id ........... 1
  ├─ Invalid or missing category ... 1
  ├─ Empty description ............. 1
  └─ Closed case, no score ......... 1

BREAKDOWN BY CATEGORY (valid records)
  ├─ CUSTOMER_COMPLAINT ........... 29  (30.2%)
  ├─ EQUIPMENT .................... 17  (17.7%)
  ├─ SUPPLY ....................... 22  (22.9%)
  ├─ FOOD_QUALITY ................. 19  (19.8%)
  └─ STAFF ......................... 9   (9.4%)

BREAKDOWN BY STATUS (valid records)
  ├─ OPEN ......................... 32  (33.3%)
  ├─ CLOSED ....................... 50  (52.1%)
  └─ DISCARDED .................... 14  (14.6%)

SATISFACTION INDEX (closed cases)
  Scored cases: 50 of 50
  Average score: 3.46 / 5.00
  ├─ Score 1 (Very dissatisfied) ... 4
  ├─ Score 2 (Dissatisfied) ........ 6
  ├─ Score 3 (Neutral) ............ 12
  ├─ Score 4 (Satisfied) .......... 19
  └─ Score 5 (Very satisfied) ...... 9

============================================================
Export results to CSV? [y / n]:
```

> **Nota:** Se aceptan diferencias menores de formato (espaciado, caracteres de caja), pero todos los valores numéricos deben coincidir exactamente.

---

## Nota de stakeholders

> **De Nicolás Park (CTO):**
> _"El equipo de Felipe va a usar esto todos los días. Mantengan la salida de consola limpia y rápida; la ejecutan desde terminal antes de la reunión de la mañana. La exportación CSV es para Ashley: necesita pegar los resultados en una hoja de cálculo. Asegúrense de que la estructura tenga sentido: una fila por métrica, con columnas_ `metric`, `value` _y opcionalmente_ `percentage`_."_

---

## Ruta en el repositorio

```
incidents-analysis/CONTEXT-brasaland.md
```

---

_Documento interno — 4Geeks Academy · AI Engineering Track_  
_Para uso exclusivo en la generación de proyectos del programa_
