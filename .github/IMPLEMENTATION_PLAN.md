# Plan de Implementación: Analizador de Incidencias (Nexova Solutions)

De acuerdo con el documento `STRATEGY.md` y siguiendo el protocolo de Nivel 2 (`PACK_PLANNER`) de la skill `code-refinement-suite`, he estructurado el siguiente plan de implementación para abordar el procesamiento de incidencias de clientes de forma segura e integrada.

## > [!WARNING] User Review Required
Este plan propone la arquitectura y los pasos para implementar el script, el backend y el frontend. Por favor, revisa la sección de **Preguntas Abiertas** y aprueba el plan antes de que comencemos la fase de código (`PACK_CODER`).

## 📖 Definición del Modelo de Datos (CSV) y Valores Esperados
Basado en el `CONTEXT-company.md` para el departamento de Soporte al Cliente de Nexova (que atiende empresas tech, retail y finanzas por teléfono, email y chat), el script esperará la siguiente estructura en `incidents-COMPANY.csv`:

### Campos Obligatorios y Reglas de Validación
1. **`id_incidencia`**: Identificador único (Obligatorio).
2. **`email_cliente`**: Correo de contacto (Obligatorio).
3. **`canal_entrada`**: `telefono`, `email`, `chat_web`.
4. **`sector_cliente`**: `tech`, `retail`, `finanzas`.
5. **`categoria`**: Solo se permiten los valores: `fallo_operativo`, `queja`, `solicitud`.
6. **`estado`**: Solo se permiten los valores: `abierto`, `cerrado`, `descartado`.
7. **`puntuacion_satisfaccion`**: Número del 1 al 100. Obligatorio evaluar para calcular el índice medio, solo si está presente.

Un registro se considerará **inválido** y será excluido si:
- Le falta alguno de los campos obligatorios mencionados.
- Contiene un valor en `categoria` o `estado` distinto a los listados.

### Valores Esperados (Métricas a producir)
1. **Cantidad total de elementos procesados:** Se mostrará un conteo de válidos (ej. 85) e inválidos (ej. 15), desglosando los motivos de los inválidos.
2. **Totalización por categoría:** Agrupación de registros válidos por `fallo_operativo`, `queja` y `solicitud`.
3. **Totalización por estado:** Agrupación de registros válidos por `abierto`, `cerrado` y `descartado`.
4. **Índice de satisfacción medio:** Promedio matemático del campo `puntuacion_satisfaccion` para todos los registros válidos cuyo `estado` sea `cerrado` y tengan una puntuación registrada.

---

## 🏗️ Estructura de la Solución (Abstracción)

Para asegurar la **reutilización de código** (requisito transversal), extraeremos la lógica core de validación a un módulo de Python que será importado tanto por el script CLI como por la API de FastAPI.

### 1. Core Logic (Compartido)
- Módulo `services/api/core/analyzer.py` (o similar) que contiene la lógica pura:
  - Carga de CSV y validación de columnas obligatorias.
  - Filtrado de registros inválidos (faltan datos, categoría/estado inválido).
  - Cálculo de métricas: totales procesados, totales por categoría, totales por estado, índice de satisfacción medio (estado: cerrado).
  - Generación del archivo CSV de resultados.

### 2. Fase 1: Script de Análisis CLI (`scripts/analyze.py`)
- Script en Python que actuará como un *wrapper* de línea de comandos para la lógica core.
- Tomará la ruta del archivo por argumento usando `argparse` o `sys.argv`.
- Imprimirá el resumen en consola con formato enriquecido (separadores, colores, tablas).
- Preguntará al usuario interactivamente (`input()`) si desea exportar a CSV y, de ser así, generará `results.csv`.

### 3. Fase 2: Backend API (`services/api/`)
- Aplicación **FastAPI**.
- `POST /api/incidents/analyze`: Endpoint que recibe un `UploadFile` (multipart/form-data), guarda el archivo temporalmente en memoria, llama a la lógica core y retorna un JSON con las métricas detalladas y la cantidad de errores.
- `GET /api/incidents/results/export`: Endpoint que permite descargar el último análisis procesado en formato CSV (o genera uno al vuelo con los datos procesados).

### 4. Fase 3: Frontend Panel de Control (`uis/backoffice/`)
- Nueva vista en el panel administrativo existente de Nexova.
- Componente de subida de archivos (Drag & Drop) conectado a `/api/incidents/analyze`.
- Dashboard de métricas que muestre tarjetas de resumen (Total, Válidos, Inválidos, Satisfacción Media) y desgloses por categoría y estado.
- Botón "Exportar a CSV" que llame a `/api/incidents/results/export` y descargue el archivo.

---

## 📋 Proposed Changes (Paso a Paso)

### Fase 1 (Script y Core)
- [x] **[NEW] `shared/analyzer.py` (o `scripts/analyzer_core.py`)**
  - Contendrá las funciones `validate_records()`, `calculate_metrics()`, y `export_results()`.

- [x] **[NEW] `scripts/analyze.py`**
  - Punto de entrada CLI. Parsea el argumento del archivo, invoca al core e imprime los resultados en terminal.

### Fase 2 (Backend FastAPI)
- [x] **[NEW] `services/api/main.py`**
  - Servidor FastAPI con configuración de CORS para el frontend.
  - Endpoint `POST /api/incidents/analyze` (integrando `analyzer_core.py`).
  - Endpoint `GET /api/incidents/results/export`.

### Fase 3 (Frontend Next.js/React)
- [x] **[MODIFY] `uis/talent-pipeline-tracker/app/page.tsx`** (o donde resida el backoffice)
  - Añadir el enlace al panel de análisis de incidencias.

- [x] **[NEW] `uis/talent-pipeline-tracker/app/incidents/page.tsx`**
  - Vista principal del panel de control de incidencias.

- [x] **[NEW] `uis/talent-pipeline-tracker/components/incidents/Uploader.tsx`**
  - Componente para la carga del CSV.

- [x] **[NEW] `uis/talent-pipeline-tracker/components/incidents/Dashboard.tsx`**
  - Componente para renderizar los resultados JSON de la API.

---

## 🧪 Verification Plan (`PACK_CODER` & `PACK_AUDITOR`)

1. **Pruebas de Validación del Script:**
   - Ejecutar `python scripts/analyze.py incidents-COMPANY.csv`.
   - Verificar que contabiliza correctamente los errores.
   - Verificar que las 5 métricas coinciden con los valores esperados (una vez confirmados en las preguntas abiertas).
   - Probar la exportación interactiva a `results.csv`.
2. **Pruebas de la API:**
   - Enviar un CSV vacío y verificar que devuelve error `400 Bad Request`.
   - Enviar un CSV válido y comprobar la estructura del JSON devuelto.
3. **Pruebas del Frontend:**
   - Comprobar que el archivo se sube sin usar terminal y que el botón de exportación funciona correctamente.
   - Verificar responsividad y usabilidad de los errores mostrados (ej. "3 registros descartados por categoría inválida").
4. **Validación Transversal:**
   - Confirmar que no hay duplicación de la lógica de procesamiento de CSV entre `scripts/` y `services/api/`.
