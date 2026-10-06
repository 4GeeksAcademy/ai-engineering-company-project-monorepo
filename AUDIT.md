# AUDIT.md — Auditoría Inicial de Rendimiento Frontend

**Proyecto:** Monorepo Nexova Solutions  
**Fecha:** 23 de Septiembre, 2026  
**Auditor:** Agente de IA / Squad de Desarrollo  
**Estado:** Medición Inicial (Before)

---

## 1. Puntuaciones Iniciales (Baseline)

Las mediciones fueron tomadas sobre los dos frontends en ejecución local bajo condiciones simuladas de red y CPU móvil y escritorio mediante Google Lighthouse (DevTools). Las capturas de evidencia se encuentran archivadas en la carpeta `/audit/before/`.

| Frontend / Vista | Dispositivo | Performance | Accesibilidad | Best Practices | SEO | Archivo Evidencia |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Sitio Corporativo** (`/`) | 📱 Móvil | **78** 🟠 | **100** 🟢 | **100** 🟢 | **100** 🟢 | `audit/before/website-mobile-before.png` |
| **Sitio Corporativo** (`/`) | 🖥️ Escritorio | **99** 🟢 | **100** 🟢 | **100** 🟢 | **100** 🟢 | `audit/before/website-desktop-before.png` |
| **Backoffice** (`/inventory/products`) | 📱 Móvil | **75** 🟠 | **93** 🟢 | **100** 🟢 | **100** 🟢 | `audit/before/backoffice-mobile-before.png` |
| **Backoffice** (`/inventory/products`) | 🖥️ Escritorio | **91** 🟢 | **93** 🟢 | **100** 🟢 | **100** 🟢 | `audit/before/backoffice-desktop-before.png` |

---

## 2. Diagnóstico de Problemas y Análisis de Causa Raíz

### 🌐 A. Sitio Corporativo (`uis/website`)
1. **LCP Deficiente en Móvil (Largest Contentful Paint):**
   - **Problema:** El elemento LCP principal es la imagen Hero en la Home (`https://images.unsplash.com/photo-1552664730-d307ca884978...`).
   - **Causa Raíz:** Se está utilizando la etiqueta HTML estándar `<img>` en lugar del componente optimizado `next/image`. Además, la imagen tiene el atributo `loading="lazy"`, lo que retrasa artificialmente la descarga del recurso más grande del viewport inicial hasta que el navegador termina de procesar el DOM.
   - **Solución:** Migrar a `next/image` con la propiedad `priority`, formatos modernos automáticos (WebP/AVIF) y dimensiones responsivas (`sizes`).

2. **Riesgo de Layout Shift (CLS):**
   - **Problema:** La imagen Hero no tiene atributos de ancho y alto intrínsecos definidos en el HTML, dependiendo exclusivamente de clases de CSS (`h-64 sm:h-72 lg:h-80 w-full`).
   - **Causa Raíz:** Antes de que la imagen descargue sus bytes, el navegador reserva un espacio temporal incorrecto y luego desplaza el contenido inferior, aumentando el Cumulative Layout Shift.
   - **Solución:** Asignar `width`, `height` o `fill` con contenedor de relación de aspecto fija (`aspect-ratio`).

---

### 🏢 B. Panel Backoffice (`uis/backoffice`)
1. **Layout Shifts y Experiencia de Carga (FCP / LCP):**
   - **Problema:** Durante la petición asíncrona de datos (`inventoryService.getProducts()`), la pantalla muestra un texto simple `Cargando inventario...` que luego es reemplazado abruptamente por la tabla completa con filas.
   - **Causa Raíz:** Falta de un componente de esqueleto (*Loading Skeleton*) que preserve la estructura dimensional de la tabla mientras se resuelve la promesa de la API.
   - **Solución:** Implementar un esqueleto de carga con dimensiones coincidentes para eliminar el salto visual al recibir los datos.

2. **Accesibilidad en Tablas de Datos (Score: 93):**
   - **Problema:** Los encabezados `<th>` de la tabla de productos carecen del atributo semántico de alcance `scope="col"`.
   - **Causa Raíz:** Omisión de atributos estándar de accesibilidad HTML5 requeridos por lectores de pantalla y validadores WCAG.
   - **Solución:** Añadir `scope="col"` a los encabezados y verificar contrastes de color en las insignias de estado de stock.

---

## 3. Análisis de Refactorización de Código Duplicado

Siguiendo el requerimiento del CTO y el estándar de calidad, se identificaron los siguientes patrones repetitivos en el codebase:

### 🔁 Caso 1: Lógica de Petición Asíncrona con Estado (`loading`, `error`, `data`)
- **Dónde aparece:** En `uis/backoffice/src/app/inventory/products/page.tsx` y en múltiples vistas que consumen endpoints de la API.
- **Por qué es candidato:** Cada componente replica exactamente las mismas 15 líneas de boilerplate:
  ```tsx
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { ... fetch ... setLoading(false) }, []);
  ```
- **Abstracción propuesta:** Crear un Custom Hook reutilizable `useAsyncData<T>` o `useInventory` que encapsule la gestión de estado, control de errores y ciclo de vida de carga.

### 🔁 Caso 2: Insignias de Estado y Badges Visuales
- **Dónde aparece:** En las vistas de inventario y tablas operativas para renderizar estados (Saludable, Bajo, Agotado).
- **Por qué es candidato:** La lógica de mapeo condicional de clases CSS, iconos de Lucide y textos de estado está acoplada dentro del cuerpo del componente de la página.
- **Abstracción propuesta:** Extraer un componente compartido `<StockBadge status={stock} />` desacoplado y reutilizable.

---

## 4. Plan de Acción de Corrección

1. **Commit 1 (Website LCP & CLS):** Reemplazar `<img>` por `next/image` con `priority` y dimensiones responsivas.
2. **Commit 2 (Backoffice A11y & Skeleton):** Añadir accesibilidad semántica a la tabla y crear Skeleton Loader para mitigar layout shifts.
3. **Commit 3 (Refactorización):** Extraer e integrar el Custom Hook reutilizable y el componente de badge compartido.
4. **Commit 4 (Medición Final):** Re-ejecutar Lighthouse, capturar resultados en `/audit/after/` y redactar `REPORT.md`.
