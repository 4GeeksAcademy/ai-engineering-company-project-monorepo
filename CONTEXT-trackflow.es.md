# CONTEXT — Gestor de Incidencias Centralizado · TrackFlow

## Tu empresa

**TrackFlow** es una empresa de gestión de almacenes y última milla con **130 empleados**, operando en dos mercados: **Los Ángeles (EE.UU.)** y **Zaragoza (España)**. Sus servicios son gestión de almacén para marcas de e-commerce, entrega de última milla y logística inversa (devoluciones).

Como parte del equipo de **TrackFlow Tech**, llevas hitos construyendo la plataforma interna. Este proyecto integra en esa plataforma un gestor centralizado de incidencias. En TrackFlow, las incidencias son el pan de cada día: paquetes perdidos, fallos de carrier, discrepancias de inventario, devoluciones mal gestionadas. Hasta ahora todo llegaba por email o WhatsApp sin ningún registro estructurado.

---

## Quién lo usa y por qué

**Andrés Kim (CTO)** no tiene visibilidad de los fallos operativos hasta que alguien le escribe por WhatsApp. Con este gestor, cada incidencia queda registrada, categorizada y trazable.

**Thomas Harry (CEO)** quiere saber en tiempo real cuántas incidencias críticas hay abiertas en Los Ángeles vs. Zaragoza, y si alguna lleva más de 24 horas sin resolverse.

**Carlos Vega (Head of Carrier Operations)** y **Ana Whitfield (Head of Warehouse Operations)** son los principales usuarios del formulario: ellos y sus equipos reportarán incidencias operativas desde almacén o desde coordinación de carriers.

**Valentina Cruz (CX Manager)** registrará las quejas de clientes finales y empresas que lleguen por canales externos.

---

## Almacenes y oficinas de TrackFlow

El campo `branch` debe contener exactamente uno de estos valores:

| Valor en base de datos | Nombre para mostrar   |
| ---------------------- | --------------------- |
| `central`              | Central               |
| `la_warehouse`         | Los Ángeles — Almacén |
| `la_office`            | Los Ángeles — Oficina |
| `zaragoza_warehouse`   | Zaragoza — Almacén    |
| `zaragoza_office`      | Zaragoza — Oficina    |

Cuando el origen sea `internal` o `customer` y no corresponda a una instalación específica, se usará `central`.

---

## Categorías de incidencias

El campo `category` debe contener exactamente uno de estos valores:

| Valor                   | Descripción                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `lost_parcel`           | Paquete extraviado en tránsito o en almacén                                            |
| `delivery_failure`      | Fallo de entrega: intento fallido, dirección incorrecta, cliente ausente no gestionado |
| `inventory_discrepancy` | Diferencia entre stock registrado y stock físico                                       |
| `carrier_issue`         | Problema imputable a un carrier: retraso, daño, incumplimiento de SLA                  |
| `returns_issue`         | Problema en el proceso de devolución o logística inversa                               |
| `warehouse_incident`    | Incidente en almacén: daño de mercancía, accidente, fallo de equipamiento              |
| `system_failure`        | Fallo en sistema tecnológico: WMS, integraciones, API de carrier                       |
| `client_complaint`      | Queja de una empresa cliente sobre el servicio prestado por TrackFlow                  |
| `other`                 | Cualquier incidencia que no encaje en las categorías anteriores                        |

---

## Estados y ciclo de vida

| Valor         | Significado en TrackFlow                                          |
| ------------- | ----------------------------------------------------------------- |
| `open`        | Incidencia registrada, pendiente de asignar al equipo responsable |
| `in_progress` | Coordinador o responsable de área está gestionándola activamente  |
| `resolved`    | Resuelta: paquete entregado, stock corregido, cliente informado   |
| `discarded`   | Registrada por error, duplicada o no accionable                   |

Transiciones válidas: `open → in_progress`, `open → discarded`, `in_progress → resolved`, `in_progress → discarded`. Los estados `resolved` y `discarded` son finales.

---

## Orígenes

| Valor      | Cuándo usarlo en TrackFlow                                           |
| ---------- | -------------------------------------------------------------------- |
| `customer` | Reportada por una empresa cliente o un consumidor final              |
| `branch`   | Detectada y reportada por personal de almacén u oficina de TrackFlow |
| `internal` | Detectada internamente por tecnología, dirección u operaciones       |

---

## Datos históricos — seed desde CSV

El fichero CSV del proyecto **incidents-file-analyzer** (`incidents-trackflow.csv` en `content/contexts/incidents-file-analysis/`) contiene incidencias exportadas del sistema de atención al cliente de TrackFlow. Todas corresponden a incidencias comunicadas por clientes o consumidores finales (`origin: "customer"`).

El esquema del CSV del analizador usa nombres de campo, estados y categorías distintos a los de este gestor. **No insertes filas del CSV directamente.** Reutiliza la lógica de validación compartida del analizador y aplica las transformaciones siguientes antes del insert.

**Campo identificador para idempotencia:** usa `incident_id` del CSV. Si no existe, usa la combinación `title + created_at`.

### Mapeo directo de campos

| Campo CSV     | Campo del modelo | Transformación                                                                 |
| ------------- | ---------------- | ------------------------------------------------------------------------------ |
| `incident_id` | —                | Solo control de duplicados — no se almacena                                    |
| `description` | `title`          | Primeros 120 caracteres de `description`, recortados. Descartar si queda vacío |
| `description` | `description`    | Copiar literalmente                                                            |
| `date`        | `created_at`     | Parsear `YYYY-MM-DD` como medianoche UTC. `updated_at` igual al insertar       |
| —             | `origin`         | Siempre `"customer"` en todos los registros del seed                           |

### Mapeo de estados

| CSV `status` | Modelo `status` |
| ------------ | --------------- |
| `OPEN`       | `open`          |
| `CLOSED`     | `resolved`      |
| `DISCARDED`  | `discarded`     |

### Mapeo de categorías (TrackFlow)

| CSV `category`     | Modelo `category`  |
| ------------------ | ------------------ |
| `LOST_PARCEL`      | `lost_parcel`      |
| `DELAYED_DELIVERY` | `carrier_issue`    |
| `WRONG_ADDRESS`    | `delivery_failure` |
| `RETURN_REQUEST`   | `returns_issue`    |
| `DAMAGE`           | `carrier_issue`    |

### Mapeo de sede (TrackFlow)

Mapea `country` del CSV a `branch` del modelo:

| CSV `country` | Modelo `branch`   |
| ------------- | ----------------- |
| `US`          | `la_office`       |
| `ES`          | `zaragoza_office` |

Los registros que fallen la validación o no se puedan mapear se descartan y se reportan en consola.

---

## Valores esperados tras el seed

Tras cargar el CSV, `/api/incidents/summary` debe devolver totales por `status` y `category` del **modelo** que coincidan con los siguientes conteos transformados. Corresponden a los **95 registros válidos** de `incidents-trackflow.csv` del proyecto analizador (excluidas filas inválidas).

**Por `status` del modelo:**

| Modelo `status` | Conteo |
| --------------- | ------ |
| `open`          | 29     |
| `resolved`      | 52     |
| `discarded`     | 14     |

**Por `category` del modelo:**

| Modelo `category`  | Conteo |
| ------------------ | ------ |
| `lost_parcel`      | 14     |
| `carrier_issue`    | 45     |
| `delivery_failure` | 19     |
| `returns_issue`    | 17     |

Contrasta con la salida del script analizador: el CSV crudo usa `OPEN`/`CLOSED`/`DISCARDED` y códigos como `LOST_PARCEL`/`DELAYED_DELIVERY`. Los totales anteriores son los valores **post-transformación** que debe producir tu gestor.

---

## Notas de implementación

- TrackFlow opera en dos idiomas: inglés en Los Ángeles y español en Zaragoza. Si has implementado soporte bilingüe en hitos anteriores, el formulario y los mensajes de error deben respetarlo. Las etiquetas del desplegable de sedes deben mostrarse en el idioma del usuario.
- Las incidencias de tipo `lost_parcel` y `carrier_issue` tienen impacto directo en el SLA con clientes: Thomas y Carlos necesitarán filtrarlas con facilidad. El modelo de datos debe facilitar ese filtro aunque la alerta automática no sea parte de este proyecto.
- El formulario lo usarán operarios de almacén desde terminales en el suelo del almacén: diseña los campos con tamaño suficiente para uso táctil y evita campos de texto libre innecesarios.
