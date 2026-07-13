# SYSTEM PROMPT: Hito 1 — Sitio Web Público y Formulario
Eres un asistente de desarrollo experto. Tu objetivo es generar código que cumpla al 100% con los criterios de evaluación de este proyecto. Toca el menor número de archivos posible y entrega código directo sin explicaciones redundantes.

## 1. Arquitectura y Entorno
- **Archivos permitidos y obligatorios:**
  - `index.html` (Landing)
  - `application.html` (Formulario)
  - `nexova-departamentos-panel.html` (Dashboard Principal)
  - `validation.js` (Lógica de formulario)
  - `admin/admin.js` (Lógica del módulo de Scoring IA)
  - `admin/tickets.js` (Lógica del módulo de Ticketing IA)
- **Prohibición:** NO modifiques el archivo `CONTEXT.md`.
- **Ejecución:** El código debe ser compatible para ejecutarse localmente y en Codespaces mediante `npx http-server . -p 3000 -a 0.0.0.0`.
- **Arquitectura de Panel:** El `nexova-departamentos-panel.html` funciona como una Single-Page Application (SPA). La navegación lateral debe mostrar/ocultar los `article` de cada departamento, no recargar la página.

## 2. Reglas de Negocio y Tono (Adherencia al CONTEXT.md)
- **Lectura obligatoria:** Debes basar todo el contenido, campos, IDs, tipos de datos y validaciones específicas en el archivo `CONTEXT.md`. Se rechazarán implementaciones genéricas.
- **Tono Comercial:** La web debe reflejar a una empresa tradicional, consolidada y con experiencia en su sector que está dando su primer paso hacia la transformación digital. Tono profesional, coherente y orientado a la conversión.

## 3. Estructura y Semántica HTML (index.html y application.html)
- **Prohibido el abuso de `<div>`:** Usa jerarquía lógica y landmarks semánticos obligatorios (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- **Landing Page (`index.html`):**
  - `<header>` con logo/nombre de empresa y navegación lógica.
  - Sección Hero (propuesta de valor).
  - MÍNIMO dos (2) secciones adicionales (características, beneficios, cómo funciona o experiencia).
  - `<footer>` con información de contacto.
  - Enlace/botón destacado que dirija a `application.html`.
- **Formulario (`application.html`):**
  - Usa `<fieldset>` y `<legend>` para agrupar campos relacionados.
  - Cada campo debe tener su `<label>` asociado mediante el atributo `for`.
  - Usa los tipos de input precisos (`email`, `tel`, `date`, `number`, etc.) y marca los obligatorios con `required`.
  - Debe incluir un botón de envío principal y un botón secundario funcional para limpiar el formulario.

## 4. Diseño, Tailwind CSS y Rendimiento
- **Estricto Mobile-First:** El diseño debe empezar para móvil y escalar progresivamente a tablet y escritorio usando exclusivamente los breakpoints nativos de Tailwind (`sm:`, `md:`, `lg:`).
- **Solo Tailwind:** Aplica estilos usando únicamente clases utilitarias de Tailwind CSS. No debe haber CSS personalizado innecesario.
- **Rendimiento:** El código no debe bloquear el renderizado. El objetivo es superar una puntuación de 80 (ideal >90) en PageSpeed Insights. Cero scroll horizontal en dispositivos móviles.

## 5. Accesibilidad (A11Y) y SEO Avanzado
- **Imágenes:** Todas deben tener el atributo `alt` descriptivo.
- **Teclado y Contraste:** Todos los elementos interactivos deben ser accesibles por teclado (foco visible y orden de tabulación coherente). El contraste de colores debe cumplir los estándares mínimos.
- **ARIA:** Implementa atributos ARIA (`aria-label`, `role`) solo donde mejoren la accesibilidad real.
- **SEO/Schema.org:** Inyecta marcado estructurado de Schema.org en el `<head>` (tipo `Organization` o `LocalBusiness`) reflejando los datos del `CONTEXT.md`.

## 6. Lógica de Validación (validation.js)
- **Validación en Tiempo Real:** Valida mediante JavaScript Vanilla nativo mientras el usuario escribe (`input`) o al perder el foco (`blur`).
- **Estados Visuales y UX:** - Estiliza claramente con Tailwind los estados del formulario: foco, error y éxito.
  - Los mensajes de error deben ser específicos y útiles (PROHIBIDO usar textos genéricos como "campo inválido").
  - **Accesibilidad en errores:** Los mensajes de error deben ser anunciados apropiadamente por lectores de pantalla (ej. usando `aria-live` o referencias `aria-describedby`).
- **Control de Flujo:**
  - Previene el envío del formulario si hay errores de validación.
  - Si la validación es 100% correcta, muestra un mensaje de éxito claro (simulación de envío).
  - El botón de limpiar debe resetear tanto los valores como todos los estados visuales de error/éxito en el DOM.

## 7. [Módulo Específico] Panel de Selección y Scoring IA
**Contexto:** Interfaz administrativa donde los consultores visualizan el ranking automatizado de candidatos. **Este módulo se renderiza dentro de `nexova-departamentos-panel.html`**.

**Reglas de Interfaz y Datos (Frontend Mockeado):**
- **Arquitectura Visual:** Layout tipo Dashboard profesional (Sidebar lateral de navegación y área central de contenido). Diseño limpio, denso en información pero fácil de escanear.
- **Estructura de Datos:** Al operar solo en frontend por ahora, el archivo `.js` debe generar un array simulado (`mock`) de candidatos con los campos: `id`, `nombre`, `puesto_aplicado`, `score_ia` (0-100), `skills_clave` (array) y `razonamiento_corto` (string).
- **Lógica de Renderizado (Vanilla JS):**
  - Generar dinámicamente las tarjetas (Cards) o filas de tabla inyectando el HTML desde JavaScript.
  - Ordenar por defecto el array de candidatos de mayor a menor `score_ia`.
- **Diseño Condicional (Tailwind CSS v4):**
  - Implementar semaforización visual estricta para el score utilizando clases utilitarias: Verde para puntuaciones >= 80, Amarillo para 50-79, y Rojo para < 50.
  - Las tarjetas deben incluir un componente desplegable (Accordion/Details) manejado con Vanilla JS para mostrar el `razonamiento_corto`.
  - Cada tarjeta debe incluir botones de contacto funcionales (mailto, tel, WhatsApp).
- **Restricciones:** Prohibido usar librerías de tablas dinámicas o frameworks reactivos. Manipulación directa y limpia del DOM.

## 8. [Módulo Específico] Atención al Cliente y Triaje Inteligente (Ticketing)
**Contexto:** Interfaz dual: Chatbot para filtrado y Panel de Agentes con vista master/detail. **Este módulo completo se renderiza dentro de `nexova-departamentos-panel.html`**.

**Reglas de Interfaz y Datos (Frontend Mockeado):**
- **Arquitectura Visual (Chatbot):** Ventana flotante de chat con scroll automático, input de texto y botón de envío.
- **Arquitectura Visual (Panel de Agentes - Master/Detail):**
  - **Vista Principal (Master):** Layout tipo Kanban o Tabla (usando Grid/Flex de Tailwind) listando los tickets activos.
  - **Vista de Detalle (Detail):** Un Modal (`position: fixed`) se oculta por defecto y se muestra al hacer clic en un ticket. Este modal debe crearse dinámicamente si no existe en la página, para asegurar su funcionamiento en cualquier vista.
- **Estructura de Datos Simulada (Vanilla JS):**
  - **Estado del Chat:** Flujo de conversación (Saludo -> Filtrado -> Escalado).
  - **Tickets Generados (Mock):** Objetos expandidos con `ticket_id`, `fecha`, `cliente_info` (nombre, email), `nivel_gravedad` (Alta/Media/Baja), `resumen_problema`, `historial_transcripcion` (array del chat previo con el bot) y `estado`.
- **Lógica de Renderizado y UX:**
  - **Chatbot:** Diferenciación visual de burbujas. Simulación de procesamiento de IA con `setTimeout` y estado "Escribiendo...". Al escalar, agregar el ticket dinámicamente al array del panel.
  - **Interacción del Listado:** Agregar `addEventListener('click')` a las filas/tarjetas del listado. Al accionar, inyectar dinámicamente los datos del objeto (incluyendo la transcripción completa) en el DOM de la Vista de Detalle y hacerla visible (`classList.toggle`).
  - **Botonera de Acciones Operativas (Vista de Detalle):** La vista expandida DEBE incluir una sección de acciones rápidas (Contactar, Videollamada, Invitar) y un **chat de seguimiento** para continuar la conversación si el ticket está abierto.
  - **Diseño Condicional (Tailwind CSS v4):** Etiquetas de severidad claras (Rojo/Alta, Amarillo/Media, Verde/Baja).
  - **Restricciones:** Uso estricto de manipulación nativa del DOM (`document.getElementById`, `innerHTML`, `classList`). Prohibido introducir librerías de componentes (ni Headless UI, ni Radix). Todo se hace con HTML y Tailwind puro.


# Hito 2: Desarrollando scripts para automatizar tareas
# El Desafío

📌 **Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

Ya tienes la web pública de tu empresa funcionando con formularios y validaciones básicas. Ahora tu equipo técnico necesita que construyas las primeras funcionalidades internas que harán que el negocio opere de forma más eficiente.

Tu gerente te ha asignado implementar un conjunto de utilidades de procesamiento de datos que el equipo necesita para el día a día. No se trata de una interfaz completa todavía — eso vendrá después — sino de las funciones base que permitirán gestionar, filtrar, ordenar y transformar la información crítica del negocio. Piensa en esto como la capa lógica que otros sistemas utilizarán más adelante.

Estas utilidades deben estar escritas en TypeScript, ser reutilizables, estar correctamente tipadas y poder ejecutarse tanto en el navegador como en entornos de desarrollo. El énfasis está en dominar la manipulación de datos estructurados: colecciones, objetos, búsquedas, ordenamientos y transformaciones.

---

## 📋 Lo que te piden construir

Tu tech lead te envía el siguiente brief por correo:

> **De:** Tech Lead
> **Para:** Tú
> **Asunto:** Funcionalidades base para procesamiento de datos
>
> Hola,
>
> Necesitamos que implementes un conjunto de funciones TypeScript que nos permitan manejar de forma eficiente los datos principales de la empresa. El objetivo es tener utilidades sólidas y bien tipadas que podamos reutilizar en múltiples contextos.
>
> Lo que necesitamos:
>
> * **Sistema de gestión de colecciones:** Funciones para filtrar, ordenar, buscar y agrupar elementos dentro de arrays. Debes implementar búsqueda lineal para arrays desordenados y búsqueda binaria para arrays ordenados. Asegúrate de manejar correctamente casos vacíos y elementos no encontrados.
> * **Modelado de datos con objetos e interfaces:** Define las interfaces TypeScript que representan las entidades principales del negocio. Cada interfaz debe tener tipos explícitos para todas sus propiedades y métodos auxiliares para trabajar con esos datos. Usa objetos literales para representar instancias concretas.
> * **Transformaciones y agregaciones:** Implementa funciones que tomen colecciones de objetos y generen reportes simples: contar elementos por categoría, sumar valores numéricos, encontrar máximos y mínimos, calcular promedios. Todo debe estar tipado.
> * **Validaciones de negocio:** Crea funciones que validen que los datos cumplan con las reglas específicas de tu empresa antes de ser procesados o almacenados. Por ejemplo, verificar que un elemento tenga todos los campos obligatorios, que los valores numéricos estén dentro de rangos permitidos, o que las fechas sean coherentes.
>
> El código debe ser limpio, con nombres descriptivos, y cada función debe tener una sola responsabilidad. Queremos que esto sea mantenible a largo plazo.
>
> Revisa el documento de contexto de tu empresa para conocer exactamente qué entidades modelar, qué validaciones aplicar y qué reportes generar.
>
> Saludos,
> Tech Lead

---

## 💡 Qué debes saber antes de empezar

Este hito se enfoca exclusivamente en lógica de programación y manipulación de datos con TypeScript. Se recomienda que intentes resolver este desafío sin ayuda de IA o, en su defecto, con un uso mínimo de ella, para fortalecer tus habilidades de pensamiento lógico, analítico y de resolución de problemas, fundamentales para cualquier programador.

**Conceptos clave que aplicarás:**

*   **Arrays y matrices:** Cómo almacenar, recorrer, ordenar y buscar elementos en colecciones.
*   **Búsqueda lineal vs búsqueda binaria:** Cuándo usar cada una y cómo implementarlas correctamente.
*   **Interfaces y objetos literales:** Cómo modelar datos del mundo real en TypeScript con tipos explícitos.
*   **Funciones puras:** Escribir funciones que solo trabajen con lo que reciben por parámetros, sin depender de variables globales.
*   **Transformaciones funcionales:** Uso de `.map()`, `.filter()`, `.reduce()` y otros métodos de arrays para transformar datos sin bucles explícitos.
*   **Validaciones:** Cómo escribir funciones que verifiquen que los datos cumplen reglas de negocio antes de procesarlos.

**Estructura de archivos esperada:**

Tu implementación debe organizarse en archivos TypeScript separados por responsabilidad:

```text
src/
├── types/
│   └── models.ts          # Interfaces y tipos
├── utils/
│   ├── collections.ts     # Funciones para arrays
│   ├── search.ts          # Búsquedas lineal y binaria
│   ├── transformations.ts # Agregaciones y reportes
│   └── validations.ts     # Validaciones de negocio
└── index.html             # Página de prueba (opcional)


## Lo que Debes Hacer

Implementa las siguientes funcionalidades en TypeScript. Todos los nombres de entidades, campos y reglas deben coincidir exactamente con lo especificado en tu CONTEXT.md.

## Backend / Lógica

- [ ] Define las **interfaces TypeScript** para todas las entidades principales de tu empresa especificadas en tu `CONTEXT.md`
- [ ] Implementa funciones de **filtrado** que permitan buscar elementos por uno o más criterios (por ejemplo: filtrar por categoría, por rango de precio, por estado)
- [ ] Implementa funciones de **ordenamiento** que ordenen arrays según diferentes criterios (ascendente, descendente, por múltiples campos)
- [ ] Implementa **búsqueda lineal** para encontrar elementos en arrays desordenados
- [ ] Implementa **búsqueda binaria** para encontrar elementos en arrays previamente ordenados
- [ ] Crea funciones de **agregación** que generen reportes: contar elementos por categoría, calcular totales, promedios, máximos y mínimos
- [ ] Implementa **validaciones de negocio** que verifiquen que los objetos cumplen con las reglas de tu `CONTEXT.md` antes de ser procesados
- [ ] Todas las funciones deben tener **tipos explícitos** en parámetros y valores de retorno
- [ ] El código debe seguir el principio de **responsabilidad única**: cada función hace una sola cosa
- [ ] El proyecto incluye un comando claro para validar o ejecutar el código TypeScript durante el desarrollo

⚠️ **IMPORTANTE:** Los nombres de campos, tipos de entidades y reglas de validación en tu implementación deben coincidir exactamente con lo especificado en tu `CONTEXT.md`. Una implementación genérica que ignore el contexto no será aceptada.

## Frontend / Pruebas (Opcional)

- [ ] Crea una página HTML simple con **Tailwind CSS** que te permita probar tus funciones manualmente
- [ ] Incluye botones o controles para ejecutar diferentes operaciones (filtrar, buscar, ordenar, generar reportes)
- [ ] Muestra los resultados de las operaciones en la interfaz de forma clara

Si agregas una página `index.html` para probar tus funciones manualmente, asegúrate de poder servirla en local o en Codespaces con un comando simple como:

## Calidad de Código

- [ ] Usa **nombres descriptivos** para variables, funciones e interfaces (camelCase para variables y funciones, PascalCase para interfaces)
- [ ] Cada función debe ser **pura**: trabaja solo con lo que recibe por parámetros, sin modificar variables globales
- [ ] Escribe **comentarios** solo cuando sea necesario para explicar lógica compleja, no para describir código obvio
- [ ] Maneja correctamente **casos vacíos**: arrays vacíos, elementos no encontrados, valores nulos
- [ ] Usa **const** por defecto y **let** solo cuando el valor vaya a cambiar
- [ ] Mantén la **indentación** y el formato consistentes en todo el código

## ✅ Lo que Evaluaremos

### Corrección técnica

- [ ] Las interfaces TypeScript modelan correctamente las entidades especificadas en el CONTEXT.md con todos sus campos y tipos
- [ ] Las funciones de filtrado devuelven correctamente los elementos que cumplen los criterios especificados
- [ ] El ordenamiento funciona correctamente en orden ascendente y descendente
- [ ] La búsqueda lineal encuentra elementos en arrays desordenados sin errores
- [ ] La búsqueda binaria funciona correctamente en arrays ordenados y devuelve el índice correcto o -1 si no se encuentra
- [ ] Las agregaciones calculan correctamente totales, promedios, conteos y valores extremos
- [ ] Las validaciones rechazan datos que no cumplen con las reglas de negocio del CONTEXT.md
- [ ] No hay errores de compilación de TypeScript en ningún archivo
- [ ] Existe un comando documentado para validar o ejecutar TypeScript en local (`npx tsc --noEmit`, `npm run typecheck`, etc.)

### Estructura y organización

- [ ] El código está organizado en archivos separados por responsabilidad (types, utils, validations)
- [ ] Cada función tiene una única responsabilidad claramente identificable
- [ ] Los nombres de variables, funciones e interfaces son descriptivos y siguen las convenciones de TypeScript

### Adaptación al contexto

- [ ] Todos los nombres de entidades, campos y tipos coinciden exactamente con los especificados en el CONTEXT.md
- [ ] Las validaciones implementadas corresponden a las reglas de negocio definidas en el CONTEXT.md
- [ ] Los reportes generados responden a las necesidades específicas descritas en el CONTEXT.md

### Calidad de código

- [ ] Las funciones son puras: no dependen de variables externas ni modifican estado global
- [ ] Se manejan correctamente casos límite: arrays vacíos, elementos no encontrados, valores nulos
- [ ] El código sigue las mejores prácticas de TypeScript: tipos explícitos, uso de const/let apropiado, evita any