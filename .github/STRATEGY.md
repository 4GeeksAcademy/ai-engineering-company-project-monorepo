# Colas de Mensajes y Tareas Asíncronas

## 🎯 Tu reto

> 📌 **Estás construyendo sobre tu copia del monorepo** de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Tu empresa tiene una API en producción y un pipeline de datos que ya funciona. Pero hay operaciones que aún bloquean el ciclo de request-response: procesar un lote de registros, generar un informe, enviar notificaciones masivas. Mientras esas operaciones corren, la API no responde a otros usuarios. Tu tech lead ha abierto el siguiente ticket:

---

### Ticket #DEV-55 — Cola de tareas asíncronas con Redis y Celery

Necesitamos desacoplar las operaciones pesadas de la API. Cuando un endpoint reciba una solicitud que implique trabajo de larga duración, debe encolar la tarea y devolver inmediatamente un `task_id` al cliente. Un worker independiente procesa la cola. El cliente puede consultar el estado de su tarea en cualquier momento.

#### Criterios de aceptación:
- **Redis corre como broker en Docker.** La API y los workers se conectan al mismo broker.
- **Al menos una operación existente en tu API —la que más tarde en responder— se convierte en tarea asíncrona mediante Celery.**
- **El endpoint que recibe la solicitud devuelve `202 Accepted` con un `task_id` inmediatamente**, sin esperar a que la tarea termine.
- **Existe un endpoint `GET /tasks/{task_id}` que devuelve el estado actual de la tarea (`pending`, `started`, `success`, `failure`) y el resultado cuando esté disponible.**
- **Si una tarea falla hasta tres veces, pasa a una Dead Letter Queue (DLQ).** El fallo queda registrado con `task_id`, número de intento y mensaje de error.
- **Los workers corren como procesos separados**, no dentro del proceso de FastAPI.
- **Flower está levantado y accesible** para monitorear la cola durante el desarrollo.

---

## 📖 Conocimiento complementario — El patrón Productor / Consumidor

El cambio conceptual clave de este proyecto es entender que **encolar una tarea y ejecutar una tarea son responsabilidades de dos procesos distintos.**

```text
Cliente → API (Productor) → Redis (Broker) → Worker (Consumidor) → Resultado
```

- **Productor:** la API recibe la solicitud, crea un mensaje y lo deposita en la cola. Devuelve inmediatamente.
- **Broker:** Redis actúa como intermediario persistente. Si el worker se cae, los mensajes no se pierden.
- **Consumidor (Worker):** un proceso independiente que escucha la cola, toma mensajes de uno en uno y los procesa.

Tres reglas que aplican siempre en este patrón:

1. **Los mensajes son ligeros.** Nunca pongas en el mensaje un blob completo (imagen, documento, lote de datos). Pasa el `id` o la ruta — el worker lo recupera él mismo.
2. **ACK solo tras éxito.** El mensaje se confirma como procesado únicamente cuando el worker termina correctamente. Si el worker falla antes, el mensaje vuelve a la cola para reintento.
3. **Toda tarea tiene timeout.** Un worker que no termina nunca bloquea el pool. Define siempre un tiempo máximo de ejecución.

---

## 🌱 Cómo Empezar el Proyecto

1. Añade Redis a tu `docker-compose.yml` como servicio broker. Usa la imagen oficial y exponla en el puerto estándar.
2. Instala las dependencias necesarias con `uv add celery redis flower`.
3. Crea el módulo Celery en tu monorepo (`services/celery_app.py` o similar) y configúralo para apuntar a Redis como broker y backend de resultados.
4. Identifica en tu API el endpoint o la operación que más tarda en responder — ese es el candidato a convertir en tarea asíncrona.
5. Levanta un worker con `celery -A services.celery_app worker` y verifica que se conecta al broker antes de modificar ningún endpoint.

---

## 💻 Qué Debes Hacer

### Infraestructura
- [ ] Redis añadido a `docker-compose.yml` con imagen oficial, puerto `6379` expuesto y política de memoria `noeviction`.
- [ ] Flower añadido a `docker-compose.yml` como servicio de monitoreo, accesible en el puerto `5555`.
- [ ] La API y los workers se conectan al mismo Redis. La URL de conexión se lee de una variable de entorno (`REDIS_URL`).

### Módulo Celery (`services/`)
- [ ] Crear la instancia de Celery con Redis como broker y como result backend.
- [ ] Definir al menos una tarea asíncrona (`@app.task`) que encapsule la operación pesada identificada en tu API.
- [ ] Configurar reintentos automáticos con `max_retries=3` y backoff exponencial (`countdown` creciente entre intentos).
- [ ] Implementar una Dead Letter Queue: cuando una tarea supera `max_retries`, registrar en base de datos el `task_id`, número de intento, error y timestamp.

### Endpoints de la API
- [ ] El endpoint que antes ejecutaba la operación pesada ahora encola la tarea y devuelve `202 Accepted` con `{"task_id": "..."}` de forma inmediata.
- [ ] Crear el endpoint `GET /tasks/{task_id}` que consulta el estado de la tarea en Redis y devuelve `{"task_id": "...", "status": "...", "result": ...}`.
- [ ] El campo `status` refleja los estados reales de Celery: `pending`, `started`, `success`, `failure`.

### Worker
- [ ] El worker corre como proceso independiente (no dentro del proceso de FastAPI).
- [ ] El worker está documentado en el README del monorepo: cómo levantarlo, cómo detenerlo.

### Observabilidad
- [ ] Cada tarea registra en el log: `task_id`, intento, estado resultante y duración de la ejecución.
- [ ] Los fallos registran adicionalmente el mensaje de error completo.
- [ ] Flower está accesible y muestra las tareas encoladas, en proceso y completadas.

---

## ✅ Qué Evaluaremos

- [ ] **Redis corre en Docker** y los workers se conectan a él sin errores de configuración.
- [ ] **El endpoint modificado devuelve `202 Accepted` con `task_id` en menos de 200ms**, independientemente de la duración de la tarea.
- [ ] **`GET /tasks/{task_id}` devuelve el estado correcto** en cada fase del ciclo de vida de la tarea.
- [ ] **Los reintentos automáticos están configurados con backoff:** no se reintenta inmediatamente tras un fallo.
- [ ] **Tras tres fallos consecutivos, la tarea aparece en la DLQ** con `task_id`, número de intento y mensaje de error registrados en base de datos.
- [ ] **El worker es un proceso separado:** detener la API no detiene el worker ni pierde mensajes en cola.
- [ ] **Los mensajes en cola contienen solo identificadores o referencias** — ningún payload de datos voluminosos.
- [ ] **Flower está levantado y muestra al menos una tarea completada y una fallida** durante la demostración.

---

## 📦 Cómo Entregar

1. Asegúrate de que todos los ítems del checklist estén completados.
2. Haz push de tu rama al repositorio.
3. Abre un **Pull Request** desde tu rama hacia `main`.
4. En el cuerpo del PR incluye:
   - El endpoint seleccionado para convertir en tarea asíncrona y la justificación de esa elección.
   - Una captura de Flower mostrando al menos una tarea completada y una en la DLQ.
   - El fragmento de log de una ejecución con reintento.
5. Añade la etiqueta `async-tasks` al PR antes de enviarlo a revisión.



