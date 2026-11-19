# Hito — Memoria y Auto-mejora de Agentes (Parte 1 de 2)

Antes de empezar: Lee tu [company-BRIEFING.md](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/contexts/08-agent-engineering/memory) — define qué información nunca debe entrar en la memoria de tu agente y qué tipo de hechos sí vale la pena que recuerde en tu empresa.

---

## 🎯 Tu reto

📌 Estás construyendo sobre tu copia del [monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo) de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Tu empresa ya tiene una base de conocimiento RAG de un hito anterior — un almacén de documentos que el modelo puede consultar. Eso no es el mismo producto que este agente. El agente que extiendes aquí tiene su propia identidad (ver tu BRIEFING: soporte a managers, CX, compliance, soporte de primera línea, …). Puede llamar al RAG como herramienta; no se convierte en la UI de Q&A comercial. El problema es que cada conversación sigue empezando de cero: no recuerda que ayer se resolvió una escalación parecida, ni que un usuario ya corrigió un dato la semana pasada. Tu tech lead abrió un ticket después de que dos clientes distintos tuvieron que repetir la misma corrección tres veces en la misma semana.

---

## 🧠 Conocimiento Complementario: Arquitecturas de Memoria

La memoria de un agente no es un solo componente — se organiza por alcance temporal. La ventana de contexto alcanza cuando la tarea cabe en una sola sesión. La memoria episódica (Redis, clave-valor, prompt caching) permite recordar interacciones pasadas y personalizar. Una VectorDB sirve para recuperar información semánticamente similar en corpora grandes. Los knowledge graphs importan cuando las relaciones explícitas (dependencia, jerarquía) son el requisito real de recuperación — algo que la similitud coseno no puede capturar. El fine-tuning (memoria paramétrica) es el último recurso: costoso, lento de actualizar, y no permite "olvidar" selectivamente. Ninguna arquitectura de memoria auto-mejorable funciona sin un ciclo de limpieza y consolidación — sin curación, la acumulación cruda degrada la calidad de recuperación con el tiempo.

---

## De: Tech Lead — Ticket #MEM-092

El agente ya usa el conocimiento de la empresa (RAG como herramienta, no como identidad de este agente) y las herramientas del MCP Server. Pero cada conversación empieza de cero: no recuerda que ayer resolvimos una escalación parecida, ni que alguien ya corrigió un dato la semana pasada. Necesito que el agente aprenda de la interacción, sin que eso signifique que empiece a inventar cosas o a acumular basura en su memoria para siempre.

No hace falta un grafo nuevo ni una arquitectura multi-agente para esto — es el mismo agente de siempre, con un paso extra de auto-evaluación:

- Cuando el agente detecta, dentro de su propia respuesta, algo que valdría la pena recordar, se lo propone al usuario en la misma conversación (`"¿quieres que recuerde esto para la próxima vez?"`) en lugar de escribirlo directo.
- Esa decisión — sí, no, o una edición — no puede quedar como una interpretación difusa del siguiente mensaje. Tiene que clasificarse explícitamente contra la propuesta pendiente y quedar registrada: qué se propuso, qué decidió el usuario, y cuándo. Si no se puede determinar la decisión con confianza razonable, la propuesta se descarta por defecto — nunca se asume aprobación por silencio o ambigüedad.
- Solo lo aprobado y registrado se consolida en el almacén persistente; lo rechazado se descarta, pero el registro de que se propuso y se rechazó queda igual.
- No acepto una memoria que crezca sin límite, que se autoedite sin que el usuario lo sepa, ni una escritura a memoria de la que no quede rastro de quién la autorizó.

> [!WARNING]
> **Aviso — Memoria core en producción:** En una empresa real, la memoria core no la edita libremente cualquier agente o desarrollador. Los cambios pasan por tickets de solicitud de modificación y los revisa/aplica un equipo dedicado que posee esa cadena de control. Para este proyecto, esa gobernanza se omite a propósito para que el hito sea viable y alcanzable — implementas propuesta → confirmación del usuario → escritura/consolidación directamente en el flujo del agente.

> [!IMPORTANT]
> 🔀 **PR aprobado → haz merge a `main`.** Si no, la funcionalidad no se despliega y tu siguiente rama parte de código desactualizado, lo que acaba en conflictos de merge.

---

## 🌱 Cómo Empezar el Proyecto

- Si ya tienes tu fork del monorepo de la compañía, crea una nueva rama a partir de tu último avance (trabajo del agente LangGraph / MCP).
- Si por alguna razón no tienes fork aún (por ejemplo, te uniste tarde o lo perdiste), haz fork del [monorepo de referencia](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo) antes de continuar.

```bash
git switch -c feature/agent-memory
```

- Sigue trabajando sobre el mismo agente LangGraph que ya consume el MCP Server — este proyecto no reemplaza esa base, la extiende.
- Instala cualquier dependencia nueva con `uv add` (nunca `pip install` ni `pipenv`).

---

## 💻 Qué Debes Hacer

### Selección de Arquitectura de Memoria
- [ ] Elige un backend de memoria persistente (por ejemplo Redis, una base clave-valor, una VectorDB, o una combinación) y documenta por escrito por qué encaja con lo que tu agente necesita recordar en tu empresa.
- [ ] **No escribas memoria en las colecciones RAG de la empresa (`*_knowledge` / almacén Qdrant de conocimiento de la empresa).** El RAG sigue siendo herramienta de **solo lectura**. La memoria usa un store aparte o una colección claramente no-knowledge (p. ej. Redis, KV, o `*_agent_memory`). Mezclar hechos episódicos/aprobados con docs curados rompe evals de retrieval y controles de poison.
- [ ] Implementa una interfaz explícita de lectura/escritura de memoria — el agente no debe acumular estado simplemente agregando todo al system prompt.

> ⚠️ **IMPORTANTE:** Qué tipo de hechos son memorizables y cuáles están terminantemente prohibidos de guardar debe corresponder exactamente a lo especificado en tu `company-BRIEFING.md`. Una implementación genérica que ignore esas restricciones no será aceptada.

### Auto-evaluación y Propuesta de Memoria
- [ ] Después de cada interacción relevante, el agente debe auto-evaluar si hay algo nuevo o corregido que valga la pena recordar, con un criterio explícito (no simplemente "siempre").
- [ ] La forma más simple de resolver esto es pedirle al modelo una **salida estructurada en una sola llamada**: la respuesta que ve el usuario, más un campo `propuesta_memoria` (si aplica, qué se agregaría/cambiaría y por qué). No se necesita una segunda llamada al modelo, ni un agente separado, ni una arquitectura multi-agente — es el mismo agente con un campo adicional en su salida.
- [ ] El agente debe poder descartar la mayoría de las interacciones como "nada que recordar" — documenta al menos 3 ejemplos de interacciones que NO deberían generar una propuesta.
- [ ] Cuando sí hay algo memorable, el agente **se lo propone al usuario dentro de su misma respuesta** (por ejemplo, como una pregunta al final) — nunca escribe directamente a memoria en este paso.

### Confirmación del Usuario y Registro Auditable
- [ ] Cuando hay una propuesta de memoria pendiente, el siguiente mensaje del usuario debe evaluarse primero contra esa propuesta: ¿la aprueba, la rechaza, o la edita? Usa una clasificación de intención explícita (etiqueta estructurada / clasificador), no un simple `"sí" in mensaje`.
- [ ] Solo puede haber **una propuesta pendiente a la vez**: si ya hay una sin resolver, el agente no debe lanzar una segunda hasta cerrar la primera.
- [ ] Si el usuario cambia de tema sin responder claramente sí o no, la propuesta se descarta por defecto — nunca se asume aprobación por silencio o ambigüedad.
- [ ] Cada decisión (propuesta, resultado, mensaje que la originó, marca de tiempo) queda registrada de forma auditable, sin importar si la propuesta fue aprobada o rechazada.
- [ ] Después de resolver la propuesta pendiente (en el mismo turno o en uno posterior), la conversación continúa con normalidad — incluyendo si el usuario respondió la propuesta y siguió con otra pregunta en el mismo mensaje.

### Consolidación y Limpieza
- [ ] Implementa un mecanismo de consolidación que evite que la memoria crezca sin control (por ejemplo: resumir, deduplicar, o descartar entradas de baja relevancia).
- [ ] Documenta la política de expiración o limpieza que aplicaste y por qué la elegiste.

### Evidencia
- [ ] Documenta al menos dos ciclos completos del flujo: uno donde la actualización de memoria es aprobada y se refleja en una interacción futura, y otro donde es rechazada y la memoria permanece sin cambios.

---

## 🎨 Decisiones de Diseño

Como parte del reto, tu implementación debe resolver — sin que se te diga explícitamente en un checklist — las siguientes decisiones:

- ¿Qué tipo(s) de memoria (episódica, semántica/vectorial, knowledge graph) necesita realmente tu empresa, y por qué descartaste las otras opciones?
- ¿Qué información nunca debería entrar en la memoria del agente, sin importar quién lo pida? Revisa tu BRIEFING — algunas empresas tienen restricciones no negociables en este punto.
- ¿Cómo decide el agente qué olvidar, y qué pasa con una propuesta pendiente si el usuario nunca responde?
- ¿Cómo evitas que un usuario malicioso "envenene" la memoria del agente con información falsa presentada como una corrección legítima?
- ¿Por qué no hace falta una arquitectura multi-agente para resolver la auto-evaluación y la propuesta de memoria? Justifica tu respuesta con lo que implementaste.

---

## ✅ Qué Evaluaremos

- [ ] La arquitectura de memoria elegida está justificada por escrito y corresponde a lo que el agente realmente necesita recordar.
- [ ] Las escrituras de memoria nunca apuntan a colecciones `*_knowledge` / RAG de la empresa (solo store aparte o colección no-knowledge).
- [ ] Existe una interfaz explícita de lectura/escritura de memoria (no memoria implícita vía system prompt).
- [ ] El agente distingue correctamente interacciones memorables de las que no lo son, con al menos 3 ejemplos documentados de cada tipo.
- [ ] La propuesta de memoria se comunica dentro de la misma conversación, no en un canal o proceso separado.
- [ ] Ninguna actualización de memoria se escribe sin una decisión explícita del usuario, clasificada correctamente (no un match de texto ingenuo).
- [ ] Solo existe una propuesta pendiente a la vez, y el silencio o la ambigüedad se resuelven como rechazo por defecto, no como aprobación.
- [ ] Cada propuesta y su resultado quedan registrados de forma auditable, sin importar si fue aprobada o rechazada.
- [ ] Existe un mecanismo de consolidación/limpieza documentado y funcional.
- [ ] Se entregan al menos dos ciclos completos de evidencia (uno aprobado, uno rechazado).
- [ ] Las decisiones de diseño responden explícitamente a las restricciones de tu `company-BRIEFING.md`, en especial qué no debe recordarse jamás.

---

## 📦 Cómo Entregar

Sigue el flujo estándar de Pull Request contra tu propio fork del monorepo:

- [ ] Abre un PR desde `feature/agent-memory` hacia tu rama principal.
- [ ] Incluye en la descripción del PR la justificación de tu arquitectura de memoria y las respuestas a las decisiones de diseño.
- [ ] Adjunta o describe la evidencia de los dos ciclos completos (aprobado y rechazado).

