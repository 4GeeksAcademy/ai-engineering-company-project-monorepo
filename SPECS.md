# SPECS.md - AgentHub

## A. Descripcion del producto

### Que es AgentHub
AgentHub es un panel administrativo web para supervision ejecutiva de operaciones en Nexova. Centraliza indicadores, alertas, actividades y acciones operativas en una sola interfaz para que la direccion ejecutiva pueda tomar decisiones rapidas con datos actualizados.

### Quien es el usuario administrador
El usuario administrador principal es Laura Mendoza (CEO). Tambien puede incluir directores de area y managers con permisos de lectura, filtros y acciones operativas sobre modales, dropdowns y componentes de monitoreo.

## B. Stack tecnologico y restricciones

- HTML semantico como estructura principal de la interfaz.
- Tailwind CSS cargado unicamente via CDN para estilos.
- JavaScript vanilla para toda la logica interactiva (sin TypeScript en la UI final del examen).
- Sin frameworks frontend (React, Vue, Angular, Svelte, etc.).
- Sin backend ni APIs reales; datos hardcodeados en el frontend.

## C. Especificaciones por seccion (6 secciones)

### 1) Sidebar de navegacion
1. Componente: Sidebar lateral fija.
   Contenido: Logo AgentHub, nombre del modulo activo y lista de enlaces (Dashboard, Alertas, Reportes, Skills, Configuracion).
   Comportamiento visual/interactivo: En desktop permanece fija a la izquierda; en mobile se oculta fuera de pantalla y se muestra con animacion de desplazamiento desde la izquierda mediante boton hamburguesa.
2. Componente: Grupo de navegacion con items.
   Contenido: Cada item incluye icono, etiqueta y estado activo.
   Comportamiento visual/interactivo: El item activo usa fondo de alto contraste, borde izquierdo de acento y tipografia semibold; hover con transicion suave de color y sombra ligera.
3. Componente: Footer de sidebar.
   Contenido: Avatar del administrador, nombre y rol.
   Comportamiento visual/interactivo: En hover muestra tooltip con email; en mobile cambia a layout horizontal compacto para no romper altura util.

### 2) Header superior y controles globales
1. Componente: Header sticky superior.
   Contenido: Titulo de pagina, subtitulo de contexto temporal y bloque de acciones rapidas.
   Comportamiento visual/interactivo: Se mantiene visible al hacer scroll, con efecto de fondo traslucido y blur suave para separar capas visuales.
2. Componente: Dropdown de acciones.
   Contenido: Acciones "Generar reporte semanal", "Exportar KPIs", "Marcar alertas revisadas".
   Comportamiento visual/interactivo: Se abre al click, cierra al click fuera o tecla Escape, y resalta opcion enfocada con navegacion por teclado.
3. Componente: Toggle de modo oscuro.
   Contenido: Switch con iconos sol/luna y etiqueta textual de estado.
   Comportamiento visual/interactivo: Cambia tema claro/oscuro alterando clases en `html` y persiste preferencia en `localStorage`.

### 3) Cuadricula de metricas ejecutivas
1. Componente: Grid responsive 2x2 (desktop) / 1x4 (mobile) con tarjetas de metricas.
   Contenido: Tarjetas para ingresos totales, cumplimiento SLA, tiempo promedio de contratacion y leads generados.
   Comportamiento visual/interactivo: Reordena automaticamente por breakpoints y mantiene altura uniforme entre tarjetas.
2. Componente: Tarjeta de metrica.
   Contenido: Icono, etiqueta, valor hardcodeado y variacion semanal.
   Comportamiento visual/interactivo: Cada tipo usa color de acento distinto (verde, azul, naranja, rojo), sombra sutil y animacion de entrada escalonada al cargar.
3. Componente: Placeholder de grafico.
   Contenido: Un `div` de ancho completo con borde discontinuo y texto "Trend chart placeholder".
   Comportamiento visual/interactivo: Mantiene ratio visual consistente y cambia color de borde segun modo claro/oscuro.

### 4) Seccion de alertas y riesgos
1. Componente: Lista vertical de alertas criticas.
   Contenido: Titulo de alerta, departamento, fecha y severidad.
   Comportamiento visual/interactivo: Orden descendente por criticidad y timestamp; cada fila tiene indicador lateral de color por severidad.
2. Componente: Badge de severidad.
   Contenido: Etiquetas LOW, MEDIUM, HIGH, CRITICAL.
   Comportamiento visual/interactivo: Estilo pill con colores diferenciados y contraste AA para legibilidad.
3. Componente: Boton "Ver detalle" por alerta.
   Contenido: Trigger para modal contextual de la alerta.
   Comportamiento visual/interactivo: Abre modal con foco inicial en titulo, bloquea scroll de fondo y permite cerrar por Escape, click en overlay o boton de cierre.

### 5) Seccion de skills y automatizaciones
1. Componente: Lista de skills colapsable.
   Contenido: Skills agrupadas por categoria (Analisis, Resumen, Alertas, Reportes).
   Comportamiento visual/interactivo: Acordeon expand/collapse con animacion de altura y rotacion de chevron.
2. Componente: Item de skill.
   Contenido: Nombre, descripcion corta y estado (Activo/Inactivo).
   Comportamiento visual/interactivo: Estado activo usa borde/acento visible; click alterna seleccion visual sin recargar.
3. Componente: Panel de detalle de skill.
   Contenido: Explicacion funcional, ultima ejecucion y boton de accion.
   Comportamiento visual/interactivo: Actualiza contenido segun skill seleccionada y mantiene transicion suave de opacidad.

### 6) Seccion de actividad reciente y modal de accion
1. Componente: Timeline de actividad.
   Contenido: Eventos recientes (reportes generados, alertas abiertas, cambios de estado).
   Comportamiento visual/interactivo: Linea vertical con nodos, orden cronologico inverso y chips por tipo de evento.
2. Componente: Modal reutilizable de confirmacion.
   Contenido: Titulo, mensaje, botones Confirmar/Cancelar.
   Comportamiento visual/interactivo: Apertura con fade + scale, foco atrapado dentro del modal y retorno de foco al trigger al cerrar.
3. Componente: Toast de resultado de accion.
   Contenido: Mensaje de exito o error simulado.
   Comportamiento visual/interactivo: Aparece en esquina superior derecha, desaparece automaticamente tras 3 segundos y permite cierre manual.

## D. Inventario de componentes reutilizables

- Sidebar
- Tarjeta de metrica
- Dropdown de acciones
- Modal
- Badge
- Lista de skills colapsable
- Toggle de modo oscuro

## E. Criterios de aceptacion

1. El dropdown de acciones abre/cierra correctamente con click, click fuera y tecla Escape.
2. El modal funcional se puede abrir desde una accion y cerrar por boton, overlay y Escape.
3. El componente colapsable de skills expande/colapsa grupos sin romper el layout responsive.
4. El modo oscuro funcional cambia el tema visual completo y persiste al recargar.
5. La sidebar responde correctamente entre desktop y mobile con navegacion usable.
6. La cuadricula de metricas mantiene legibilidad y jerarquia visual en breakpoints principales.
7. Los badges de severidad reflejan visualmente el nivel de riesgo con contraste adecuado.
8. Todas las interacciones principales son navegables por teclado (tab y enter/space donde aplique).

## F. Reglas de entrega

1. El archivo SPECS.md debe ser commiteado ANTES de comenzar cualquier trabajo en HTML.
2. El contenido de SPECS.md debe usarse para generar una propuesta visual en Google Stitch solo como guia.
3. La propuesta de Google Stitch no reemplaza la entrega final; la entrega final debe implementarse en HTML + Tailwind CDN + JavaScript vanilla.
