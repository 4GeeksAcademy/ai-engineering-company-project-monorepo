# Agente de Soporte con LangGraph — Parte 1 de 2: Migración y Flujo del Agente

<!-- hide -->

Por [@marcogonzalo](https://github.com/marcogonzalo) y [otros contribuidores](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo/graphs/contributors) en [4Geeks Academy](https://4geeksacademy.com/)

[![build by developers](https://img.shields.io/badge/build_by-Developers-blue)](https://4geeks.com)
[![4Geeks Academy](https://img.shields.io/twitter/follow/4geeksacademy?style=social&logo=x)](https://x.com/4geeksacademy)

_These instructions are [available in English](./README.md)._

<!-- endhide -->

---

## 🎯 Tu reto

> 📌 Estás construyendo sobre **tu copia** del **[monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo)** de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Ya construiste las cuatro funciones de tu sistema RAG (`setup`, `embed`, `retrieve`, `query`) y las expusiste como un endpoint de FastAPI. Funciona, pero es una caja negra: recibe una pregunta y devuelve una respuesta, sin que nadie —ni tú— pueda ver qué decisiones tomó en el camino.

Tu tech lead abrió un **ticket** con un requisito claro: antes de agregar cualquier capacidad nueva al agente (Parte 2 de este mismo proyecto), el flujo de razonamiento tiene que quedar explícito como un grafo, con estado, nodos y transiciones que se puedan trazar y evaluar de forma independiente.

> **Nota del tech lead:** _"No quiero que reescribas la lógica del RAG desde cero — el `retrieve` y el `embed` que ya tienes funcionan. Lo que quiero es que ese mismo comportamiento viva dentro de un grafo de LangGraph, con nodos con una sola responsabilidad, y que cada corrida quede trazada. Si no puedo ver por qué el agente respondió lo que respondió, no puedo confiar en él en producción."_

Tres cosas quedan implícitas en ese ticket y son fáciles de pasar por alto: (1) el grafo debe compilarse antes de cualquier ejecución, para detectar errores estructurales en tiempo de build y no en producción; (2) el estado que viaja entre nodos debe ser mínimo y explícito, no el historial completo de la conversación; y (3) cada corrida debe producir un trace consultable, no solo una respuesta final.

### Conocimiento complementario: del loop ingenuo al grafo

Un agente "ingenuo" es simplemente un `while` en Python: llamas al modelo, si pide una tool la ejecutas, le devuelves el resultado, y repites. Funciona para prototipos, pero no escala: no hay forma de pausar, retomar, trazar un paso específico o testear un nodo de forma aislada.

LangGraph formaliza ese mismo loop como una máquina de estados: cada paso es un **nodo**, cada decisión sobre a dónde ir después es una **arista (edge)**, y el conjunto compilado es el **grafo**. Esto es lo que te permite, en la Parte 2, agregar una tool nueva sin tocar el resto del flujo: solo agregas un nodo y una arista condicional que decide cuándo usarla.

---

## 🌱 Cómo Empezar

1. Sigue trabajando sobre tu fork existente del [**monorepo**](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo). Si por algún motivo aún no lo tienes, haz un fork y ábrelo en **GitHub Codespaces** o clónalo localmente.
2. Crea una rama nueva: `git switch -c feature/langgraph-agent-base`.
3. Instala la dependencia con `uv add langgraph` (nunca uses `pip install` ni `pipenv`).
4. Ubica tu código RAG existente: tus funciones `setup`, `embed`, `retrieve` y `query` en `data/pipelines/`, y el endpoint que las expone en `services/`.

---

## 💻 Qué Tienes Que Hacer

### Grafo del agente (`services/`)

- [ ] Define el **estado** del grafo: la información mínima que un nodo necesita para decidir el siguiente paso (pregunta del usuario, resultado de la recuperación, respuesta parcial). No incluyas el historial completo de la conversación sin justificar por qué lo necesitas.
- [ ] Modela al menos estos **nodos**: uno que recibe la pregunta, uno que ejecuta `retrieve` sobre tu base de conocimiento (reutilizando el código de `data/pipelines/`, sin duplicarlo), y uno que genera la respuesta final a partir del contexto ya recuperado usando tu paso de generación (`generate_answer(question, context)` — la función que separaste de `query()` en el proyecto RAG).
- [ ] Define las **aristas (edges)** entre nodos según condiciones de salida explícitas, no como una secuencia fija hardcodeada. Incluye al menos una condición real, no solo una línea recta — por ejemplo: si la pregunta está vacía, enruta a un error/`END` claro en vez de recuperar; si `retrieve` no devuelve contexto por encima del umbral, enruta a un nodo que responda con honestidad ("no tengo información sobre eso") en lugar de forzar la generación sobre contexto vacío.

> **Contrato de nodos (léelo con atención):** El nodo `retrieve` llama a `retrieve()`; el nodo de generación llama a tu función de generación (`generate_answer(question, context)`) con el contexto que el nodo `retrieve` ya produjo. **No** metas el `query()` monolítico (retrieve + generación juntos) dentro de un solo nodo — eso vuelve a ejecutar la recuperación y colapsa justamente el flujo que se te pidió hacer explícito y trazable. Si reutilizas `query()` directamente, debe aceptar chunks ya recuperados y saltarse su `retrieve()` interno.

- [ ] **Compila el grafo** antes de cualquier ejecución — la compilación debe fallar de forma clara si hay un error estructural (nodo sin conexión, estado mal tipado, etc.).
- [ ] Implementa **checkpointing** en cada transición de estado relevante, para que una corrida pueda inspeccionarse o retomarse.

### Tracing y evaluación

- [ ] Instrumenta el grafo para que **cada corrida produzca un trace**: qué nodos se ejecutaron, en qué orden, y qué produjo cada uno. Puedes usar una herramienta de tracing (por ejemplo, LangSmith) o tu propio log estructurado si no tienes acceso a una — lo que importa es que el trace sea consultable después de la corrida, no solo impreso en consola.
- [ ] Escribe al menos 3 **evals**: casos de prueba con una pregunta de entrada y un criterio verificable sobre la respuesta o sobre el trace (por ejemplo: "para esta pregunta, el nodo `retrieve` debe ejecutarse antes que `query`"). Los evals corren contra el trace, no contra una ejecución en vivo cada vez.
- [ ] Los evals deben vivir en `tests/pipelines/` y ser ejecutables con un solo comando.
- [ ] Al menos un eval debe verificar que la respuesta sigue **anclada** en tu base de conocimiento RAG existente (p. ej. una pregunta de política conocida devuelve la entidad/dato esperado de `CONTEXT-company.md`). La corrección del trace/enrutamiento **no** reemplaza el anclaje de la respuesta: tus evals del agente son **adicionales** a tus tests RAG existentes, que deben seguir pasando. El anclaje sigue siendo criterio de aceptación — una corrida con un trace perfecto pero una respuesta que ignora las políticas del CONTEXT es un fallo.

### Endpoint (`services/`)

- [ ] Expón el grafo compilado a través de un endpoint (por ejemplo `POST /agent/query`) que reemplace o conviva con el endpoint RAG existente. El endpoint no debe contener lógica de negocio propia — solo invoca el grafo.
- [ ] Si el grafo falla en cualquier nodo, el endpoint responde con un mensaje de error claro, nunca con un stack trace crudo.

⚠️ **IMPORTANTE:** El comportamiento del agente (qué documentos recupera, qué responde) debe seguir siendo correcto según tu base de conocimiento RAG existente. Migrar a LangGraph no es una excusa para que las respuestas dejen de estar ancladas en los datos de tu empresa.

---

## ✅ Qué Vamos a Evaluar

- [ ] El estado del grafo es mínimo y explícito — no arrastra historial completo sin justificación.
- [ ] Existen nodos con responsabilidad única para recepción de la pregunta, recuperación y generación de respuesta.
- [ ] Las aristas están definidas por condiciones de salida, no hardcodeadas como una secuencia fija.
- [ ] El grafo se compila explícitamente antes de ejecutarse y falla con un error claro ante un problema estructural.
- [ ] Existe checkpointing verificable en al menos una transición de estado.
- [ ] Cada corrida produce un trace consultable, no solo una respuesta final.
- [ ] Hay al menos 3 evals ejecutables en `tests/pipelines/`, con criterios verificables sobre el trace o la respuesta, y al menos uno verifica que la respuesta sigue anclada en la base de conocimiento del CONTEXT.
- [ ] Los tests RAG existentes siguen pasando — los evals del agente extienden, no reemplazan, el anclaje de la respuesta como criterio de aceptación.
- [ ] El endpoint invoca el grafo sin duplicar lógica de negocio y maneja errores sin exponer detalles internos.
- [ ] Los nodos llaman a `retrieve` y al paso de generación por separado — ningún nodo re-envuelve el `query()` monolítico (retrieve + generación).
- [ ] Las funciones `retrieve`/`embed`/`query` existentes se reutilizan desde `data/pipelines/`, no se reescriben desde cero.

---

## 📦 Cómo Entregar Este Proyecto

Esta es la **Parte 1 de 2**. Se entrega mediante su propio Pull Request, independiente del de la Parte 2 (que puede construir sobre esta rama, pero se revisa por separado).

```text
data/
  pipelines/                    ← funciones RAG existentes, reutilizadas sin duplicar

services/
  <agent-service>/               ← grafo de LangGraph, nodos, endpoint

tests/
  pipelines/                     ← evals del agente
```

1. Sube tu rama con la estructura anterior y abre un Pull Request al repositorio original con la etiqueta `langgraph-agent-base`.
2. Asegúrate de que el PR incluya:
   - Una captura o export del trace de al menos una corrida completa.
   - El resultado de correr los evals (consola o archivo).

---

Este y otros proyectos son construidos por estudiantes como parte de los [Coding Bootcamps](https://4geeksacademy.com/) de 4Geeks Academy. Encuentra más acerca de los [cursos](https://4geeksacademy.com/es/comparar-programas) de [Full-Stack Software Developer](https://4geeksacademy.com/es/programas-de-carrera/desarrollo-full-stack), [Data Science & Machine Learning](https://4geeksacademy.com/es/programas-de-carrera/ciencia-de-datos-ml), [Ciberseguridad](https://4geeksacademy.com/es/programas-de-carrera/ciberseguridad) e [Ingeniería de IA](https://4geeksacademy.com/es/programas-de-carrera/ingenieria-ia).