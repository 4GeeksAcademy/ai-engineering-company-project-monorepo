---
name: performance
description: Optimiza el rendimiento web para una carga más rápida y una mejor experiencia de usuario. Úsalo cuando se solicite "acelerar mi sitio", "optimizar rendimiento", "reducir tiempo de carga", "solucionar carga lenta", "mejorar velocidad de página" o "auditoría de rendimiento".
license: MIT
metadata:
  author: web-quality-skills
  version: "2.0"
---

# Optimización de rendimiento

Optimización de rendimiento basada en evidencia utilizando señales de usuarios reales para priorizar y trazas de navegador para diagnosticar. Se enfoca en la velocidad de carga, la capacidad de respuesta en tiempo de ejecución y la entrega de recursos.

## Cómo funciona

1. Si la página puede ejecutarse, lee [el flujo de medición](references/MEASUREMENT.md) y establece una línea base de campo más laboratorio antes de editar.
2. Prioriza los Core Web Vitals deficientes de usuarios reales. Utiliza una traza de rendimiento de DevTools y sus análisis específicos para encontrar la causa.
3. Inspecciona y modifica únicamente el código o los recursos vinculados a los cuellos de botella medidos.
4. Vuelve a ejecutar mediciones de laboratorio equivalentes y reporta los valores antes/después, condiciones e incertidumbre. La verificación en campo queda pendiente hasta que se recopilen suficientes datos de nuevos usuarios.

Cuando no exista una página ejecutable, realiza una inspección estática pero califica los hallazgos como **hipótesis**, no como regresiones medidas. Incluye el comando o flujo de navegador capaz de verificar cada hipótesis de alto impacto.

Prioriza una herramienta de navegador que registre una traza de rendimiento y exponga diagnósticos detallados. Con Chrome DevTools MCP, utiliza `performance_start_trace` y `performance_analyze_insight`; no canalices el rendimiento a través de `lighthouse_audit`, ya que abarca categorías ajenas al rendimiento.

## Presupuesto de rendimiento inicial

Los presupuestos deben reflejar los dispositivos, redes, tipos de página y recorridos de usuario del producto. Los valores a continuación son límites iniciales para una página típica de contenido o comercio, no criterios universales de aprobado/reprobado. Conserva el presupuesto existente del proyecto si ya está definido.

| Recurso | Presupuesto | Justificación |
|---|---|---|
| Peso total de la página | < 1.5 MB | Limita el tiempo de transferencia y el consumo de datos en redes restringidas; calibrar con páginas representativas |
| JavaScript (comprimido) | < 300 KB | Protege el coste de parseo y ejecución |
| CSS (comprimido) | < 100 KB | Limita el trabajo que bloquea el renderizado |
| Imágenes (above-the-fold) | < 500 KB | Protege los recursos probables de LCP |
| Fuentes | < 100 KB | Limita la transferencia de fuentes críticas |
| Terceros | < 200 KB | Limita el código fuera del control del producto |

## Ruta crítica de renderizado (Critical rendering path)

### Respuesta del servidor
* **TTFB < 800ms.** El tiempo hasta el primer byte (Time to First Byte) debe ser rápido. Utiliza CDN, almacenamiento en caché y servidores backend eficientes.
* **Habilitar compresión.** Gzip o Brotli para recursos de texto. Es preferible Brotli (15-20% más liviano).
* **HTTP/2 o HTTP/3.** La multiplexación reduce la sobrecarga de conexión.
* **Caché en el Edge.** Almacena en caché el HTML en el borde de la CDN siempre que sea posible.
* **Considera Early Hints (HTTP 103) para latencia de documentos medida.** Si una traza muestra una generación de HTML lenta y subrecursos críticos estables, envía un código provisional `103` con encabezados `Link` antes de la respuesta final habitual de la misma petición. Usa HTTP/2 o superior. Una CDN puede sintetizar el `103` a partir de encabezados `Link` de un `200` anterior, o el backend/edge handler puede emitirlo directamente. Los clientes que no lo soporten continuarán hacia la respuesta final; aun así, valida el soporte actual del navegador e infraestructura. Limita los hints a precargas o preconexiones críticas demostradas: los hints imprecisos desperdician ancho de banda. Cloudflare reportó una mejora del 20–30% en LCP en una prueba artificial con muchas imágenes; trátalo como un caso de estudio de proveedor, no como un ahorro garantizado, y mide tus propios resultados. Consulta el [ejemplo de implementación 103 de MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/103) y el [estudio de Cloudflare](https://blog.cloudflare.com/early-hints-performance/).

### Carga de recursos

**Preconexión a orígenes requeridos:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

**Precargar recursos críticos:**

Precarga solo los recursos cuyo descubrimiento tardío sea visible en la traza. Cada precarga compite por ancho de banda y una petición de alta prioridad innecesaria puede retrasar el LCP.

```html
<!-- Imagen LCP -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">

<!-- Fuente crítica -->
<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
```

**Prerenderizar navegaciones altamente probables** con la [Speculation Rules API](https://developer.chrome.com/docs/web-platform/prerender-pages):
```html
<script type="speculationrules">
{
  "prerender": [{
    "where": { "href_matches": "/*" },
    "eagerness": "moderate"
  }]
}
</script>
```
`moderate` espera una señal de intención más fuerte que los modos activos (*eager*). Mide la tasa de acierto de predicción, los bytes transferidos y el coste del servidor; un prerenderizado erróneo equivale a una navegación no utilizada. Consulta [core-web-vitals → LCP](../core-web-vitals/SKILL.md#lcp-largest-contentful-paint) para ver las ventajas/desventajas y el control condicional `prerenderingchange` necesario para analíticas.

**Diferir CSS no crítico:**
```html
<!-- CSS crítico insertado inline -->
<style>/* Estilos above-the-fold */</style>

<!-- CSS no crítico -->
<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>
```

### Optimización de JavaScript

**Diferir scripts no esenciales:**
```html
<!-- Bloquea el analizador/parser (evitar) -->
<script src="/critical.js"></script>

<!-- Diferido (preferido) -->
<script defer src="/app.js"></script>

<!-- Asíncrono (para scripts independientes) -->
<script async src="/analytics.js"></script>

<!-- Módulo (diferido por defecto) -->
<script type="module" src="/app.mjs"></script>
```

**Patrones de división de código (Code splitting):**
```javascript
// División basada en rutas
const Dashboard = lazy(() => import('./Dashboard'));

// División basada en componentes
const HeavyChart = lazy(() => import('./HeavyChart'));

// División basada en funcionalidades
if (user.isPremium) {
  const PremiumFeatures = await import('./PremiumFeatures');
}
```

**Buenas prácticas de Tree Shaking:**
```javascript
// ❌ Importa la librería completa
import _ from 'lodash';
_.debounce(fn, 300);

// ✅ Importa únicamente lo necesario
import debounce from 'lodash/debounce';
debounce(fn, 300);
```

## Optimización de imágenes

### Selección de formato
| Formato | Caso de uso | Soporte de navegadores |
|---|---|---|
| AVIF | Fotografías, mejor compresión | 92%+ |
| WebP | Fotografías, buen respaldo | 97%+ |
| PNG | Gráficos con transparencias | Universal |
| SVG | Iconos, logotipos, ilustraciones | Universal |

### Imágenes responsivas
```html
<picture>
  <!-- AVIF para navegadores modernos -->
  <source 
    type="image/avif"
    srcset="hero-400.avif 400w,
            hero-800.avif 800w,
            hero-1200.avif 1200w"
    sizes="(max-width: 600px) 100vw, 50vw">
  
  <!-- Respaldo WebP -->
  <source 
    type="image/webp"
    srcset="hero-400.webp 400w,
            hero-800.webp 800w,
            hero-1200.webp 1200w"
    sizes="(max-width: 600px) 100vw, 50vw">
  
  <!-- Respaldo JPEG -->
  <img 
    src="hero-800.jpg"
    srcset="hero-400.jpg 400w,
            hero-800.jpg 800w,
            hero-1200.jpg 1200w"
    sizes="(max-width: 600px) 100vw, 50vw"
    width="1200" 
    height="600"
    alt="Imagen principal"
    loading="lazy"
    decoding="async">
</picture>
```

### Prioridad de imagen LCP
```html
<!-- Imagen LCP above-the-fold: carga inmediata, alta prioridad -->
<img 
  src="hero.webp" 
  fetchpriority="high"
  loading="eager"
  decoding="sync"
  alt="Hero">

<!-- Imágenes below-the-fold: carga diferida (lazy loading) -->
<img 
  src="product.webp" 
  loading="lazy"
  decoding="async"
  alt="Producto">
```

## Optimización de fuentes

### Estrategia de carga
```css
/* Pila de fuentes del sistema como respaldo */
body {
  font-family: 'Custom Font', -apple-system, BlinkMacSystemFont, 
               'Segoe UI', Roboto, sans-serif;
}

/* Evitar texto invisible (FOIT) */
@font-face {
  font-family: 'Custom Font';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* u optional para fuentes no críticas */
  font-weight: 400;
  font-style: normal;
  unicode-range: U+0000-00FF; /* Subconjunto a caracteres latinos */
}
```

### Precargar fuentes críticas
```html
<link rel="preload" href="/fonts/heading.woff2" as="font" type="font/woff2" crossorigin>
```

### Fuentes variables
```css
/* Un solo archivo en lugar de múltiples variantes de peso */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
```

## Estrategia de almacenamiento en caché

### Encabezados Cache-Control
```
# HTML (caché corta o sin caché)
Cache-Control: no-cache, must-revalidate

# Recursos estáticos con hash de versión (inmutables)
Cache-Control: public, max-age=31536000, immutable

# Recursos estáticos sin hash
Cache-Control: public, max-age=86400, stale-while-revalidate=604800

# Respuestas de API
Cache-Control: private, max-age=0, must-revalidate
```

### Caché con Service Worker
```javascript
// Estrategia Cache-first para recursos estáticos
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image' ||
      event.request.destination === 'style' ||
      event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open('static-v1').then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
```

## Rendimiento en tiempo de ejecución (Runtime)

### Evitar el reflujo excesivo (Layout Thrashing)
```javascript
// ❌ Fuerza múltiples reflujos de diseño
elements.forEach(el => {
  const height = el.offsetHeight; // Lectura
  el.style.height = height + 10 + 'px'; // Escritura
});

// ✅ Agrupa lecturas primero, luego escrituras
const heights = elements.map(el => el.offsetHeight); // Todas las lecturas
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px'; // Todas las escrituras
});
```

### Limitar operaciones costosas (Debounce)
```javascript
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Limitar manejadores de eventos scroll/resize
window.addEventListener('scroll', debounce(handleScroll, 100));
```

### Usar requestAnimationFrame
```javascript
// ❌ Puede generar tirones (jank)
setInterval(animate, 16);

// ✅ Sincronizado con la tasa de refresco de la pantalla
function animate() {
  // Lógica de animación
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### Virtualizar listas largas
```javascript
// Para listas > 100 elementos, renderizar únicamente los elementos visibles
// Usar librerías como react-window, vue-virtual-scroller, o CSS nativo:
.virtual-list {
  content-visibility: auto;
  contain-intrinsic-size: 0 50px; /* Altura estimada por elemento */
}
```

### Navegaciones fluidas con View Transitions

La [API View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions) permite que el navegador realice una transición con desvanecimiento cruzado (o animación personalizada) entre dos estados del DOM usando una única captura compuesta por GPU: sin doble renderizado, sin sobrecarga de diseño y sin que la captura compute para el CLS.

**Mismo documento (estilo SPA) — Baseline 2026:**
```javascript
// Envolver la mutación del DOM que intercambia la vista
function navigate(newView) {
  if (!document.startViewTransition) return swapDOM(newView);
  document.startViewTransition(() => swapDOM(newView));
}
```

**Entre documentos (estilo MPA) — Estable en Chromium, mejora progresiva en otros navegadores:**
```css
/* En ambas páginas (origen y destino) */
@view-transition { navigation: auto; }
```
Esa es toda la integración: las navegaciones del mismo origen ahora tendrán una transición suave automática. Para incluir elementos específicos en transiciones de elementos compartidos (por ejemplo, una miniatura que se expande a imagen principal), asígnales un `view-transition-name` coincidente:
```css
.product-thumb[data-id="42"], .product-hero { view-transition-name: product-42; }
```

Combina esto con Speculation Rules (visto anteriormente) para lograr navegaciones instantáneas y animadas.

## Scripts de terceros

### Estrategias de carga
```javascript
// ❌ Bloquea el hilo principal
<script src="https://analytics.example.com/script.js"></script>

// ✅ Carga asíncrona
<script async src="https://analytics.example.com/script.js"></script>

// ✅ Retrasar hasta interacción del usuario
<script>
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const script = document.createElement('script');
      script.src = 'https://widget.example.com/embed.js';
      document.body.appendChild(script);
      observer.disconnect();
    }
  });
  observer.observe(document.querySelector('#widget-container'));
});
</script>
```

### Patrón Facade (Fachada)
```html
<!-- Muestra un marcador de posición estático hasta que el usuario interactúe -->
<div class="youtube-facade" 
     data-video-id="abc123" 
     onclick="loadYouTube(this)">
  <img src="/thumbnails/abc123.jpg" alt="Título del video">
  <button aria-label="Reproducir video">▶</button>
</div>
```

## Medición

Utiliza [el flujo de medición](references/MEASUREMENT.md) siempre que una URL sea ejecutable. Define el enrutamiento de Chrome DevTools MCP, fuentes de CrUX y respaldos, condiciones de laboratorio reproducibles y un formato de evidencia compacto.

| Métrica | Tipo | Interpretación |
|---|---|---|
| LCP, INP, CLS en p75 | Campo | Core Web Vitals de experiencia de usuario; usar para priorizar aprobado/reprobado |
| LCP, CLS en una traza | Laboratorio | Valores diagnósticos reproducibles para una navegación |
| TBT | Laboratorio | Diagnóstico de bloqueo del hilo principal y aproximación a INP, no INP de campo |
| FCP, Speed Index | Laboratorio | Diagnósticos de carga, no son Core Web Vitals |

Los fragmentos de código directos con `PerformanceObserver` son útiles para la sesión actual del navegador, pero no constituyen datos de usuarios reales por sí solos. Cuando se requiera telemetría en producción, consulta [la referencia de RUM de origen](references/RUM.md) y prioriza `web-vitals` frente a una implementación manual de métricas.

## Referencias

Para optimizaciones específicas de Core Web Vitals, consulta [Core Web Vitals](../core-web-vitals/SKILL.md).
