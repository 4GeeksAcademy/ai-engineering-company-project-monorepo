# Flujo de trabajo de medición de rendimiento

Utiliza este flujo de trabajo cuando haya una URL ejecutable disponible, el usuario solicite medir el rendimiento o un cambio requiera verificación antes/después.

## Mantener separados los tipos de evidencia

| Evidencia | Qué representa | Mejor uso |
|---|---|---|
| Datos de campo de CrUX | Experiencias agregadas de usuarios reales elegibles de Chrome, normalmente en una ventana móvil de 28 días | Decidir si los usuarios tienen un problema con los Core Web Vitals |
| RUM propio (First-party RUM) | Mediciones recopiladas y reportadas desde las sesiones de los propios usuarios del sitio | Segmentar y diagnosticar la experiencia de producción actual |
| Traza de rendimiento de DevTools | Una sesión de navegador observada bajo condiciones locales o emuladas específicas | Encontrar causas de LCP, INP, CLS, red y bloqueo del hilo principal |
| Ejecución de laboratorio en Lighthouse | Una navegación sintética controlada | Reproducir problemas de carga y prevenir regresiones |
| Inspección estática de código | Problemas potenciales deducidos del código fuente | Plantear hipótesis cuando no se puede ejecutar ninguna página |

El resultado de un `PerformanceObserver` inyectado en una página del navegador es una **observación de laboratorio de una sola sesión**, no un dato de campo. Solo se convierte en RUM cuando las mediciones de usuarios reales se envían y agregan.

## Ruta preferida de baja fricción

Cuando las herramientas del navegador puedan registrar una traza de rendimiento y ejecutar auditorías de Lighthouse, da prioridad a esta vía. Con Chrome DevTools MCP:

1. Navega a la ruta y estado exactos que se van a auditar. Registra si es pública, autenticada, local o de staging.
2. Registra una traza de recarga con parada automática para el rendimiento de carga de página (`performance_start_trace`). Los resúmenes de trazas actuales pueden incluir tanto métricas de laboratorio observadas como métricas de campo de CrUX si este tiene datos elegibles. Registra si el alcance de campo es a nivel de URL o de origen.
3. Analiza únicamente los análisis (*insights*) sospechosos o con fallos relevantes (`performance_analyze_insight`). Ejemplos comunes: `LCPBreakdown`, `LCPDiscovery`, `DocumentLatency`, `RenderBlocking` y `ThirdParties`.
4. Ejecuta la auditoría de Lighthouse (`lighthouse_audit`) para Accesibilidad, SEO, Buenas Prácticas y Navegación Agéntica. Se excluye deliberadamente el rendimiento; no trates esta herramienta como la ruta de rendimiento.
5. Vuelve a ejecutar la misma medición de laboratorio tras aplicar una solución. Los datos de campo no reflejarán un nuevo despliegue de inmediato.

Usa condiciones móviles de forma predeterminada para auditorías de sitios públicos generales. Añade escritorio cuando el usuario lo solicite, el tráfico de escritorio sea significativo o el producto esté orientado a escritorio. Prueba los estados autenticados y no autenticados por separado si renderizan páginas distintas.

Al utilizar emulación, configura explícitamente el viewport, las condiciones de red y la limitación de CPU antes de la traza, confirma las condiciones reportadas y restablécelas antes de probar otro perfil.

El modo de navegación de Lighthouse en Chrome DevTools MCP recarga la página. Utiliza el modo instantánea (*snapshot mode*) para el estado actual cuando una recarga perdería un estado autenticado o creado por el usuario. No ejecutes una auditoría de navegación sobre un formulario sin guardar o un flujo de trabajo destructivo.

### Uso eficiente de herramientas (ahorro de tokens)

* Comienza con una sola traza y una auditoría de Lighthouse en lugar de volcados exhaustivos del DOM, red, consola y código fuente.
* Guarda informes o trazas grandes en archivos temporales si la herramienta admite `filePath` o `outputDirPath`; resume solo los fallos accionables.
* Profundiza en los pocos diagnósticos vinculados a una métrica de campo deficiente o a un cuello de botella de laboratorio reproducible.
* Filtra y pagina peticiones de red o mensajes de consola. Consulta detalles de peticiones individuales solo cuando respalden un hallazgo.
* Toma una instantánea de texto antes de una captura de pantalla a menos que la inspección visual sea imprescindible.

## Alternativas cuando no hay herramientas de DevTools disponibles

Utiliza la primera opción disponible; no bloquees la auditoría esperando configuraciones opcionales.

1. **Lighthouse CLI para datos de laboratorio:** ejecuta la versión de Lighthouse compatible del proyecto contra la URL ejecutable. Conserva el JSON para comparaciones y evita instalar dependencias permanentes a menos que el usuario lo solicite.
2. **Interfaz web de PageSpeed Insights para URLs públicas:** proporciona un análisis sin configuración previa de diagnósticos de laboratorio de Lighthouse y datos de campo de CrUX disponibles.
3. **CrUX Vis para historial:** úsalo cuando los datos de tendencias sean relevantes y la URL u origen califiquen.
4. **API de CrUX o API de Historial para automatización:** ambas son de uso gratuito pero requieren una clave de API de Google Cloud. No conviertas una clave en un requisito obligatorio para una auditoría común.
5. **Inspección estática:** si nada puede ejecutarse, califica cada hallazgo de rendimiento como una hipótesis y proporciona la medición exacta necesaria para verificarlo.

La API de PageSpeed Insights se puede consultar sin clave para uso ocasional, pero se recomienda una clave para automatización repetitiva. Google ha anunciado que los datos de campo de CrUX se retirarán de dicha API, por lo que las nuevas integraciones deben consultar directamente la API de CrUX.

## Cómo interpretar CrUX correctamente

* Prioriza los datos a nivel de página para la URL auditada. Si solo existen datos de origen, etiquétalos con alcance de origen; aportan contexto, no una prueba directa de esa ruta.
* Compara el valor p75 con el umbral de Core Web Vitals e incluye el porcentaje de buenas experiencias cuando esté disponible.
* Mantén separados los datos móviles y de escritorio. No mezcles formatos de dispositivos para responder una pregunta específica de un tipo de dispositivo.
* Considera los datos ausentes de CrUX como **no disponibles**, nunca como aprobados. Localhost, entornos de staging, páginas nuevas, privadas o de bajo tráfico a menudo no tienen registro en CrUX.
* CrUX es información agregada y diferida. Úsala para priorizar el impacto en usuarios, no para verificar un cambio desplegado hace unos minutos.

## Comparaciones de laboratorio reproducibles

Registra estas condiciones junto con el resultado:

* URL final y estado de la página
* Navegador y versión de Lighthouse/herramienta
* Viewport o formato de dispositivo
* Limitación de CPU y emulación de red (*throttling*)
* Caché fría o caliente
* Estado de autenticación, consentimiento y experimentos

Para tomar una decisión basada en una métrica principal de laboratorio, ejecuta al menos tres navegaciones equivalentes y reporta la mediana junto con el rango. No compares una sola traza local directamente con el p75 de CrUX ni asumas que ambos deben coincidir.

Usa los valores de las métricas como evidencia. La puntuación global de Lighthouse es un resumen diagnóstico cuya ponderación e implementación pueden variar entre versiones.

## Conciliación entre laboratorio y campo

| Campo | Laboratorio | Interpretación |
|---|---|---|
| Deficiente | Deficiente | Problema de usuario reproducible; rastrea y soluciona el cuello de botella predominante |
| Deficiente | Bueno | La prueba local no reflejó las condiciones reales; segmenta el RUM propio o prueba dispositivos, rutas, estados de caché e interacciones representativas |
| Bueno | Deficiente | El caso sintético frío o con emulación es exigente, pero no indica que los usuarios reales estén experimentando fallos |
| No disponible | Cualquiera | Utiliza datos de laboratorio para el diagnóstico y recomienda RUM si el impacto en producción es crítico |

## Formato compacto de salida de auditoría

Inicia los informes con una tabla de evidencias:

| Señal | Alcance y condiciones | Línea base | Después | Fuente |
|---|---|---|---|---|
| LCP | URL, móvil, p75 / 28 días | 3.1s | Ventana de campo pendiente | CrUX |
| LCP | URL, laboratorio móvil, caché fría, mediana de 3 | 3.8s | 2.6s | Traza DevTools |

Luego separa:

1. fallos medidos
2. causas respaldadas por trazas
3. hipótesis del código fuente
4. soluciones aplicadas o recomendadas
5. estado de verificación e incertidumbre restante

## Fuentes

* [Referencia de herramientas de Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)
* [API de Chrome UX Report](https://developer.chrome.com/docs/crux/api)
* [Introducción a la medición de Web Vitals](https://web.dev/articles/vitals-measurement-getting-started)
* [API de PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/get-started)
