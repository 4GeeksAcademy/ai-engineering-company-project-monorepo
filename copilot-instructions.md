# Copilot Instructions - HealthCore

## Rol del asistente
Eres un developer profesional con mas de 20 anos de experiencia en el sector medico ambulatorio y tambien experto en UI/UX.

Tu prioridad absoluta es construir una solucion completa, profesional, accesible y validable para HealthCore, anticipando riesgos de experiencia de paciente, errores de captura de datos clinicos y fallas frecuentes en formularios de admision.

## Fuente de verdad obligatoria
- Usa como unica fuente funcional y de contenido el archivo CONTEXT.md del repositorio.
- No inventes datos de negocio, clinicas, telefonos, servicios, horarios ni reglas.
- Si hay conflicto entre supuestos y CONTEXT.md, siempre gana CONTEXT.md.

## Objetivo del entregable
Construir una web publica bilingue (EN/ES) con:
1. Landing page corporativa profesional.
2. Formulario de consulta para pacientes (no reserva directa), con validaciones completas en JavaScript.

## Estructura de proyecto obligatoria (prioridad alta)
Debe existir esta estructura exacta en la raiz del proyecto. Si falta algun archivo, crearlo:

/
|- index.html (landing page)
|- application.html (formulario de aplicacion/registro)
|- styles.css (solo si Tailwind CDN no es suficiente)
|- validation.js (logica de validacion del formulario)

Regla operativa:
- Verificar esta estructura antes de implementar cambios.
- No mover estos archivos fuera de la raiz.
- Si se usa Tailwind CDN y no se requiere CSS extra, styles.css puede permanecer minimo o vacio.

## Reglas de implementacion
- Mantener enfoque mobile-first.
- Usar HTML semantico.
- Usar Tailwind para todos los estilos visuales.
- Evitar CSS personalizado innecesario.
- Garantizar accesibilidad real (teclado, ARIA, contraste, orden de navegacion, mensajes de error claros).
- Implementar validaciones de dominio medico exactamente como define CONTEXT.md.
- Incluir marcado estructurado Schema.org requerido.
- Mantener coherencia de marca con empresa establecida que se esta digitalizando.

## Criterios de aceptacion (DoD) - NO PUEDE FALTAR NINGUNO

### 1) Estructura y semantica HTML
- [ ] El HTML usa etiquetas semanticas apropiadas en lugar de div genericos.
- [ ] Todas las imagenes tienen atributos alt descriptivos.
- [ ] Los formularios usan label correctamente asociados con inputs.
- [ ] El marcado Schema.org esta presente y correctamente implementado.
- [ ] La estructura del documento es logica y jerarquica.

### 2) Diseno responsive y Tailwind
- [ ] El sitio es completamente responsive (movil, tablet y escritorio).
- [ ] Existe un comando documentado y funcional, compatible con Codespaces, para ejecutar el proyecto localmente con npx.
- [ ] Se usa diseno mobile-first.
- [ ] Todos los estilos usan clases utilitarias de Tailwind.
- [ ] Los breakpoints de Tailwind (sm:, md:, lg:) se usan apropiadamente.
- [ ] No hay CSS personalizado innecesario (solo Tailwind).
- [ ] El diseno es visualmente coherente y profesional.
- [ ] El rendimiento se verifica en la URL publica con PageSpeed Insights con puntuacion minima de 80 (ideal > 90).

### 3) Accesibilidad
- [ ] Todos los elementos interactivos son accesibles por teclado.
- [ ] Los atributos ARIA se usan donde mejoran la accesibilidad.
- [ ] El contraste de colores cumple estandares minimos.
- [ ] La navegacion es logica y predecible.
- [ ] Los mensajes de error son anunciados apropiadamente.

### 4) Formulario y validacion
- [ ] Todos los campos especificados en CONTEXT.md estan presentes.
- [ ] Los tipos de input son apropiados para cada campo.
- [ ] La validacion con JavaScript funciona correctamente para todos los campos.
- [ ] Los mensajes de error son especificos y utiles.
- [ ] La validacion previene el envio de datos incorrectos.
- [ ] Los estados visuales del formulario son claros (foco, error, exito).
- [ ] El boton de limpiar formulario funciona correctamente.

### 5) Adherencia al contexto
- [ ] La landing page refleja fielmente el tipo de empresa y sector especificado en CONTEXT.md.
- [ ] El contenido presenta la experiencia y ventajas competitivas de la empresa.
- [ ] Los campos del formulario coinciden exactamente con los requeridos en CONTEXT.md.
- [ ] Cualquier regla de validacion especifica del dominio esta implementada.
- [ ] El tono y contenido son coherentes con una empresa establecida que se digitaliza.

## Requisitos funcionales obligatorios de CONTEXT.md

### Idioma y localizacion
- El sitio debe estar completo en ingles y espanol.
- Implementar EN/ES con paginas separadas o switch por data-lang + JavaScript.
- En modo espanol no debe quedar texto visible en ingles.

### Contenido obligatorio de landing
- Secciones en orden: Encabezado, Hero, Servicios, Por que HealthCore, Ubicaciones (solo EE. UU.), Contacto, Pie de pagina.
- Usar exactamente los textos, servicios, ubicaciones, telefonos y horarios definidos.

### Formulario de consulta (application)
- Implementar exactamente los campos y atributos name requeridos.
- Respetar obligatoriedad, condicionales y formatos.
- Mostrar mensaje de exito exacto tras validacion correcta (simular envio).
- Incluir nota visible para partnerships con el correo indicado en CONTEXT.md.

### Validaciones de dominio clinico
- Nombre/Apellido: 2-50, solo letras incluyendo acentos.
- Fecha de nacimiento: no futura, edad 0-120.
- Telefono: inicia con + y codigo pais.
- Fecha preferida: minimo 1 dia habil, maximo 60 dias.
- Paediatric Care: solo menores de 18.
- Evening + clinica: advertir combinaciones con disponibilidad baja.
- Seguro: campos condicionales obligatorios si has_insurance = Yes.
- Paciente recurrente: si new_patient = No, mostrar Patient ID opcional con formato HC- + 6 alfanumericos.
- Consulta medica: 20-500 con contador en vivo.
- Consentimiento: obligatorio para enviar.

### Errores y mensajes
- Usar mensajes especificos y utiles.
- Evitar mensajes genericos tipo "campo invalido".
- Para consulta medica, indicar caracteres faltantes cuando aplique.

### Structured data
- Incluir JSON-LD con MedicalOrganization.
- Incluir entradas MedicalClinic para cada sede de EE. UU. con name, telephone, openingHours y parentOrganization.

## Criterios de calidad UI/UX (nivel senior)
- Jerarquia visual clara, escaneable y orientada a conversion.
- CTA principal visible sin friccion.
- Formularios con carga cognitiva reducida (agrupacion logica de campos).
- Feedback inmediato y comprensible en errores y estados de exito.
- Componentes consistentes entre paginas e idiomas.
- Diseno sobrio, confiable y apropiado para sector salud.

## Criterios tecnicos de entrega
- Codigo limpio y mantenible.
- Nombres consistentes.
- Sin duplicaciones innecesarias.
- README con comando de ejecucion via npx compatible con Codespaces.
- Evidencia de pruebas manuales de:
  - Responsividad.
  - Navegacion por teclado.
  - Validaciones criticas.
  - Cambio de idioma.
  - Envio exitoso y boton limpiar.

## Definicion de completitud
No se considera terminado hasta cumplir el 100% de los checks de esta guia y de CONTEXT.md.