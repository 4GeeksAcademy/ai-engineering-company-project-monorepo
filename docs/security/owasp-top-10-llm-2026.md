# OWASP Top 10 para Aplicaciones LLM 2026

**14 lecciones**

## Índice

- [00.0 Bienvenido a la Seguridad en Aplicaciones con LLM](#000-bienvenido-a-la-seguridad-en-aplicaciones-con-llm)
- [01.0 Qué es el Top 10 de LLM](#010-qué-es-el-top-10-de-llm)
- [01.1 Inyección de Prompt](#011-inyección-de-prompt)
- [02.0 Divulgación de Información Sensible](#020-divulgación-de-información-sensible)
- [02.1 Exposición de Contexto Oculto](#021-exposición-de-contexto-oculto)
- [03.0 Manejo Inadecuado de la Salida](#030-manejo-inadecuado-de-la-salida)
- [03.1 Desinformación](#031-desinformación)
- [04.0 Agencia Excesiva](#040-agencia-excesiva)
- [04.1 Consumo Ilimitado](#041-consumo-ilimitado)
- [05.0 Cadena de Suministro](#050-cadena-de-suministro)
- [05.1 Envenenamiento de Datos y Modelos](#051-envenenamiento-de-datos-y-modelos)
- [05.2 Debilidades de Vectores y Embeddings](#052-debilidades-de-vectores-y-embeddings)
- [06.0 Evaluación Top 10 de LLM](#060-evaluación-top-10-de-llm)
- [07.0 Auditoría de tu Aplicación LLM](#070-auditoría-de-tu-aplicación-llm)

---

## 00.0 Bienvenido a la Seguridad en Aplicaciones con LLM

### ¿Por qué no se pueden hacer los LLMs infalibles?

Los LLMs procesan instrucciones y datos como un **flujo continuo único de tokens**. A diferencia del software tradicional donde el código y los datos de entrada están claramente separados, los LLMs no tienen una frontera arquitectónica entre lo que se les indica hacer y los datos que reciben.

### La mentalidad de contención

Dado que la prevención infalible es imposible, el enfoque de seguridad se traslada a **contener el radio de impacto** cuando el modelo es engañado:
- Cuando el modelo se comporte mal, ningún sistema o dato crítico debe verse comprometido.
- El acceso a información sensible, herramientas poderosas o acciones irreversibles debe estar estrictamente limitado.
- Las decisiones de seguridad (autorizaciones, acciones irreversibles) deben manejarse **fuera del modelo**, en código determinista de la aplicación.

---

## 01.0 Qué es el Top 10 de LLM

La edición **2026** (publicada el 3 de agosto de 2026) combina un voto de practicantes (**75%**) con el análisis de **6,639 incidentes reales** (**25%**).

### Las diez entradas de 2026

1. **LLM01** Inyección de Prompt
2. **LLM02** Divulgación de Información Sensible
3. **LLM03** Agencia Excesiva *(subió del 6.º al 3.º)*
4. **LLM04** Cadena de Suministro
5. **LLM05** Envenenamiento de Datos y Modelos
6. **LLM06** Consumo Ilimitado *(subió del 10.º al 6.º)*
7. **LLM07** Desinformación *(subió del 9.º al 7.º)*
8. **LLM08** Exposición de Contexto Oculto *(renombrada desde Fuga de Prompt del Sistema)*
9. **LLM09** Debilidades en Vectores y Embeddings
10. **LLM10** Manejo Inadecuado de Salida *(cayó del 5.º al 10.º)*

- El **Top 10 de LLM** se enfoca en el modelo como componente de la aplicación.
- El **Top 10 Agéntico** aborda riesgos cuando el modelo actúa de forma autónoma con herramientas y memoria.

---

## 01.1 Inyección de Prompt

- **Inyección directa:** El usuario anula instrucciones del prompt del sistema (*jailbreaking* o accidental).
- **Inyección indirecta:** El modelo lee contenido externo (web, correo, RAG, ticket, respuesta MCP) con instrucciones ocultas.
- **Codificaciones cruzadas y ocultas:** Instrucciones ocultas en imágenes, audio, Unicode invisible (ancho cero, bloques de etiquetas) o Base64.

### La Tríada Letal (Alto Riesgo)

Una función es de alto riesgo si combina simultáneamente:
1. **(a)** Entrada no confiable (*Untrusted Input*)
2. **(b)** Acceso a datos privados/sensibles (*Access to Private Data*)
3. **(c)** Comunicación externa o cambio de estado (*External Communication or State Change*)

### Controles de Contención

1. **Filtrar entradas en cada modalidad** (eliminar Unicode invisible; OCR/transcripción en imágenes y audio):
   ```javascript
   function removeInvisibleChars(input) {
     return input.replace(/[\u200B-\u200D\uFEFF]|[\u{E0000}-\u{E007F}]/gu, '');
   }
   ```
2. **Separar credenciales y privilegios del contexto del modelo.**
3. **Principio de menor privilegio y herramientas limitadas.**
4. **Aprobación humana para acciones de alto impacto** (**Regla de Dos de Meta**).
5. **Validación de salida y esquemas estrictos.**

---

## 02.0 Divulgación de Información Sensible

### Canales y Fases

- **Canales:** Respuestas, argumentos de herramientas, trazas de razonamiento, contenido recuperado, logs/telemetría, embeddings y canales laterales (tiempos, longitud de tokens).
- **Fases:** Tiempo de entrenamiento, inferencia, pipeline (observabilidad/ajuste fino) y observación.

### Controles Fundamentales

- Minimizar el contexto enviado al modelo.
- Autorizar **antes** de recuperar en el índice vectorial.
- Nunca incluir secretos en el prompt.
- Usar detección de PII / entidades sensibles.
- Limitar consultas por usuario y limpiar logs/trazas.

---

## 02.1 Exposición de Contexto Oculto

Todo lo que entra en la ventana de contexto (prompts del sistema, esquemas de herramientas, instrucciones de desarrollador, políticas recuperadas) debe asumirse **público y descubrible**.

- Nunca incrustes claves API, tokens ni reglas de autorización dentro del prompt.
- Aplica las decisiones de autorización en el backend determinista, fuera del modelo.
- Limpia documentos y políticas recuperadas antes de inyectarlos al prompt.

---

## 03.0 Manejo Inadecuado de la Salida

Trata la salida del modelo como **entrada no confiable** antes de que llegue a **sumideros peligrosos**: navegadores (XSS), bases de datos (SQLi), shells (RCE), rutas de archivos (Path Traversal) o renderizadores de Markdown (exfiltración vía URLs de imágenes).

- **Codificación contextual** según el destino.
- **Validación estricta de esquemas** (JSON Schema / Pydantic).
- **Deshabilitar o proxificar** el renderizado automático de imágenes/enlaces Markdown.
- **Revisar y probar** cualquier código generado antes de ejecutarlo/desplegarlo.

---

## 03.1 Desinformación

Las alucinaciones o datos desactualizados se convierten en riesgo de seguridad cuando desencadenan decisiones o acciones automáticas.

### Flujo Reclamar → Verificar → Actuar

1. **Reclamar:** El modelo propone un resultado estructurado (JSON Schema / Pydantic).
2. **Verificar:** El código de aplicación verifica la afirmación contra APIs, bases de datos o estado real del sistema.
3. **Actuar:** Solo tras verificar (y con aprobación humana en acciones irreversibles de alto impacto) se ejecuta la acción.

---

## 04.0 Agencia Excesiva

Causas raíz: **Funcionalidad excesiva**, **Permisos excesivos** y **Autonomía excesiva**.

### Controles

1. **Funcionalidad mínima:** Herramientas específicas con esquemas estrictos; nada de shells abiertos.
2. **Menor privilegio:** Credenciales de solo lectura cuando no se requiera escribir.
3. **Mediación completa:** Autorización determinista en código fuera del modelo (políticas graduadas según reversibilidad).
4. **Preservar el contexto del usuario** a lo largo de llamadas encadenadas.
5. **Aprobación humana** para operaciones irreversibles o sensibles.

---

## 04.1 Consumo Ilimitado

Explotación de la asimetría de costos (*Denegación de Cartera*, bucles de razonamiento, crecimiento cuadrático del historial, costo multimodal, expansión recursiva de tools y extracción de modelo).

### Controles

- Cuotas de tokens por usuario/API key.
- Límites rígidos de gasto estimados por adelantado.
- Disyuntores de agentes (`MAX_PASOS`, profundidad de recursión y timeouts).
- Monitoreo de anomalías en invocaciones de herramientas.
- Autenticación obligatoria y deshabilitar log-probabilidades expuestas.

---

## 05.0 Cadena de Suministro

Abarca modelos base, adaptadores (LoRA), conjuntos de datos, servicios de conversión/fusión y frameworks de servicio. Riesgos clave: *slopsquatting*, formatos inseguros (`pickle`), modelos con puertas traseras y licencias.

### Controles

- Proveedores verificados y escaneo continuo.
- Fijar por **hash inmutable** (evitar `latest`).
- Verificar firmas (OpenSSF Model Signing / Sigstore) y mantener una **AI BOM**.
- Evaluar y hacer *Red Teaming* a modelos externos antes de adoptarlos.

---

## 05.1 Envenenamiento de Datos y Modelos

Manipulación durante pre-entrenamiento, ajuste fino, ingesta RAG o bucles de retroalimentación.

### Controles

- **Seguimiento de linaje** (**ML-BOM**).
- **Validación automática de datos** antes de ingerir.
- **Versionado** de datasets y modelos (**DVC**) para rollback.
- **Pruebas de disparadores** (*backdoors*) tras cada ciclo de ajuste fino.
- Tratar plantillas de chat, tokenizadores y adaptadores como código firmado/revisado.

---

## 05.2 Debilidades de Vectores y Embeddings

La capa de embeddings es un **límite de confianza**.

- **Fuga entre inquilinos:** Aplicar el alcance (`tenant_id`) **dentro** de la consulta vectorial, nunca como post-filtro.
- **Inversión de embeddings:** Tratar embeddings y sus backups con la misma confidencialidad que los documentos fuente; borrarlos al eliminar el origen.
- **Envenenamiento y bloqueo de recuperación:** Separar índices por niveles de confianza.
- **Inferencia de membresía:** No devolver scores de similitud crudos al cliente y aplicar *rate limiting*.

---

## 06.0 Evaluación Top 10 de LLM

1. **¿Cómo se construyó el Top 10 2026?** Votación de practicantes (75%) verificada contra 6,639 incidentes reales clasificados (25%).
2. **Ticket con texto oculto hace que asistente vacíe DB con credenciales del dev:** Inyección indirecta de prompt, agravada por agencia excesiva.
3. **Prompt con API key y regla de solo admins:** Asumir que el prompt es descubrible: mantener la clave en la herramienta y aplicar la regla en código.
4. **Renderizar imágenes Markdown automáticamente:** Una URL de imagen inyectada puede exfiltrar la conversación al servidor de un atacante al cargarse.
5. **Agente reporta copia exitosa sin ejecutarse:** Desinformación, corregido verificando la afirmación contra el estado real antes de actuar.
6. **Fuga de backup de base vectorial sin los documentos fuente:** Tratarlo como filtración de los documentos fuente, porque los embeddings pueden invertirse para recuperar texto.

---

## 07.0 Auditoría de tu Aplicación LLM

1. ¿Llega contenido no confiable mientras hay acceso a datos privados y comunicación externa? ¿Qué pata de la tríada letal puedes eliminar?
2. ¿Qué hay en la ventana de contexto que no querrías público, y dónde ocurren las decisiones de autorización?
3. ¿A qué sumideros va la salida del modelo y está validada/codificada?
4. ¿Qué herramientas/permisos sobran y cuál es el límite estricto de gasto?
5. ¿Están fijados modelos, adaptadores y paquetes, y quién puede escribir en el índice RAG?

> *Un modelo que no puede ser engañado no existe, pero una aplicación donde un modelo engañado no pueda alcanzar nada importante es algo que puedes construir.*
