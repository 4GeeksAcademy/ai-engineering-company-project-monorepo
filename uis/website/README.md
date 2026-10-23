# Nexova — Sitio web público

Sitio web corporativo estático de Nexova Solutions, con una landing informativa y un formulario académico de registro de talento. El idioma base de la experiencia es español.

> **Demostración académica:** el formulario solo simula el envío en el navegador. No transmite ni almacena datos. No introducir información personal real.

## Contexto de Nexova

Nexova es una consultora de recursos humanos y adquisición de talento fundada en 2011, con sede en Valencia y una oficina de expansión en Miami. Sus líneas de negocio incluyen headhunting, outsourcing de atención al cliente y formación corporativa. Los datos y afirmaciones empresariales publicados en la web proceden del briefing del proyecto; no constituyen una verificación independiente.

## Objetivo del Hito 1

Presentar los servicios y la propuesta de valor de Nexova mediante una web responsive y accesible, y permitir que profesionales interesados describan su perfil para oportunidades actuales o futuras. La experiencia ofrece validación en el cliente y una confirmación simulada; no implementa un backend ni un proceso real de recepción de candidaturas.

## Tecnologías

- HTML5 semántico en páginas estáticas.
- Tailwind CSS v4 Browser CDN, cargado desde jsDelivr en ambas páginas. Requiere Internet en el navegador y está orientado a prototipos/desarrollo, no a una compilación optimizada de producción.
- JavaScript vanilla en `validation.js`; no se usa framework frontend.
- `<dialog>` nativo para la confirmación del formulario.
- No hay dependencias de aplicación declaradas ni proceso de build propio para este sitio.

## Estructura

```text
uis/website/
├── index.html                 # Landing corporativa y Schema.org Organization
├── application.html            # Registro académico de talento
├── validation.js               # Validación y comportamiento del formulario/modal
├── images/
│   ├── nexova-team.webp        # Imagen local del hero
│   └── README.md               # Procedencia y licencia de la imagen
└── README.md                   # Esta guía
```

## Landing (`index.html`)

- Header con marca y navegación a Inicio, Servicios, Talento y Contacto.
- Hero con el titular, subtítulo y CTA del briefing; el CTA abre `application.html`.
- Tres servicios: Headhunting Ejecutivo, Outsourcing de Atención al Cliente y Formación Corporativa.
- Sección «Por qué Nexova» con experiencia, presencia regional, procesos y especialización sectorial.
- Contacto por email y teléfonos de Valencia y Miami.
- Footer con copyright y enlaces a LinkedIn e Instagram.
- Imagen WebP local con texto alternativo y dimensiones declaradas.
- Datos estructurados JSON-LD de tipo `Organization`, según el briefing.

## Formulario (`application.html`)

Incluye los once campos requeridos. Los campos obligatorios están señalados en la interfaz.

| Campo                           | Tipo          | Requisito/validación                                                        |
| ------------------------------- | ------------- | --------------------------------------------------------------------------- |
| Nombre completo                 | Texto         | Obligatorio; al menos dos palabras.                                         |
| Email                           | Email         | Obligatorio; formato con usuario, dominio y extensión.                      |
| Teléfono                        | Teléfono      | Obligatorio; código internacional iniciado por `+` y número.                |
| País de residencia              | Selector      | Obligatorio: España, Estados Unidos u Otro.                                 |
| Años de experiencia             | Número entero | Obligatorio; de 0 a 50 inclusive.                                           |
| Sector de interés               | Selector      | Obligatorio: Tecnología, Retail, Servicios Financieros, Consultoría u Otro. |
| Nivel de inglés                 | Selector      | Obligatorio: Básico, Intermedio, Avanzado o Nativo.                         |
| Disponibilidad                  | Radio         | Obligatoria: Inmediata, 1 mes, 2-3 meses o Solo explorando.                 |
| LinkedIn                        | URL           | Opcional; si se completa, requiere URL HTTP o HTTPS válida.                 |
| Comentarios adicionales         | Área de texto | Opcional; máximo 500 caracteres y contador visible.                         |
| Aceptación de política de datos | Casilla       | Obligatoria para completar la simulación.                                   |

Los errores se muestran junto a los campos, relacionados mediante `aria-describedby`; los controles inválidos reciben `aria-invalid`. Al intentar enviar, se validan los campos en orden y se enfoca el primer campo inválido. El código de validación y sus mensajes se encuentran en `validation.js`.

### Confirmación y envío simulado

Si la validación es correcta, el formulario evita el envío convencional y abre un `<dialog>` nativo con el mensaje de agradecimiento. No hay llamada a API, correo, integración ni persistencia de datos.

- **Aceptar:** cierra el diálogo, limpia el formulario y vuelve el foco al campo de nombre.
- **Escape:** cierra el diálogo sin borrar los valores.

El formulario informa que es una demostración académica y que la información no se envía ni almacena. También orienta a las empresas que busquen talento a escribir a `contacto@nexova.com`.

## Ejecutar localmente

Desde la raíz del monorepo, ejecuta el comando solicitado:

```bash
npx http-server ./uis/website -p 3000 -a 0.0.0.0
```

La primera ejecución puede requerir acceso a npm para obtener `http-server`. Este README no añade ni declara esa herramienta como dependencia del proyecto. El servidor expone el sitio en el puerto 3000; en Codespaces, reenvía ese puerto desde la pestaña **Ports** y usa la URL que proporciona VS Code.

- Landing: `http://localhost:3000/` o `http://localhost:3000/index.html`
- Registro: `http://localhost:3000/application.html`

Detén el servidor con `Ctrl+C` en la terminal.

## Accesibilidad, responsive y SEO

- Estructura semántica con `header`, `nav`, `main`, `section`, `form` y `footer`; enlaces de salto al contenido y navegación con nombres accesibles.
- Labels asociados a los campos, instrucciones y errores relacionados, regiones `aria-live` para errores y controles con estados accesibles.
- Foco visible, controles de tamaño cómodo, iconografía decorativa oculta a tecnologías de asistencia y diálogo con título/descripción accesibles.
- Diseño adaptable mediante utilidades responsive de Tailwind CSS.
- Cada página declara idioma, viewport, título y descripción propios. La landing incorpora JSON-LD `Organization`.
- Estos elementos describen la implementación; no representan una auditoría WCAG, de buscadores ni una puntuación Lighthouse certificada.

## Verificaciones manuales

No se mantiene un runner de pruebas automatizadas para esta web estática. Para comprobarla manualmente en navegador, abre ambas páginas desde el servidor local y verifica:

1. Navegación entre landing y registro, anclas internas y enlaces de contacto.
2. Diseño en móvil y escritorio, carga de Tailwind con conexión a Internet y carga de la imagen.
3. Envío vacío y valores inválidos: mensajes, `aria-invalid` y foco del primer error.
4. Envío válido con datos ficticios: apertura del diálogo; **Aceptar** limpia y devuelve el foco; **Escape** conserva los valores.
5. Contador y límite de comentarios, y opción de limpiar el formulario.
6. Que no se produzcan peticiones de envío de formulario ni se guarden datos.
7. Navegación completa por teclado, foco visible y lectura con tecnología de asistencia.

No se declaran aquí resultados de Lighthouse, navegador, validador W3C ni pruebas manuales que no se hayan ejecutado en la revisión actual. Para producción habría que sustituir el CDN de navegador por un proceso de compilación apropiado, definir una política real de privacidad y diseñar de forma explícita cualquier recepción segura de datos.

## Autoría

**Joaquín Rengifo**\
**4Geeks Academy — AI Engineering**
