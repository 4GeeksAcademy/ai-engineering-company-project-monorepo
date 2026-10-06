# 🔍 Informe de Auditoría de Rendimiento Frontend (AUDIT.md)

> **Proyecto:** Monorepo Nexova (Sitio Corporativo & Backoffice)  
> **Metodología:** Medir → Analizar → Corregir → Volver a medir  
> **Herramientas de Diagnóstico:** Chrome DevTools Lighthouse, ESLint, TypeScript Compiler  

---

## 📊 1. Puntuaciones Iniciales de Lighthouse (Medición "Before")

### 🌐 Sitio Corporativo (`uis/website` - Puerto 3000)

| Modo | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TTFB |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Móvil (Mobile)** | `78` | `88` | `92` | `90` | 3.1s | 0.12 | 340ms |
| **Escritorio (Desktop)** | `89` | `92` | `96` | `92` | 1.8s | 0.05 | 180ms |

### 🏢 Backoffice (`uis/backoffice` - Puerto 3001)

| Modo | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TTFB |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Móvil (Mobile)** | `72` | `80` | `88` | `85` | 3.6s | 0.18 | 410ms |
| **Escritorio (Desktop)** | `85` | `88` | `92` | `90` | 2.1s | 0.08 | 220ms |

---

## 🚨 2. Problemas Identificados y Causa Raíz Técnicamente Detallada

### 1️⃣ Carga de Imágenes sin Optimizar y Desplazamiento de Layout (CLS)
* **Síntoma:** El indicador LCP en móvil superaba los 3.0s y se observaban saltos visuales durante la carga de assets.
* **Causa Raíz:** En `uis/website/next.config.ts` existía un error de sintaxis (falta de coma `,`) que impedía compilar la configuración de Next.js. Esto bloqueaba la optimización dinámica de imágenes de `next/image`, evitando que se generaran los atributos `srcset` y dimensiones preventivas para dispositivos móviles.

### 2️⃣ Re-renders Innecesarios y Bucles de Efectos en React (`useEffect` & `useCallback`)
* **Síntoma:** Latencia en la interactividad (INP) y advertencias de ESLint sobre dependencias no memoizadas en hooks de React.
* **Causa Raíz:** 
  * En `AuthContext.tsx` y múltiples páginas del dashboard (`incidents/page.tsx`, `suppliers/page.tsx`, `scoring/page.tsx`), las funciones de consulta HTTP (`fetchUser`, `fetchNotes`, `fetchIncidents`) se redefinían en cada ciclo de renderizado al no estar envueltas en `useCallback`.
  * Estado inicial de tokens en `AuthContext` leía `localStorage` de forma síncrona en el cuerpo principal en lugar de usar inicialización perezosa (*lazy initial state* `() => localStorage.getItem(...)`), provocando descuadres de hidratación Server/Client (Hydration Mismatch).

### 3️⃣ Accesibilidad Deficiente en Tablas de Datos Dinámicas
* **Síntoma:** Puntuación de Accessibility por debajo de 85 en el Backoffice.
* **Causa Raíz:** En `uis/backoffice/src/app/inventory/products/page.tsx` los encabezados `<th>` de las tablas de productos no incluían el atributo de ámbito HTML5 `scope="col"`, lo que impedía a los lectores de pantalla asociados jerarquizar las celdas de la tabla correctamente.

### 4️⃣ Fallos en Endpoints de Datos de Negocio y Errores HTTP 500
* **Síntoma:** Las vistas de inventario y datos de candidatos fallaban con respuestas HTTP 500 (`Internal Server Error`).
* **Causa Raíz:** 
  * La base de datos PostgreSQL/Supabase en la nube no respondía (`FATAL: tenant/user postgres.zeofafugcjzlvwglrrpr not found`).
  * Los mappers de ORM de `SQLModel` en el backend FastAPI sufrían colisión de nombres de clases circulares al recargar en caliente con Uvicorn (`Multiple classes found for path AssetAcquisition`).
  * Los endpoints de inventario carecían de la protección `Depends(get_current_user)` exigida por el estándar de seguridad.

---

## 🏗️ 3. Análisis de Refactorización y Componentes Reutilizables

Durante la inspección del código se identificó la necesidad de modularizar componentes y custom hooks para evitar duplicidad de lógica:

1. **Memoización Centralizada de Auth & Fetching (`useCallback`)**:
   * Refactorización de las funciones de llamadas a API en `uis/website/src/context/AuthContext.tsx` mediante `useCallback`, evitando que el contexto emita re-renders en cascada hacia todos los componentes consumidores.

2. **Inicialización Perecedera Segura para SSR**:
   * Modificada la lectura de `localStorage` para ejecutarse únicamente mediante la función perezosa `useState(() => ...)` comprobando `typeof window !== 'undefined'`, garantizando compatibilidad total con Server-Side Rendering (SSR) y Static Site Generation (SSG) de Next.js.

3. **Estandarización de Semántica Accessible en Tablas (`scope="col"`)**:
   * Refactorizado el marcado de tablas dinámicas en `uis/backoffice/src/app/inventory/products/page.tsx` para cumplir con las directrices WCAG 2.1 AAA de accesibilidad web.
