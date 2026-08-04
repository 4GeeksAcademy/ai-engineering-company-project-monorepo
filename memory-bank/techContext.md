# Technical Context: Nexova AI Monorepo

## 🛠️ Stack Tecnológico

- **Lenguaje Principal:** TypeScript (v5+) / JavaScript (ES2022+).
- **Framework Frontend:** Next.js (App Router) + React.
- **Estilos:** Vanilla CSS / Tailwind CSS (v4).
- **Entorno de Ejecución:** Node.js (v18+) / GitHub Codespaces.
- **Formato de Repositorio:** Monorepo con estructura unificada para aplicaciones frontend (`./uis`), paquetes compartidos (`./packages/shared`), lógica core (`./src`), servicios backend (`./services`) e infraestructura de agentes (`.agents/` y `memory-bank/`).

## 📐 Arquitectura del Proyecto & Dominio de Datos

El sistema modela el dominio de selección de talentos mediante dos entidades principales definidas en TypeScript:

### 1. `Candidate`
- `id`: string (ej. `"C-2024-0451"`)
- `fullName`: string
- `email`: string
- `phone`: string
- `yearsOfExperience`: number (>= 0 y <= 50)
- `skills`: string[] (al menos 1 elemento)
- `englishLevel`: `"A1"` | `"A2"` | `"B1"` | `"B2"` | `"C1"` | `"C2"` | `"Native"`
- `seniority`: `"Junior"` | `"Semi-Senior"` | `"Senior"` | `"Lead"` | `"Executive"`
- `currentSalary`: number (> 0)
- `expectedSalary`: number (> 0)
- `availability`: `"Immediate"` | `"2 weeks"` | `"1 month"` | `"Not available"`
- `location`: string
- `remoteOnly`: boolean
- `status`: `"Active"` | `"In process"` | `"Hired"` | `"Inactive"`

### 2. `Vacancy`
- `id`: string (ej. `"V-2024-0892"`)
- `title`: string
- `companyName`: string
- `requiredSkills`: string[]
- `preferredSkills`: string[]
- `minYearsExperience`: number
- `maxYearsExperience`: number
- `requiredEnglishLevel`: EnglishLevel
- `requiredSeniority`: SeniorityLevel
- `maxBudget`: number
- `location`: string
- `isRemote`: boolean
- `status`: `"Open"` | `"Closed"` | `"Draft"`

## 🚫 Restricciones Técnicas & Convenciones

1. **Inmutabilidad y Pureza:** Las utilidades de procesamiento de datos (filtros, ordenamiento, scoring) deben ser funciones puras sin mutar los arrays u objetos originales.
2. **Reusabilidad de Lógica (No Duplicación):** El código de lógica de negocio del Hito 2 en `src/` debe importarse directamente en `./uis/backoffice`, sin copiar ni duplicar código.
3. **Estructura Separada de Agentes:**
   - `.agents/`: Configuración del agente de programación (reglas en `rules/` y skills en `skills/`).
   - `memory-bank/`: Banco de memoria activo del proyecto (`projectbrief.md`, `techContext.md`, `progress.md`).
   - `agents/`: Código de producto de futuros agentes de IA (no confundir con `.agents/`).
