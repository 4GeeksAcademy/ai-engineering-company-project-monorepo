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
