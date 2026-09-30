# 📘 Aprendiendo con la IA — Proyecto Nexova

> **Estudiante:** INES  
> **Proyecto:** Nexova — Consultora de RRHH y Adquisición de Talento  
> **Propósito:** Este documento recoge TODO lo que hemos hecho, las decisiones tomadas, los problemas resueltos y cómo se ha construido cada pieza. Es tu cuaderno de aprendizaje.

---

## 📑 Índice

1. [¿Qué es este proyecto?](#1-qué-es-este-proyecto)
2. [Arquitectura general](#2-arquitectura-general)
3. [El monorepo: un solo repo para todo](#3-el-monorepo-un-solo-repo-para-todo)
4. [Frontend 1: El sitio web (website)](#4-frontend-1-el-sitio-web-website)
5. [Frontend 2: El panel interno (backoffice)](#5-frontend-2-el-panel-interno-backoffice)
6. [Backend: La API](#6-backend-la-api)
7. [El Hero rediseñado](#7-el-hero-rediseñado)
8. [Problemas que encontramos y cómo los resolvimos](#8-problemas-que-encontramos-y-cómo-los-resolvimos)
9. [Tecnologías usadas](#9-tecnologías-usadas)
10. [Comandos útiles](#10-comandos-útiles)
11. [Glosario para estudiante](#11-glosario-para-estudiante)
12. [Consejos finales](#12-consejos-finales)

---

## 1. ¿Qué es este proyecto?

Nexova es una **consultora de recursos humanos** fundada en 2011 en Valencia, España, con oficina en Miami. Tiene 3 líneas de negocio:

- **Headhunting ejecutivo** — buscar talento para empresas
- **Outsourcing de atención al cliente** — equipos para empresas tech
- **Formación corporativa** — cursos de liderazgo y soft skills

Nosotros hemos construido:

| Pieza | ¿Qué es? | Para quién |
|---|---|---|
| **Website** | La página web corporativa que ve el público | Clientes y candidatos |
| **Backoffice** | Un panel interno con herramientas | Empleados de Nexova |
| **API** | El "cerebro" que procesa datos y da respuestas | Los dos frontends la usan |

Todo esto forma un **monorepo** (un solo repositorio con varios proyectos dentro).

---

## 2. Arquitectura general

### 🏗️ ¿Cómo se conecta todo?

```
Usuario navegando  ──▶  Website (:5173) ──▶  API (:8000) ──▶  TinyDB (base de datos)
Empleado Nexova    ──▶  Backoffice (:5174) ──▶  API (:8000) ──▶  TinyDB
```

**Patrón usado: Frontend + Backend separados (API REST)**

Esto significa que:
- El frontend (lo que ves en el navegador) es **independiente** del backend (donde están los datos)
- Se comunican por HTTP (como cuando visitas una web, pero entre programas)
- El backend expone **endpoints** (URLs tipo `/auth/login`, `/suppliers`, etc.)
- El frontend llama a esos endpoints con `fetch()` (JavaScript)

### 🧩 Decisiones de arquitectura importantes

| Decisión | Por qué |
|---|---|
| **API en capas** (rutas → servicio → datos) | Separa responsabilidades: las rutas reciben peticiones, los servicios tienen la lógica, y el acceso a datos solo guarda/lee |
| **Monolito modular** | Un solo backend pero organizado por temas (auth, users, suppliers...). Más simple que microservicios |
| **JWT sin sesiones** | El token viaja en cada petición. No hay sesión en el servidor. Más escalable |
| **TinyDB** | Base de datos en archivo JSON. Perfecta para empezar sin instalar PostgreSQL |
| **Vite como bundler** | Next-gen tool para React. Más rápido que Webpack |

---

## 3. El monorepo: un solo repo para todo

### 📁 Estructura de carpetas

```
ai-engineering-company-project-monorepo-INES/
├── uis/                    # Las interfaces de usuario (frontends)
│   ├── website/            # Sitio web público
│   └── backoffice/         # Panel interno
├── services/
│   └── api/                # Backend FastAPI
├── packages/
│   ├── incidents_analyzer/ # Lógica compartida (la usa CLI y API)
│   └── shared/             # Tipos TypeScript compartidos
├── scripts/                # Utilidades (analyze.py)
├── docs/                   # Documentación
├── infra/                  # Cosas de infraestructura
├── package.json            # El package.json RAÍZ del monorepo
└── CONTEXT.md              # El documento con los REQUISITOS del cliente
```

### 📦 ¿Por qué un monorepo?

- Todo está en **un solo lugar** → fácil de encontrar
- Los cambios se ven **todos juntos**
- Compartimos código entre proyectos (ej: `incidents_analyzer`)
- Un solo `npm install` instala todas las dependencias

### 🎯 El package.json raíz

```json
{
  "name": "nexova-monorepo",
  "private": true,
  "workspaces": ["uis/website", "uis/backoffice"]
}
```

**`workspaces`** es la clave mágica de npm: le dice "estos subproyectos comparten dependencias". Así no duplicamos React en cada uno.

---

## 4. Frontend 1: El sitio web (website)

### 🧱 Tecnologías

- **React 19** — Biblioteca para construir interfaces
- **TypeScript** — JavaScript con tipos (menos errores)
- **Vite** — El que "empaqueta" todo para producción
- **Tailwind CSS** — Framework de CSS utility-first
- **Lucide React** — Iconos bonitos

### 📄 Estructura del website

```
uis/website/src/
├── main.tsx        # Punto de entrada: monta React en el DOM
├── App.tsx         # Componente principal: toda la web
├── Hero.tsx        # El Hero (cabecera principal rediseñada)
├── router.tsx      # Enrutador SPA (navegación sin recargar)
├── index.css       # Estilos globales + animaciones
└── vite-env.d.ts   # Tipos para Vite
```

### 🔄 Flujo de una visita al website

1. `index.html` carga `main.tsx`
2. `main.tsx` monta el componente `<App />` en el `<div id="root">`
3. `App.tsx` renderiza: Header → Hero → Servicios → Por qué Nexova → Contacto → Footer
4. Si navegas a `/talento`, App cambia y muestra el formulario en lugar de las secciones

### 📡 Enrutador SPA (Single Page Application)

El archivo `router.tsx` es **nuestro propio enrutador** (no usamos React Router). ¿Por qué? Porque la web es simple y no necesitamos una librería entera.

```tsx
// router.tsx
export const TALENT_PATH = "/talento";

export function Link({ to, onNavigate, children }) {
  const click = (event) => {
    event.preventDefault();
    window.history.pushState(null, "", to); // Cambia la URL sin recargar
    onNavigate();                           // Avisa a App que cambie lo que muestra
  };
  return <a href={to} onClick={click}>{children}</a>;
}
```

**Cómo funciona:** Cuando haces clic en un enlace, en lugar de ir a otra página (que recargaría todo), cambiamos la URL con `pushState` y actualizamos solo el contenido. ¡Más rápido para el usuario!

### 🧪 El formulario de talento

El formulario tiene **11 campos** con validaciones específicas:

```tsx
const validate = () => {
  const errors = {};
  if (data.fullName.trim().split(/\s+/).length < 2)
    errors.fullName = "El nombre debe contener al menos nombre y apellido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Ingresa un email válido (ejemplo: nombre@empresa.com)";
  // ... más validaciones
  return errors;
};
```

**Aprendizaje clave:** Las validaciones se hacen **en el frontend** para dar feedback instantáneo al usuario, pero **también en el backend** por seguridad. ¡Nunca confíes solo en el frontend!

### 🏷️ Schema.org para SEO

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Nexova",
  "description": "Consultora de recursos humanos..."
}
```

Esto es **datos estructurados** que Google entiende. Mejora el SEO (cómo apareces en buscadores). Se inyecta como un `<script type="application/ld+json">` en el HTML.

---

## 5. Frontend 2: El panel interno (backoffice)

### 🧱 Tecnologías

Mismas que website + **React Router DOM** para rutas y **Playwright** para tests e2e.

### 📄 Estructura

```
uis/backoffice/src/
├── main.tsx                 # Punto de entrada
├── App.tsx                  # Enrutador con React Router
├── index.css                # Estilos
├── auth/
│   ├── AuthContext.tsx       # Estado global de autenticación
│   └── RequireAuth.tsx       # Protege rutas (redirige si no logueado)
├── components/
│   ├── Layout.tsx            # Plantilla con header/sidebar
│   ├── incidents/
│   │   ├── CsvUploader.tsx   # Subir CSV de incidentes
│   │   └── MetricsSummary.tsx # Mostrar métricas
│   └── suppliers/
│       ├── SupplierForm.tsx  # Formulario de proveedor
│       └── SupplierRow.tsx   # Fila de proveedor editable
├── lib/
│   ├── api.ts               # Llamadas a la API (fetch con token)
│   └── token.ts             # Gestión del JWT en localStorage
├── pages/
│   ├── HomePage.tsx          # Página principal del backoffice
│   ├── LoginPage.tsx         # Login
│   ├── IncidentsAnalysisPage.tsx # Analizador de incidentes
│   └── SuppliersPage.tsx     # Directorio de proveedores
└── types/
    ├── auth.ts
    ├── incidents.ts
    └── suppliers.ts
```

### 🔐 Autenticación (AuthContext + JWT)

El backoffice usa **tokens JWT** para autenticación:

1. El usuario introduce email y contraseña
2. El frontend envía `POST /auth/login` con esos datos
3. La API devuelve un `access_token` (JWT)
4. El frontend guarda el token en `localStorage`
5. En cada llamada a la API, envía el token en el header `Authorization: Bearer <token>`

```tsx
// AuthContext.tsx - El "estado global" de sesión
export function AuthProvider({ children }) {
  const [status, setStatus] = useState("anonymous"); // loading | anonymous | authenticated
  const [user, setUser] = useState(null);

  // Al recargar la página, intenta restaurar la sesión desde el token guardado
  useEffect(() => {
    if (!getToken()) return;
    fetchMe()
      .then(me => { setUser(me); setStatus("authenticated"); })
      .catch(() => { clearToken(); setStatus("anonymous"); });
  }, []);
}
```

### 🛡️ RequireAuth — Proteger rutas

```tsx
// RequireAuth.tsx
function RequireAuth() {
  const { status } = useAuth();
  if (status === "loading") return <Spinner />;
  if (status === "anonymous") return <Navigate to="/login" />;
  return <Outlet />; // Muestra la ruta protegida
}
```

**Patrón de diseño:** Envoltura que verifica autenticación antes de mostrar contenido.

### 📞 Cómo se comunica con la API

El archivo `lib/api.ts` tiene **una función genérica** para llamar a la API:

```tsx
async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && token) clearToken(); // Token expirado
  return response;
}
```

**Aprendizaje:** Un solo punto de entrada para todas las llamadas. Así:
- Ponemos el token automáticamente
- Detectamos 401 (token expirado) en un solo lugar
- Podemos cambiar la URL base fácilmente

---

## 6. Backend: La API

### 🧱 Tecnologías

- **Python 3.14** — El lenguaje
- **FastAPI** — Framework web moderno y rápido
- **Uvicorn** — Servidor ASGI (el que "corre" la API)
- **TinyDB** — Base de datos JSON (sin instalar nada)
- **python-jose** — Para crear y verificar JWT
- **libpass[bcrypt]** — Para hashear contraseñas
- **pytest** — Para tests

### 📄 Estructura

```
services/api/
├── main.py              # Punto de entrada: crea la app FastAPI
├── pyproject.toml       # Dependencias Python
├── seed.py              # Poblar la base de datos inicial
├── requirements.txt     # Dependencias (alternativa a pyproject)
├── auth/
│   ├── router.py        # Rutas de autenticación (/login, /me)
│   ├── schemas.py       # Modelos de datos (Pydantic)
│   ├── security.py      # Hashing de contraseñas + creación JWT
│   ├── service.py       # Lógica de autenticación
│   ├── dependencies.py  # Funciones reutilizables (get_current_user)
│   └── cli.py           # Comando para crear usuarios desde terminal
├── core/
│   ├── config.py        # Configuración (variables de entorno)
│   └── errors.py        # Manejadores de errores
├── users/
│   ├── router.py        # CRUD de usuarios
│   ├── schemas.py       # Modelo User (Pydantic)
│   └── service.py       # Lógica de usuarios
├── profiles/
│   ├── router.py        # Rutas de perfiles
│   ├── schemas.py       # Modelo Profile
│   └── service.py       # Lógica de perfiles
├── suppliers/
│   ├── router.py        # CRUD de proveedores
│   ├── schemas.py       # Modelo Supplier
│   ├── service.py       # Lógica de proveedores
│   ├── seed_data.py     # Datos iniciales (15 proveedores)
│   └── CONTEXT-suppliers.md  # Documento con requisitos
├── incidents/
│   ├── router.py        # Análisis de incidentes
│   ├── schemas.py       # Modelos
│   └── service.py       # Lógica
└── tests/
    ├── conftest.py      # Configuración de tests (fixtures)
    ├── test_auth.py
    ├── test_users.py
    ├── test_profiles.py
    ├── test_suppliers_endpoints.py
    ├── test_suppliers_validation.py
    └── test_architecture.py
```

### 🏗️ Cómo se crea la app (main.py)

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Esto se ejecuta ANTES de que la app empiece a responder
    users_service.bootstrap_first_user()  # Crea admin si no existe
    users_service.migrate_legacy_users()  # Migra datos antiguos
    profiles_service.sync_profiles()      # Sincroniza perfiles
    yield  # La app empieza a funcionar
    # Esto se ejecuta cuando la app se apaga

app = FastAPI(title="Nexova API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Registrar rutas (cada dominio es independiente)
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")
app.include_router(suppliers_router, prefix="/suppliers")
```

**Aprendizaje:** FastAPI usa el patrón de **lifespan** para código que corre al inicio/cierre. Los routers se "montan" con un prefijo.

### 🔐 Autenticación (security.py)

```python
# security.py
from passlib.hash import bcrypt
from jose import jwt

def hash_password(password: str) -> str:
    return bcrypt.hash(password)  # Convierte "admin123" en un hash

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)  # Compara sin revelar el hash

def create_access_token(user_id: str) -> str:
    claims = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(minutes=30)}
    return jwt.encode(claims, SECRET_KEY, algorithm="HS256")
```

### 📦 Modelos Pydantic

Los modelos definen **qué forma tienen los datos**:

```python
# suppliers/schemas.py
class SupplierCreate(BaseModel):
    name: str
    country: str  # Solo "Spain" o "USA"
    categories: list[str]  # Mínimo 1
    monthly_rate: float = Field(gt=0)  # Mayor que 0
    currency: str  # "EUR" para Spain, "USD" para USA
    status: str = "active"  # "active" o "suspended"
```

**Ventaja:** FastAPI valida automáticamente los datos que llegan. Si alguien envía `monthly_rate: -100`, devuelve error 422 automáticamente.

### 🔄 Proxy de Vite (Cómo se comunican frontend y backend)

```ts
// vite.config.ts del backoffice
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/auth": "http://localhost:8000",
    },
  },
});
```

Esto hace que cuando el frontend llama a `/api/suppliers`, Vite lo reenvía a `http://localhost:8000/api/suppliers`. Así:
- El frontend puede usar rutas relativas (`/api/...`)
- **No hay problemas de CORS** (el navegador lo ve como mismo origen)

### 📝 Tests (pytest)

Tenemos **155 tests** que verifican TODO:

```python
# tests/test_suppliers_validation.py
def test_supplier_must_have_valid_currency():
    """Si el país es Spain, la moneda debe ser EUR"""
    response = client.post("/suppliers", json={
        "name": "Test", "country": "Spain", "currency": "USD",  # ❌ ¡Mal!
        ...
    })
    assert response.status_code == 422  # Error de validación
```

**Aprendizaje clave:** Los tests son como un **seguro**. Si cambias algo y los tests pasan, sabes que no has roto nada. Si un test falla, sabes exactamente qué se rompió.

---

## 7. El Hero rediseñado

### 🎨 La petición

> "Rediseña el hero de nexova con acabado profesional nivel agencia (estilo Stripe/Linear)"

### 🧠 Decisiones de diseño

| Decisión | Por qué |
|---|---|
| **Grid 2 columnas** | Columna izquierda: contenido. Derecha: tarjeta con métricas. Así el ojo del usuario ve primero el mensaje |
| **clamp() en tipografía** | `font-size: clamp(2.25rem, 5vw, 4.5rem)` → El texto se adapta al tamaño de pantalla SIN media queries |
| **Gradient text** | La palabra "excepcionales" tiene gradiente cyan → atrae la atención |
| **Glassmorphism** | La tarjeta derecha tiene `backdrop-filter: blur(12px)` → efecto cristal esmerilado |
| **Grid pattern + glow** | Fondo con cuadrícula sutil + glow radial → textura premium |
| **Animated counter** | "+500" cuenta desde 0 hasta 500 → efecto visual impactante |
| **Animaciones escalonadas** | Cada elemento aparece con un pequeño retraso → la página "respira" |

### 🧩 Componentes del Hero

**AnimatedCounter** — El contador animado:

```tsx
function AnimatedCounter({ target }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Si el usuario prefiere no animación, vamos directo al target
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { setCount(target); return; }
    // Animación: incrementa cada 16ms (60fps) hasta llegar al target
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(current);
    }, 16);
  }, [target]);
  return <span>{count.toLocaleString()}</span>;
}
```

**Aprendizaje:** Respetamos `prefers-reduced-motion` para usuarios con sensibilidad a movimientos. ¡Accesibilidad!

### 🎨 CSS personalizado (index.css)

```css
/* Variables de diseño (design tokens) */
:root {
  --color-brand-400: #67e8f9;   /* Cyan claro */
  --color-brand-500: #22d3ee;   /* Cyan medio */
  --color-brand-600: #0891b2;   /* Cyan oscuro */
  --color-surface: #020617;     /* Fondo casi negro */
}

/* Fondo con cuadrícula (como Stripe) */
.hero-grid-bg {
  background-image:
    linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Efecto vidrio (glassmorphism) */
.glass-card {
  background: rgba(15, 23, 42, .65);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(103, 232, 249, .15);
  border-radius: 2rem;
}

/* Texto con gradiente */
.gradient-text {
  background: linear-gradient(135deg, var(--color-brand-400), var(--color-brand-600));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 8. Problemas que encontramos y cómo los resolvimos

### 🔴 Problema 1: Servicios no funcionaban

**Síntoma:** `localhost:8000` no respondía, los puertos no aparecían en Codespaces

**Causa:** Los servicios no estaban iniciados, y cuando lo estaban, escuchaban solo en `127.0.0.1`

**Solución:**
```bash
# No basta con poner el puerto, hay que decirle que escuche en TODAS las interfaces
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Para Vite (frontend):
npx vite --host
```

**Aprendizaje:** `127.0.0.1` solo es accesible desde dentro de la máquina. `0.0.0.0` es accesible desde fuera. En Codespaces necesitas `0.0.0.0`.

---

### 🔴 Problema 2: ModuleNotFoundError: uvicorn

**Síntoma:** `pip install` no encontraba uvicorn aunque lo habíamos instalado

**Causa:** Estábamos instalando en el Python del sistema, no en el `.venv` del proyecto

**Solución:**
```bash
# 1. Activar el entorno virtual correcto
source .venv/bin/activate

# 2. Instalar dependencias desde pyproject.toml
pip install -e .

# 3. Verificar que se instaló
pip list | grep uvicorn
```

**Aprendizaje:** Los entornos virtuales (`.venv`) aíslan las dependencias. Cada proyecto tiene el suyo. Siempre hay que activarlo con `source .venv/bin/activate`.

---

### 🔴 Problema 3: bcrypt no tenía backend

**Síntoma:** `ValueError: No backends available - bcrypt`

**Causa:** La librería `libpass` necesita el paquete `bcrypt` instalado por separado

**Solución:**
```bash
pip install bcrypt  # El paquete Python nativo de bcrypt
```

**Aprendizaje:** A veces una librería tiene dependencias "opcionales" que no se instalan automáticamente. Siempre leer la documentación.

---

### 🔴 Problema 4: Router.ts contenía JSX

**Síntoma:** TypeScript daba error porque el archivo `router.ts` usaba `<a>` (JSX) pero tenía extensión `.ts`

**Causa:** Los archivos con JSX necesitan extensión `.tsx` (TypeScript + JSX)

**Solución:**
```bash
mv router.ts router.tsx  # Renombrar el archivo
```

**Aprendizaje:** `.ts` = solo TypeScript. `.tsx` = TypeScript + JSX. React siempre necesita `.tsx`.

---

### 🔴 Problema 5: TypeScript se quejaba de importar .tsx

**Síntoma:** `tsc --noEmit` daba error: "An import path cannot end with '.tsx'"

**Causa:** Teníamos `import { Link } from "./router.tsx"` y TypeScript estricto no permite la extensión

**Solución:**
```tsx
// ❌ Mal
import { Link } from "./router.tsx";

// ✅ Bien (sin extensión, Vite la resuelve automáticamente)
import { Link } from "./router";
```

**Aprendizaje:** En proyectos con Vite, las importaciones se hacen **sin extensión**. Vite encuentra el archivo automáticamente.

---

## 9. Tecnologías usadas

### 🌐 Frontend

| Tecnología | Versión | ¿Qué es? | ¿Por qué la usamos? |
|---|---|---|---|
| **React** | 19 | Biblioteca de UI | El estándar para interfaces modernas |
| **TypeScript** | 7 | JavaScript con tipos | Evita errores, mejor autocompletado |
| **Vite** | 8.3 | Bundler / dev server | Más rápido que Webpack, recarga instantánea |
| **Tailwind CSS** | 3.4 | Framework CSS | Escribimos CSS en el HTML, muy rápido |
| **Lucide React** | 1.47 | Iconos | Iconos bonitos y simples |
| **React Router DOM** | 7.18 | Enrutador (solo backoffice) | Navegación entre páginas |

### 🐍 Backend

| Tecnología | Versión | ¿Qué es? | ¿Por qué la usamos? |
|---|---|---|---|
| **Python** | 3.14 | Lenguaje de programación | Perfecto para APIs, fácil de aprender |
| **FastAPI** | 0.142 | Framework web | Moderno, rápido, validación automática |
| **Uvicorn** | 0.54 | Servidor | Corre la app de FastAPI |
| **TinyDB** | 4.9 | Base de datos | Archivo JSON, no necesita instalación |
| **python-jose** | 3.3 | JWT | Crear tokens de autenticación |
| **libpass[bcrypt]** | 1.9 | Hashing de contraseñas | Guardar contraseñas seguras |
| **pytest** | 8 | Tests | Verificar que todo funciona |

### 🔧 Herramientas

| Herramienta | ¿Para qué? |
|---|---|
| **npm** | Gestor de paquetes JavaScript |
| **pip** | Gestor de paquetes Python |
| **uv** | Gestor de Python alternativo, más rápido |
| **Playwright** | Tests e2e (emula navegador) |
| **GitHub Codespaces** | Entorno de desarrollo en la nube |

---

## 10. Comandos útiles

### 🚀 Para trabajar con el proyecto

```bash
# === FRONTENDS ===

# Iniciar website en modo desarrollo
cd uis/website && npm run dev

# Iniciar backoffice en modo desarrollo
cd uis/backoffice && npm run dev

# Build de producción (genera carpeta dist/)
cd uis/website && npm run build

# Verificar TypeScript sin errores
cd uis/website && npx tsc --noEmit

# === BACKEND ===

# Activar entorno virtual
cd services/api && source .venv/bin/activate

# Iniciar API
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Ejecutar tests
cd services/api && python -m pytest tests/ -v

# Crear usuario desde terminal
uv run create-user --email usuario@example.com

# === GENERAL ===

# Ver qué puertos están escuchando
lsof -i -P -n | grep LISTEN

# Ver logs de un puerto específico
lsof -i :8000
```

### 🔍 Probar la API con curl

```bash
# Health check
curl http://localhost:8000/health

# Login (obtener token)
curl -X POST http://localhost:8000/auth/login \
  -d 'username=admin@nexova.com&password=admin123'

# Obtener perfil con token (cambia TOKEN por el real)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer TOKEN"

# Listar proveedores
curl http://localhost:8000/suppliers \
  -H "Authorization: Bearer TOKEN"
```

---

## 11. Glosario para estudiante

### 🧪 Términos técnicos

| Término | Significado simple |
|---|---|
| **API** | Un programa que recibe peticiones y devuelve respuestas. Como un camarero: tú pides (petición), él trae (respuesta) |
| **Endpoint** | Una URL específica de la API. Ej: `/auth/login`, `/health` |
| **JWT** | Un "token" (cadena de texto) que prueba quién eres. Como una pulsera de un concierto |
| **JSON** | Formato de datos. `{"nombre": "Juan", "edad": 30}` |
| **CORS** | Mecanismo de seguridad del navegador. Permite o bloquea peticiones a otros dominios |
| **DOM** | La representación de la web en el navegador. Lo que ves |
| **SPA** | Single Page Application. Web que no recarga al navegar |
| **Hash** | Transformar una contraseña en un código irreconocible. No se puede revertir |
| **Middleware** | Función que se ejecuta entre la petición y la respuesta. Como un filtro |
| **Fixture (test)** | Datos de prueba preparados antes de ejecutar un test |
| **Proxy** | Un intermediario. Vite hace de proxy entre frontend y backend |
| **Bundler** | Programa que empaqueta código JS/CSS para producción. Vite es uno |
| **Dependency Injection** | Pasar dependencias a una función en lugar de crearlas dentro |

### 🧱 Patrones de diseño

| Patrón | Explicación |
|---|---|
| **Arquitectura en capas** | Separar el código en capas: rutas → servicios → datos. Cada capa tiene una responsabilidad |
| **Monolito modular** | Un solo programa pero organizado en módulos independientes |
| **Provider Pattern** | Un componente que provee datos/estado a todos sus hijos (ej: AuthContext) |
| **Outlet/Layout pattern** | Una plantilla que envuelve el contenido (header, sidebar) |

---

## 12. Consejos finales

### 🎯 Para aprender de este proyecto

1. **Lee el CONTEXT.md primero** — Es el documento con los requisitos del "cliente". Todo el proyecto se construye para cumplir ese documento.

2. **Entiende el flujo completo** — Una petición empieza en el navegador del usuario, va al frontend (React/Vite), luego al backend (FastAPI), luego a la base de datos (TinyDB), y vuelve. Traza ese camino.

3. **Los tests son tu red de seguridad** — Si cambias algo y los tests pasan, estás bien. Si no hay tests para una funcionalidad, ten cuidado.

4. **Aprende a leer errores** — Los errores de TypeScript, Python, etc. dicen exactamente qué está mal. La línea y el mensaje son pistas.

5. **Un problema a la vez** — Cuando algo falla, cambia UNA sola cosa y prueba. No tres cosas a la vez.

### 💡 Lo que hace que este proyecto sea profesional

- ✅ **Separación de responsabilidades** — frontend ≠ backend ≠ base de datos
- ✅ **Validaciones en ambos lados** — frontend (UX rápida) + backend (seguridad)
- ✅ **Tests automatizados** — 155 tests que verifican que todo funciona
- ✅ **Accesibilidad** — aria-labels, focus-visible, prefers-reduced-motion
- ✅ **SEO** — Schema.org markup, HTML semántico
- ✅ **Código compartido** — incidents_analyzer lo usan CLI y API
- ✅ **Autenticación segura** — JWT + bcrypt + sin sesiones
- ✅ **Configuración por entorno** — Variables de entorno (SECRET_KEY, etc.)

### 📚 Próximos pasos para seguir aprendiendo

1. Añade tests para los componentes React (Cypress, Testing Library)
2. Implementa multi-idioma (i18n) como sugiere el CONTEXT.md
3. Conecta a una base de datos real (PostgreSQL) en lugar de TinyDB
4. Añade un dashboard con gráficos (Recharts, D3.js)
5. Despliega en producción (Vercel + Railway/Render)

---

> **Este documento es tuyo.** Léelo, modifícalo, hazte preguntas. Cada línea de código que ves aquí es el resultado de decisiones, pruebas, errores y correcciones. Eso es programar. ¡Sigue así! 🚀