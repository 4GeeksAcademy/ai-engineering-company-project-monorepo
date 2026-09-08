# README

## Gestión de Errores

### 🎯 Tu reto
**📌 Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

Llevas varios hitos construyendo la plataforma de tu empresa: un sitio web corporativo, un frontend en Next.js, un backend en Python/FastAPI y scripts que procesan datos reales. El repositorio crece — y con él, la superficie donde las cosas pueden fallar.

Tu tech lead ha abierto un ticket de revisión de código con un mensaje claro: el sistema no tiene una estrategia coherente de gestión de errores. Las llamadas a la API pueden fallar en silencio, faltan estados de carga, los usuarios ven mensajes técnicos crudos (o simplemente nada), y los scripts de fondo se rompen sin dejar rastro útil. Antes de que el siguiente hito introduzca más complejidad, el equipo necesita corregir esto.

Tu tarea es auditar todo el repositorio existente y aplicar una estrategia de gestión de errores consistente en todas las capas: frontend, backend y scripts.

El tech lead ha compartido las siguientes notas en el ticket:

#### Lo que necesitamos
- Ningún error debe romper la aplicación ni dejar al usuario en un estado indefinido.
- Toda operación asíncrona en el frontend debe tener tres estados visibles: cargando, éxito y error.
- Los mensajes de error que ve el usuario deben ser legibles — nunca un stack trace, un código de estado o un error de parseo de JSON en crudo.
- Todo estado de error debe ofrecer una salida clara: un botón de reintentar, un enlace a la página principal o instrucciones para contactar soporte.
- En el backend y los scripts, las excepciones deben capturarse en el ámbito correcto — no con un único try/catch que envuelva toda la función.
- Nunca debe aparecer información sensible en la salida de errores enviada al cliente.
- Esta es una tarea de ingeniería transversal — no una nueva funcionalidad. El entregable es una versión más limpia y robusta del repositorio que ya has construido. Al terminar este proyecto, cualquier usuario que encuentre un problema en tu plataforma sabrá qué ha pasado y qué puede hacer.

### 🌱 Cómo iniciar el proyecto
Este proyecto trabaja directamente sobre el monorepo de tu empresa — el mismo que llevas construyendo desde el Hito 1.

1. Abre el monorepo en tu editor o Codespace.
2. Crea una nueva rama para este trabajo: `git switch -c feature/error-handling-audit`.
3. Trabaja en cada capa del código de forma sistemática (ver checklist más abajo).
4. Haz commits con mensajes claros que expliquen qué corregiste y por qué.
5. No necesitas un nuevo repositorio ni un boilerplate.

### 🤖 Usar tu coding agent para detectar oportunidades
Antes de hacer cualquier cambio manualmente, usa tu coding agent para escanear el repositorio y localizar las carencias más críticas. A continuación tienes una plantilla de prompt que puedes adaptar y ejecutar en el agente que uses (Cursor, Copilot, Claude Code, etc.).

Estúdiala, ajusta las partes marcadas con `[corchetes]` y hazla tuya — un buen prompt de detección te ahorrará horas de lectura manual.

> **Prompt de Detección:**
> Eres un ingeniero de software senior auditando un repositorio en busca de problemas en la gestión de errores.
> 
> Analiza todo el repositorio ubicado en `[ruta o describe la estructura de tu repo, por ejemplo: "un frontend Next.js en /apps/web, un backend FastAPI en /apps/api y scripts Python en /scripts"]`.
> 
> Por cada archivo o módulo que revises, identifica y reporta:
> 
> 1. **TRY/CATCH AUSENTE** — operaciones asíncronas (fetch, await, lectura de archivos, parseo de JSON) que no tienen ningún manejo de errores.
> 2. **CATCH DEMASIADO AMPLIO** — bloques try/catch o try/except que envuelven funciones enteras o secciones grandes de código en lugar de la operación peligrosa concreta.
> 3. **FALLOS SILENCIOSOS** — errores capturados pero ignorados (bloques catch vacíos, `except: pass` sin acción).
> 4. **EXPOSICIÓN DE ERRORES EN CRUDO** — lugares donde un mensaje de excepción, stack trace o código de estado podría llegar a la interfaz de usuario o a la respuesta de la API.
> 5. **FILTRACIÓN DE DATOS SENSIBLES** — salidas de error o logs que podrían incluir secretos, cadenas de conexión a base de datos, rutas internas o datos personales.
> 6. **ESTADOS DE CARGA/ERROR AUSENTES EN LA UI** — componentes del frontend que cargan datos pero no renderizan nada (o se rompen) cuando la petición está cargando o falla.
> 7. **SIN LLAMADA A LA ACCIÓN PARA EL USUARIO** — estados de error que muestran un mensaje pero no ofrecen ninguna salida (sin reintentar, sin navegación, sin contacto de soporte).
> 8. **SIN sys.exit EN FALLO DE SCRIPT** — scripts Python que encuentran un error crítico pero terminan con código 0 o sin código de salida explícito.
> 
> Por cada hallazgo, reporta:
> - Ruta del archivo y número de línea (o rango)
> - Categoría (de la lista anterior)
> - Una línea describiendo el problema
> - Corrección sugerida (breve — la implementación es responsabilidad del desarrollador)
> 
> No hagas ningún cambio. Entrega únicamente el informe de auditoría.
> Prioriza los hallazgos por severidad: CRÍTICO > ALTO > MEDIO > BAJO.

Ejecuta la auditoría, lee el informe con atención y usa el checklist de abajo para registrar tus correcciones.

# 💻 Qué debes hacer

## Frontend (Next.js / TypeScript)

- [ ] Identifica todas las llamadas `fetch` o a la API en el frontend y verifica que cada una tenga un bloque `try/catch` específico para esa llamada.
- [ ] Para cada operación asíncrona que cargue datos, implementa el patrón de UI de tres estados: cargando (spinner o skeleton), éxito (datos visibles), error (mensaje con llamada a la acción).
- [ ] Reemplaza cualquier mensaje de error en crudo (`Error 500`, `Unexpected token`, etc.) por una explicación legible para el usuario.
- [ ] Asegúrate de que todo estado de error incluya una llamada a la acción clara: un botón de reintentar, un enlace a la página principal o un prompt para contactar soporte.
- [ ] Usa `optional chaining` (`?.`) al acceder a propiedades anidadas que podrían ser `undefined`.
- [ ] Añade `defaults` o `fallbacks` seguros para valores que podrían ser `null` o `undefined` al renderizar.
- [ ] Usa bloques `finally` para asegurar que los estados de carga siempre se limpien, independientemente del resultado.

## Backend (Python / FastAPI)

- [ ] Revisa cada handler de ruta y asegúrate de que las excepciones se capturen en el ámbito correcto — evita bloques `try/except` grandes que engullan todos los errores.
- [ ] Devuelve respuestas HTTP de error apropiadas (`400`, `404`, `422`, `500`) con un cuerpo JSON limpio y estructurado — sin tracebacks de Python en crudo.
- [ ] Asegúrate de que las respuestas de error no exponen datos sensibles (cadenas de conexión a base de datos, rutas internas, claves secretas).
- [ ] Añade gestión de errores a todas las llamadas a APIs externas que se hagan desde el backend (por ejemplo, llamadas a un LLM o a un servicio de terceros).

## Scripts (Python)

- [ ] Envuelve las operaciones de lectura/escritura de archivos y el parseo de CSV en bloques `try/except` con mensajes de error informativos impresos en `stderr`.
- [ ] Asegúrate de que los scripts terminan con un código distinto de cero (`sys.exit(1)`) cuando ocurre un error crítico.
- [ ] Añade comprobaciones defensivas para datos de entrada faltantes o malformados antes de que comience el procesamiento.

## General

- [ ] Revisa el código base en busca de `console.error` o sentencias `print` que expongan información interna sensible y elimínalos o reemplázalos.

> ⚠️ **IMPORTANTE:** No introduzcas nuevas funcionalidades ni refactorices código que no esté relacionado con la gestión de errores. El alcance de este proyecto es estrictamente la resiliencia y la comunicación de errores del código existente.


# ✅ Qué vamos a evaluar

- [ ] Todas las operaciones asíncronas del frontend implementan el patrón de UI de tres estados (cargando / éxito / error).
- [ ] Los mensajes de error mostrados al usuario son legibles e incluyen una llamada a la acción.
- [ ] Los bloques `try/catch` y `try/except` están acotados a operaciones específicas, no envuelven funciones enteras.
- [ ] Los bloques `finally` se usan correctamente para limpiar el estado de carga.
- [ ] El `optional chaining` y los `fallbacks` se aplican donde corresponde para evitar errores de renderizado por valores `undefined`.
- [ ] Las rutas del backend devuelven respuestas de error estructuradas y limpias con los códigos HTTP correctos.
- [ ] Ninguna información sensible aparece en la salida de errores entregada al cliente.
- [ ] Los scripts de Python gestionan errores de I/O y terminan con códigos de salida apropiados en caso de fallo.

> **Nota:** La evaluación se centra en la corrección y consistencia de los patrones de gestión de errores — no en si se añadieron nuevas funcionalidades.

## 📦 Cómo entregar

Sube tu rama `feature/error-handling-audit` a GitHub y comparte la URL del pull request (o del repositorio) con tu instructor según las instrucciones de entrega de tu cohorte.