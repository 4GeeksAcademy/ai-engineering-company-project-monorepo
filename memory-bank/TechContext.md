# Tech Context — Brasaland Digital

> Última actualización: 2026-09-14

---

## Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Framework | Next.js | 15.3.4 |
| UI Library | React | 19.1.0 |
| Language | TypeScript | 5.8.3 |
| Styling | Tailwind CSS | 4.1.8 |
| Fonts | Google Fonts (Barlow, Oswald) | - |
| Package Manager | pnpm | - |
| Deploy | Vercel | - |

---

## Arquitectura del Proyecto

```
/
├── app/
│   ├── layout.tsx          # Layout principal (fonts: Barlow + Oswald)
│   ├── page.tsx            # Landing page (Server Component)
│   └── globals.css         # Theme colors + Tailwind config
├── components/             # Componentes reutilizables (12 total)
│   ├── SkipLink/           # Accesibilidad - Skip to content
│   ├── Header/             # Navegación sticky + mobile menu
│   ├── HeroSection/        # Hero con CTA
│   ├── OurStory/           # Historia + imagen
│   ├── UniqueSection/      # 3 columnas de diferenciación
│   ├── LocationsSection/   # Ubicaciones Colombia + USA
│   ├── BrasaPointsSection/ # Featured section + formulario
│   ├── RegistrationForm/   # Formulario multi-step (Client Component)
│   ├── ContactSection/     # Información de contacto
│   ├── Footer/             # Footer con links sociales
│   ├── Button/             # Componente reutilizable
│   └── Card/               # Componente reutilizable
├── lib/
│   ├── locations.ts        # Datos de ubicaciones + helpers
│   └── validations.ts      # Validación del formulario
├── skills/
│   └── component-generator/ # Skill para generar componentes
└── memory-bank/
    ├── ProjectBrief.md     # Descripción de negocio y objetivos
    ├── TechContext.md       # Este archivo
    └── progress.md         # Estado y siguientes pasos
```

---

## Decisiones de Arquitectura

### 1. Server Components por Defecto
- Solo **Header** y **RegistrationForm** son Client Components (`"use client"`)
- El resto son Server Components para mejor performance y SEO
- Uso de `useCallback` y `React.memo` solo cuando es necesario

### 2. Componentes — Convención de Estructura
Cada componente sigue la convención:
```
ComponentName/
├── index.tsx           # export { default } from "./ComponentName"
└── ComponentName.tsx   # Implementación del componente
```

### 3. Inventario de Componentes

| Componente | Tipo | Props | Notas |
|------------|------|-------|-------|
| SkipLink | Server | - | sr-only + focus:not-sr-only |
| Header | Client | - | useState, mobile menu, aria-expanded |
| HeroSection | Server | - | aria-labelledby, semantic section |
| OurStory | Server | - | figure + img con alt text |
| UniqueSection | Server | - | 3 columnas, article cards |
| LocationsSection | Server | - | 2 columnas, article cards |
| BrasaPointsSection | Server | - | Wrapper del RegistrationForm |
| RegistrationForm | Client | - | Multi-step form, validaciones |
| ContactSection | Server | - | semantic address |
| Footer | Server | - | Links sociales |
| Button | Server | variant, size, loading, icons | Reutilizable |
| Card | Server | title, description, onClick | Reutilizable |

### 4. Tailwind CSS con @theme
- Custom theme via `@theme` en globals.css
- Responsive mobile-first (`sm:`, `md:`, `lg:`)
- Clases condicionales con template literals
- `focus-visible:outline` para accesibilidad

### 5. Datos Estáticos en lib/
- **locations.ts** — datos de ubicaciones, ciudades, países con helpers
- **validations.ts** — validación del formulario con tipos y regex

---

## Restricciones Técnicas

### Accesibilidad (WCAG 2.1 AA)
Patrones implementados:
- ✅ Skip navigation link
- ✅ Semantic HTML (nav, main, section, article, footer)
- ✅ `aria-labelledby` en todas las secciones
- ✅ `aria-expanded`, `aria-controls` en mobile menu
- ✅ `aria-required`, `aria-invalid` en formularios
- ✅ `aria-describedby` para mensajes de error
- ✅ `aria-live="polite"` para errores dinámicos
- ✅ `focus-visible` con outline personalizado (nunca `focus` para no afectar mouse users)
- ✅ `sr-only` text para screen readers
- ✅ `alt text` en imágenes

### Paleta de Colores (Contraste WCAG)
| Token | Color | Uso |
|-------|-------|-----|
| brasa-cream | #f9ede0 | Background principal |
| brasa-brown-dark | #2e1f16 | Texto principal, header |
| brasa-red | #b23a21 | CTAs, acentos |
| brasa-gold | #ffca8f | Links, highlights |
| brasa-error | #a12e1b | Errores de validación |

### SEO & Metadata
```typescript
title: "Brasaland | Grill Flavor Across Colombia and Florida"
description: "Brasaland is a grilled food restaurant chain..."
metadataBase: "https://brasaland.com"
robots: { index: true, follow: true }
openGraph: { type: "website", locale: "en_US" }
twitter: { card: "summary_large_image" }
```

### Formulario Brasa Points — Validaciones
```typescript
// Regex
fullNameRegex: /^\s*\S+\s+\S+/    // Mínimo 2 palabras
emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
phoneRegex: /^\+(57|1)\s[0-9][0-9\s-]{6,}$/  // +57 o +1

// Funciones
validateStep1(data) → Partial<FormErrors>
validateStep2(data) → Partial<FormErrors>
isAdult(dateValue) → boolean  // 18+ años
```

### Formulario — Lógica Dependiente
```
Colombia → Medellín, Bogotá, Cali
United States → Miami, Orlando

Colombia|Medellín → El Poblado, Laureles, Envigado, Sabaneta
Colombia|Bogotá → Usaquén, Chapinero, Zona Rosa
Colombia|Cali → Granada, Ciudad Jardín, Unicentro
USA|Miami → Brickell, Coral Gables
USA|Orlando → Downtown, International Drive
```

---

## Convenciones de Código

### TypeScript
- Interfaces para todos los props
- `as const` para arrays literales
- Named exports + default export en barrel (`index.tsx`)

### React
- Server Components por defecto
- `"use client"` solo cuando hay hooks/interactivity
- `useCallback` para funciones estables
- `React.memo` para renders pesados (si es necesario)

### Skills Disponibles
- **component-generator** — Generar componentes React/Next.js con WCAG
  - Uso: `./skills/component-generator/scripts/generate-component.sh NombreComponente [--client]`
  - Incluye: Examples (Button, Accordion, Card), Checklist WCAG
- **code-review** — Revisión de código
- **data-analysis** — Análisis de datos
- **research** — Investigación

---

## Comandos

```bash
pnpm dev          # Desarrollo con Turbopack
pnpm build        # Build de producción
pnpm start        # Iniciar servidor producción
pnpm lint         # Linting
```

---

*Este archivo es la fuente de verdad sobre las decisiones técnicas y la arquitectura del proyecto.*
