---
name: trackflow-work-item-intake
description: "Convert one TrackFlow operational request into a scoped, implementation-ready work item with verifiable acceptance criteria."
user-invocable: true
---

# Preparar una tarea de TrackFlow

## Objetivo

Convertir una solicitud operativa de TrackFlow en una ficha única, acotada y lista para estimar o implementar. Esta skill define el alcance y cómo verificar el resultado; no implementa código ni elige tecnologías.

## Entradas

Usa la información disponible en la solicitud. Registra como «No indicado» cualquier dato ausente; no lo inventes.

- Solicitud o problema operativo que se quiere resolver (obligatorio).
- Usuario o equipo afectado y resultado esperado, si se conocen.
- Proceso y etapa afectados, país y almacén, si aplican.
- Sistemas, datos, reglas de negocio y restricciones conocidas.
- Límites de alcance, dependencias o prioridad expresados por quien solicita el trabajo.

Consulta `memory-bank/projectbrief.md`, `memory-bank/progress.md` y `memory-bank/techContext.md` para contextualizar la tarea. Consulta el briefing de dominio solo cuando sea necesario confirmar procesos o datos actuales de TrackFlow. Si la tarea deriva en decisiones de arquitectura, stack, integración o despliegue, sigue además `.agents/skills/trackflow-technical-context/SKILL.md`.

## Procedimiento

1. Resume la solicitud como un único resultado observable. Si contiene objetivos independientes, sepáralos y prepara una ficha para cada uno solo si se solicita; de lo contrario, delimita el objetivo principal.
2. Separa hechos aportados o verificados, supuestos y datos pendientes. Cita la fuente de los hechos relevantes.
3. Define qué incluye y qué excluye la tarea, respetando las restricciones declaradas.
4. Redacta criterios de aceptación que indiquen condición y resultado observable, y que puedan comprobarse mediante revisión, una prueba o evidencia identificable.
5. Si faltan datos que impiden delimitar el trabajo o verificar el resultado, pregunta por ellos antes de presentar la ficha como lista. No sustituyas esos datos por decisiones técnicas.
6. Entrega la ficha con el formato siguiente.

## Formato de salida

### Objetivo
Una frase con el resultado observable.

### Entradas y contexto
- Solicitud:
- Usuario/equipo y proceso:
- País/almacén:
- Sistemas, datos y reglas:
- Restricciones y dependencias:
- Datos no indicados:

### Alcance
- Incluye:
- Excluye:

### Supuestos y decisiones pendientes
Lista los supuestos con su fundamento y las preguntas que bloquean la definición, o indica «Ninguno».

### Criterios de aceptación
Lista numerada. Cada criterio debe describir una condición y un resultado comprobable; evita expresiones subjetivas como «intuitivo», «robusto» o «rápido» sin una medida acordada.

## Criterios de aceptación de esta skill

La ficha está lista únicamente si se cumplen todos estos puntos:

1. Contiene exactamente un objetivo principal expresado como resultado observable.
2. Incluye todos los campos del formato de salida; los datos desconocidos aparecen como «No indicado» o «Ninguno», no se infieren.
3. Define inclusiones y exclusiones explícitas.
4. Cada criterio de aceptación puede comprobarse con una condición y un resultado observable; toda medida numérica tiene una fuente o un valor acordado.
5. Señala preguntas pendientes que bloquean el alcance o la verificación y no presenta propuestas como decisiones confirmadas.
6. Si una pregunta bloqueante sigue sin respuesta, la ficha se marca «Pendiente de aclaración» y no «Lista para implementar».
