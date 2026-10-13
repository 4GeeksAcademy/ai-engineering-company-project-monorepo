# Telemetría de tu compañía – Reporte técnico

> **Antes de empezar:** necesitas la tabla `telemetry_events` en Supabase con al menos 20 filas de eventos reales generados desde el backoffice, incluyendo al menos un evento técnico (error, login fallido, etc.) además de los de negocio. Sin datos reales no hay nada que analizar.  
> Este proyecto produce un reporte técnico, no un reporte de negocio. Las métricas orientadas a decisiones de negocio (ventas, conversión, ingresos) se construyen más adelante, en el Hito de Data Pipelines, con herramientas dedicadas a ese análisis.

---

## 🎯 Tu reto

📌 Estás construyendo sobre tu copia del [monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo) de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Los datos ya están ahí. La tabla `telemetry_events` tiene eventos reales con `timestamp`, `event_type` y `tags`. Pero el dato crudo no es la respuesta — es la materia prima. Hoy la transformas, pero no en un reporte de negocio: en un reporte técnico. Un radar operacional para el propio equipo de ingeniería — qué tan sano está el sistema, qué tan rápido responde, dónde fallan las cosas, qué eventos ocurren con más frecuencia y por qué.

El entregable es un pipeline de análisis en Python y un endpoint que sirve el resultado: métricas operacionales calculadas a partir de los eventos almacenados, servidas como JSON, listas para ser consumidas por cualquier dashboard técnico o herramienta de monitoreo interno.

### Mensaje del Tech Lead:

> "Tenemos datos. Ahora necesito visibilidad técnica sobre el sistema.
>
> Escribe el pipeline de análisis. Para cada dimensión operacional relevante, una función de Python que cargue los eventos correspondientes, los transforme con Pandas, y devuelva un resultado serializable. Luego un endpoint `GET /telemetry/report` que los sirva juntos.
>
> Dos reglas no negociables: primero, no calcules nada dentro del endpoint en cada request — el pipeline va aparte y el endpoint lo llama, con cache. Segundo, convierte los timestamps a datetime antes de cualquier agrupación — si no lo haces, vas a obtener grupos incorrectos sin ningún error visible, y vas a perder horas encontrando el bug.
>
> Una aclaración importante: esto no es el reporte para el CEO. Nada de tasas de conversión ni ingresos — eso lo vamos a construir con los pipelines de datos más adelante. Hoy quiero saber qué tan sano está el sistema: volumen de eventos, tasa de errores, latencia, qué tipos de evento dominan. Métricas con dimensión temporal real, no un número global sin contexto."

---

## 📚 Conocimiento complementario — La fórmula de cualquier reporte

Los datos en `telemetry_events` responden "¿qué pasó?". Las preguntas operacionales son distintas: "¿cuántos eventos de error hubo por día esta semana?" o "¿qué tipo de evento es más frecuente?". Responderlas requiere transformación — siempre en el mismo orden:

$$\text{cargar (SQL)} \rightarrow \text{refinar (Pandas)} \rightarrow \text{convertir tipos} \rightarrow \text{agrupar} \rightarrow \text{agregar} \rightarrow \text{servir}$$

### Dónde va cada filtro

| Criterio | Capa | Cómo |
| :--- | :--- | :--- |
| **Rango de timestamp (`start_date` / `end_date`)** | SQL | `WHERE timestamp >= :start AND timestamp < :end` — límites de inicio inclusivo, fin exclusivo en UTC |
| **`event_type` (uno o varios)** | SQL | `WHERE event_type = '...'` o `WHERE event_type IN (...)` — las métricas de tasa/ratio necesitan cargar todos los tipos relevantes en una sola consulta |
| **Dimensiones dentro de `tags` (almacén, endpoint, etc.)** | Pandas | Extraer de `tags`, descartar filas donde la dimensión es nula, luego `groupby` — segmenta todos los valores, no prefiltres a un solo valor |
| **Flags derivados (`is_error`, tasas)** | Pandas | Construir columnas después de cargar, luego `.agg()` |
| **Predicados opcionales sobre `tags` (ej. `endpoint = X`)** | Pandas (por defecto) | Filtrar el DataFrame después de extraer el campo; el push-down `tags->>'...'` en SQL es optimización opcional, no obligatoria |

---

## Reglas del Pipeline y Transformación

1. **Cargar (SQL):** Trae solo las filas que la métrica necesita. Nunca cargues toda la tabla `telemetry_events` en memoria.
2. **Refinar (Pandas):** Después de cargar: extrae campos de `tags`, descarta filas con dimensiones nulas, aplica cualquier filtro adicional a nivel de fila que la métrica requiera. Esto no sustituye el filtrado de `event_type` / `timestamp` en SQL.
3. **Propiedad de la ventana de fechas:** El endpoint calcula el período por defecto (últimos 7 días cuando no se pasan parámetros) y lo pasa a cada función de métrica. Las funciones aplican esa ventana una vez en SQL; no vuelvas a aplicar un filtro "últimos 7 días" en Pandas.
4. **Convertir tipos:** Los timestamps llegan como strings. Hacer `groupby()` sobre strings que parecen fechas produce grupos incorrectos sin lanzar ningún error. Convierte siempre antes de agrupar:
   ```python
   df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
   df['date'] = df['timestamp'].dt.date
   ```
5. **Agrupar:** Con `groupby()` por la dimensión que responde la pregunta: por día, por `event_type`, por el valor de una propiedad dentro de `tags`.
6. **Agregar:** Con `.count()`, `.sum()`, o `.mean()`. La fórmula mental es siempre:
   $$\text{MÉTRICA} = \text{AGREGACIÓN}(\text{columna}) \text{ agrupada por } \text{DIMENSIÓN}$$
7. **Servir:** El resultado como una lista de dicts con `.reset_index().to_dict(orient='records')` — directamente serializable a JSON.

> [!WARNING]
> **Qué NO hacer:** Calcular el reporte dentro del endpoint en cada request. Si el dato no cambia cada segundo, el cálculo va en una función separada, llamada una vez, con el resultado en cache.

---

## 🌱 Cómo Empezar el Proyecto

1. Abre tu copia del monorepo y ubica `services/` (backend FastAPI).
2. Revisa `telemetry_events` en Supabase y confirma que tienes al menos 20 filas con variedad de `event_type` — si no, genera actividad en el backoffice primero (incluyendo al menos un evento técnico).
3. Revisa tu catálogo de eventos (`telemetry-plan.md`) — hoy trabajas con las dimensiones **técnicas/operacionales** de ese catálogo, no con las de negocio.
4. Sigue el orden: funciones de análisis $\rightarrow$ endpoint de reporte $\rightarrow$ cache.

---

## 💻 Qué Necesitas Hacer

### Fase 1 — Pipeline de análisis con Pandas

- [ ] Crea `services/telemetry/analysis.py` con al menos **3 funciones de métrica**, cada una encapsulando el cálculo de una dimensión operacional distinta a partir de tu propio catálogo de eventos. Ejemplos válidos (adapta a lo que realmente capturaste):
- [ ] Cada función debe ser **independiente y libre de efectos secundarios** — llamarla dos veces con los mismos parámetros debe producir el mismo resultado.
- [ ] No uses loops para calcular métricas — solo operaciones de Pandas (`.groupby()`, `.agg()`, `.count()`, `.sum()`, `.mean()`).

> [!CAUTION]
> **IMPORTANTE:** Las métricas que elijas deben responder preguntas **técnicas u operacionales** sobre el comportamiento del sistema — volumen, errores, latencia, disponibilidad — no preguntas de negocio (ventas, conversión, ingresos). Un reporte de negocio disfrazado de reporte técnico no será aceptado; ese análisis se aborda en el Hito de Data Pipelines.

---

### Fase 2 — Endpoint de reporte

- [ ] Crea el endpoint `GET /telemetry/report` en FastAPI. Debe:
  - Aceptar parámetros de query opcionales `start_date` y `end_date` en formato ISO 8601; si no se proveen, usar por defecto los últimos 7 días (`start_date = now - 7d`, `end_date = now`, ambos UTC)
  - Resolver el período una sola vez y pasar `start_date` / `end_date` a cada función de métrica — las funciones no aplican su propia ventana por defecto
  - Llamar a las funciones de métrica del pipeline de análisis con esos parámetros
  - Devolver un JSON con la estructura:
    ```json
    {
      "period": { "from": "...", "to": "..." },
      "metrics": {
        "events_per_day": [...],
        "error_rate_by_type": [...]
      }
    }
    ```
- [ ] El endpoint **no debe correr el pipeline en cada request** — implementa un cache simple en memoria con TTL de 60 segundos. Si se pide la misma combinación de `start_date` / `end_date` dentro del TTL, devuelve el resultado en cache sin recalcular.

---

## 🔵 Actividades Adicionales

### Actividad adicional — Métrica de autenticación

- [ ] Si instrumentaste el flujo de autenticación en el proyecto anterior, agrega una tercera función de métrica que calcule la tasa diaria de fallos de login: `user_login_failed` dividido entre el total de intentos (`user_login_failed` + `user_login_succeeded`) por día. Carga ambos tipos de evento con `event_type IN (...)` en SQL, y calcula la razón en Pandas. Inclúyela en el endpoint bajo la clave `auth_failure_rate`.

### Actividad adicional — Dashboard visual simple

- [ ] Construye una página mínima en `uis/backoffice/` (ej. `/telemetry`) que consuma `GET /telemetry/report` y lo muestre de forma visual — un gráfico o una tabla por métrica es suficiente (gráfico de barras o líneas para `events_per_day`, `error_rate_by_type`, etc.). Usa cualquier librería de gráficos que ya esté disponible en el frontend, o una tabla HTML simple si prefieres mantenerlo minimalista.
- [ ] La página debe mostrar el `period` (`from` / `to`) que se está visualizando, para que quede claro qué ventana de tiempo cubren los números.
- [ ] Este dashboard es una vista **técnica** para el equipo de ingeniería, no un dashboard de negocio — limítate a visualizar las mismas métricas operacionales de tu reporte, nada más.
- [ ] No necesitas pulirlo: el objetivo es una visualización funcional y legible de datos reales, no un ejercicio de diseño.

---

## ✅ Qué Vamos a Evaluar

- [ ] El archivo `services/telemetry/analysis.py` existe y contiene al menos tres funciones de métrica independientes
- [ ] Cada función sigue la fórmula `cargar (SQL)` $\rightarrow$ `refinar (Pandas)` $\rightarrow$ `convertir tipos` $\rightarrow$ `agrupar` $\rightarrow$ `agregar` en ese orden
- [ ] Los timestamps se convierten a `datetime` con `utc=True` antes de cualquier `groupby()` temporal
- [ ] No se usan loops para calcular métricas — solo operaciones de Pandas
- [ ] Cada función devuelve una lista de dicts serializable a JSON
- [ ] El endpoint `GET /telemetry/report` acepta `start_date` y `end_date` opcionales y usa 7 días por defecto
- [ ] El endpoint devuelve JSON con la estructura `{ "period": {...}, "metrics": {...} }`
- [ ] El endpoint tiene cache en memoria con TTL de 60 segundos — no recalcula en cada request
- [ ] Cada métrica responde una pregunta **técnica/operacional** sobre el comportamiento del sistema — no una pregunta de negocio
- [ ] Las métricas devueltas tienen una dimensión de agrupamiento — no son números globales sin contexto

---

## 📦 Cómo Entregar

1. Asegúrate de que los cambios estén en tu copia: `analysis.py` en `services/telemetry/` y el endpoint `GET /telemetry/report` en `services/`.
2. Crea un Pull Request contra la rama principal del monorepo con el título: `feat: telemetry report endpoint`.
3. En la descripción del PR, incluye:
   - El nombre de las métricas implementadas y qué pregunta operacional responde cada una
   - Una muestra del JSON devuelto por `GET /telemetry/report` con datos reales
   - Si implementaste la métrica de autenticación adicional y/o el dashboard visual simple



