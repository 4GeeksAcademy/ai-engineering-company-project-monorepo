# 🧭 FastAPI — Conectando el Candado: Flujos de Autenticación en el Frontend

> **Proyecto 4Geeks:** AUTH-02 — Authentication Flows in the Frontend
> **Cohorte:** Authentication in web applications (1674)
> **Slug:** `ai-eng-user-authentication-flows`
> **Tarea ID:** 954917 — `PROJECT`
> **Monorepo template:** `4GeeksAcademy/ai-engineering-company-project-monorepo`
>
> ⚠️ **Este documento es la especificación ejecutable para el agente.**
> El agente NO debe tomar decisiones propias. Cada sección es un mandato.
> Si hay ambigüedad → DETENERSE y reportar.

---

## 📋 Índice

1. [Reglas del agente](#1-reglas-del-agente)
2. [Contexto del proyecto](#2-contexto-del-proyecto)
3. [Stack técnico exacto](#3-stack-técnico-exacto)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Fase 0 — Preparación](#5-fase-0--preparación)
6. [Fase 1 — Auth Context & API Helper](#6-fase-1--auth-context--api-helper)
7. [Fase 2 — Página de Login](#7-fase-2--página-de-login)
8. [Fase 3 — Página de Registro](#8-fase-3--página-de-registro)
9. [Fase 4 — Página de Perfil](#9-fase-4--página-de-perfil)
10. [Fase 5 — Middleware de protección de rutas](#10-fase-5--middleware-de-protección-de-rutas)
11. [Fase 6 — Logout y manejo de 401](#11-fase-6--logout-y-manejo-de-401)
12. [Fase 7 — Integración con vistas existentes](#12-fase-7--integración-con-vistas-existentes)
13. [Fase 8 — Variables de entorno](#13-fase-8--variables-de-entorno)
14. [Fase 9 — Testing manual](#14-fase-9--testing-manual)
15. [Checklist de entrega 4Geeks](#15-checklist-de-entrega-4geeks)
16. [Orden de ejecución para el agente](#16-orden-de-ejecución-para-el-agente)

---

## 1. Reglas del agente

```
╔══════════════════════════════════════════════════════════════════╗
║  REGLAS ABSOLUTAS PARA EL AGENTE DESARROLLADOR                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. NO tomar decisiones propias. Cada sección es un mandato.    ║
║  2. NO cambiar nombres de archivos, rutas o variables           ║
║     especificadas aquí.                                         ║
║  3. NO construir una app de auth separada.                      ║
║     Integrar en la app Next.js EXISTENTE del monorepo.          ║
║  4. NO usar cookies ni sessionStorage.                          ║
║     Usar localStorage SIEMPRE para el token.                    ║
║  5. NO modificar el website público (sin login).                ║
║     Solo el backoffice.                                         ║
║  6. CADA archivo debe tener comentarios en español              ║
║     explicando qué hace y por qué.                              ║
║  7. CADA componente debe tener propósitos claros.               ║
║  8. NO hardcodear URLs de API. Usar .env.local.                 ║
║  9. SI hay ambigüedad → DETENERSE y reportar.                  ║
║ 10. Probar con token real antes de dar por terminado.          ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. Contexto del proyecto

### Situación actual
- **Entrega anterior (AUTH-01)**: La API FastAPI ya exige token JWT en rutas protegidas.
- **Problema**: El frontend no envía token → todas las llamadas protegidas devuelven `401`.
- **Objetivo**: Cerrar el ciclo — login, registro, perfil, protección de rutas.

### Empresa: TrackFlow
- Backoffice Next.js en `uis/backoffice/`
- API backend en `services/api/` (corriendo en `http://localhost:8000`)
- Website público en `uis/public-website/` o similar (MILESTONE 1 — NO tocar)

### Lo que hay que construir

| Componente | Ruta | Tipo |
|-----------|------|------|
| Login | `/login` | PÚBLICA |
| Registro | `/register` | PÚBLICA |
| Perfil | `/account/profile` | PROTEGIDA |
| Backoffice | `/suppliers*`, `/account*` | PROTEGIDA |
| Website público | `/` (home), `/about`, etc. | PÚBLICA (NO tocar) |

### Reglas de negocio clave

| Regla | Valor |
|-------|-------|
| Almacenamiento token | `localStorage` key `access_token` |
| Header API | `Authorization: Bearer <token>` |
| Auth flow registro | `POST /users` → `POST /auth/login` → almacenar token |
| Logout | `localStorage.removeItem('access_token')` → redirect `/login` |
| 401 handling | Limpiar token + redirect `/login` |
| Protección | Middleware Next.js o layout guard |
| Website público | SIN protección, SIN token check |
| API base URL | `NEXT_PUBLIC_API_URL` desde `.env.local` |

---

## 3. Stack técnico exacto

```
Next.js 14+ (App Router)    ← Ya existe en uis/backoffice/
TypeScript                  ← Ya existe
Tailwind CSS                ← Ya existe (o CSS modules)
fetch API nativa            ← Sin axios, sin librerías extra
localStorage                ← Para almacenar el token
next/navigation             ← useRouter, redirect (App Router)
```

### Sin dependencias nuevas
No se requiere instalar nada. Todo se hace con APIs nativas de Next.js y fetch.

---

## 4. Estructura de archivos

```
uis/backoffice/                        ← Frontend Next.js EXISTENTE
├── .env.local                         ← NUEVO/CREAR si no existe
├── middleware.ts                       ← NUEVO: protección de rutas
├── lib/
│   ├── api.ts                         ← NUEVO: helper fetch con auth header
│   └── auth-actions.ts                ← NUEVO: login, register, logout, getProfile
├── app/
│   ├── layout.tsx                     ← MODIFICAR: añadir AuthProvider si se usa contexto
│   ├── login/
│   │   └── page.tsx                   ← NUEVO: formulario de login
│   ├── register/
│   │   └── page.tsx                   ← NUEVO: formulario de registro
│   ├── account/
│   │   ├── layout.tsx                 ← NUEVO: layout protegido para /account/*
│   │   └── profile/
│   │       └── page.tsx               ← NUEVO: perfil del usuario
│   ├── suppliers/
│   │   ├── page.tsx                   ← YA EXISTE (listar proveedores)
│   │   └── ...                        ← YA EXISTE (otras páginas)
│   └── page.tsx                       ← YA EXISTE (home público — NO TOCAR)
└── components/
    ├── login-form.tsx                  ← NUEVO: componente formulario login
    ├── register-form.tsx               ← NUEVO: componente formulario registro
    └── profile-form.tsx                ← NUEVO: componente formulario perfil
```

---

## 5. Fase 0 — Preparación

### 5.1 Crear rama

```bash
git checkout -b feature/auth-frontend
```

### 5.2 Verificar que la API está corriendo

```bash
curl http://localhost:8000/health
# → {"status": "ok"}

curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@trackflow.com","password":"test1234"}'
# → debe devolver access_token
```

### 5.3 Verificar estructura existente

```bash
ls uis/backoffice/app/
# Debe mostrar: layout.tsx, page.tsx, suppliers/, etc.
```

### 5.4 Crear directorios necesarios

```bash
mkdir -p uis/backoffice/lib
mkdir -p uis/backoffice/app/login
mkdir -p uis/backoffice/app/register
mkdir -p uis/backoffice/app/account/profile
mkdir -p uis/backoffice/components
```

---

## 6. Fase 1 — Auth Context & API Helper

### 6.1 Crear `uis/backoffice/lib/api.ts`

```typescript
// lib/api.ts — Helper de fetch con autenticación JWT
//
// Propósito: Proveer funciones reutilizables para llamar a la API
// con el token JWT adjunto automáticamente en el header Authorization.
//
// Funciones:
// - authHeader(): devuelve headers con token si existe
// - apiPost(url, body): POST con auth header
// - apiGet(url): GET con auth header
// - apiPut(url, body): PUT con auth header
//
// Uso: import { apiGet, apiPost, apiPut } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Obtiene los headers de autenticación desde localStorage.
 *
 * Lee el token JWT almacenado como 'access_token' y lo devuelve
 * como header Authorization: Bearer <token>.
 * Si no hay token, devuelve headers vacíos (para rutas públicas).
 */
export function authHeaders(): HeadersInit {
  // Solo ejecutar en el navegador (localStorage no existe en SSR)
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Realiza una petición GET a la API.
 *
 * @param path - Ruta relativa (ej: "/auth/me")
 * @returns Promise con la respuesta JSON
 *
 * La función adjunta automáticamente el token JWT si existe.
 * Si la respuesta es 401, lanza un error específico.
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { status: response.status, ...error };
  }

  return response.json();
}

/**
 * Realiza una petición POST a la API.
 *
 * @param path - Ruta relativa (ej: "/auth/login")
 * @param body - Cuerpo de la petición (objeto JavaScript)
 * @returns Promise con la respuesta JSON
 */
export async function apiPost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { status: response.status, ...error };
  }

  return response.json();
}

/**
 * Realiza una petición PUT a la API.
 *
 * @param path - Ruta relativa (ej: "/profiles/me")
 * @param body - Cuerpo de la petición (objeto JavaScript)
 * @returns Promise con la respuesta JSON
 */
export async function apiPut<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { status: response.status, ...error };
  }

  return response.json();
}
```

### 6.2 Crear `uis/backoffice/lib/auth-actions.ts`

```typescript
// lib/auth-actions.ts — Acciones de autenticación reutilizables
//
// Propósito: Centralizar toda la lógica de autenticación
// para que los componentes sean simples y no tengan lógica repetida.
//
// Funciones exportadas:
// - loginUser(email, password) → almacena token y devuelve datos
// - registerUser(data) → registra + hace login automático
// - logoutUser() → limpia sesión y redirige
// - getCurrentUser() → obtiene datos del usuario autenticado
// - getToken() → lee el token almacenado
// - isAuthenticated() → true/false si hay token
//
// Uso: import { loginUser, logoutUser } from "@/lib/auth-actions"

import { apiGet, apiPost, apiPut } from "./api";

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const TOKEN_KEY = "access_token";

/**
 * Obtiene el token JWT almacenado en localStorage.
 *
 * @returns string | null - el token o null si no existe
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Verifica si el usuario tiene una sesión activa.
 *
 * @returns boolean - true si hay token almacenado
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Inicia sesión: llama a POST /auth/login y almacena el token.
 *
 * Flujo:
 * 1. Envía email + password a POST /auth/login
 * 2. Si OK → guarda el token en localStorage
 * 3. Devuelve los datos de la respuesta
 *
 * @param email - Email del usuario
 * @param password - Contraseña del usuario
 * @returns Objeto con access_token y token_type
 *
 * @throws Si las credenciales son inválidas (401)
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const response = await apiPost<{
    access_token: string;
    token_type: string;
  }>("/auth/login", { email, password });

  // Almacenar token en localStorage
  localStorage.setItem(TOKEN_KEY, response.access_token);

  return response;
}

/**
 * Registra un nuevo usuario y automáticamente inicia sesión.
 *
 * Flujo:
 * 1. Llama a POST /users con los datos de registro
 * 2. Si OK → llama a POST /auth/login con las mismas credenciales
 * 3. Almacena el token devuelto por login
 * 4. Devuelve el token
 *
 * @param data - Datos del formulario de registro
 * @returns Objeto con access_token y token_type
 *
 * @throws Si el email ya existe (409) o validación falla (422)
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}): Promise<{ access_token: string; token_type: string }> {
  // Paso 1: Crear usuario (POST /users)
  await apiPost("/users/", {
    email: data.email,
    password: data.password,
    name: data.name || null,
    phone: data.phone || null,
    address: data.address || null,
  });

  // Paso 2: Iniciar sesión automáticamente (POST /auth/login)
  const loginResponse = await loginUser(data.email, data.password);

  return loginResponse;
}

/**
 * Cierra la sesión del usuario.
 *
 * Acciones:
 * 1. Elimina el token de localStorage
 * 2. Redirige al navegador a /login
 *
 * No llama a la API — el logout es puramente local
 * (JWT es stateless, el servidor no guarda sesiones).
 */
export function logoutUser(): void {
  localStorage.removeItem(TOKEN_KEY);

  // Redirigir a login (solo en navegador)
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Obtiene los datos del usuario autenticado desde la API.
 *
 * Llama a GET /auth/me que devuelve email, role, is_active y profile.
 * El token se adjunta automáticamente via authHeaders().
 *
 * @returns Objeto con datos del usuario
 *
 * @throws 401 si el token es inválido o expiró
 */
export async function getCurrentUser(): Promise<{
  email: string;
  role: string;
  is_active: boolean;
  profile: {
    name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}> {
  return apiGet("/auth/me");
}

/**
 * Actualiza el perfil del usuario autenticado.
 *
 * Llama a PUT /profiles/me con los datos a actualizar.
 * Solo el usuario autenticado (owner) puede modificar su perfil.
 *
 * @param data - Datos a actualizar (name, phone, address — todos opcionales)
 * @returns Perfil actualizado
 */
export async function updateProfile(data: {
  name?: string;
  phone?: string;
  address?: string;
}): Promise<{ id: number; user_id: number; name: string; phone: string | null; address: string | null }> {
  return apiPut("/profiles/me", data);
}
```

---

## 7. Fase 2 — Página de Login

### 7.1 Crear componente `uis/backoffice/components/login-form.tsx`

```tsx
// components/login-form.tsx — Formulario de inicio de sesión
//
// Propósito: Renderiza un formulario de email + contraseña.
//
// Flujo:
// 1. Usuario completa email y contraseña
// 2. Click "Iniciar sesión"
// 3. Llama a loginUser() que hace POST /auth/login
// 4. Si OK → redirige a /suppliers (vista protegida principal)
// 5. Si error → muestra mensaje de error claro
//
// Props: ninguna (es una página completa)

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/auth-actions";

export default function LoginForm() {
  // ── Estado del formulario ─────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ── Manejar envío del formulario ──────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Llamar a la API de login
      await loginUser(email, password);

      // Redirigir a la vista protegida principal
      router.push("/suppliers");
    } catch (err: unknown) {
      // Manejar errores de la API
      const apiError = err as { status?: number; detail?: string };
      if (apiError.status === 401) {
        setError("Email o contraseña incorrectos");
      } else if (apiError.detail) {
        setError(apiError.detail);
      } else {
        setError("Error al conectar con el servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">
            TrackFlow
          </h1>
          <h2 className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión en tu cuenta
          </h2>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Campo: Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Campo: Contraseña */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>

          {/* Enlace a registro */}
          <div className="text-center text-sm">
            <span className="text-gray-600">¿No tienes cuenta? </span>
            <Link
              href="/register"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 7.2 Crear página `uis/backoffice/app/login/page.tsx`

```tsx
// app/login/page.tsx — Página de inicio de sesión
//
// Renderiza el formulario de login.
// Ruta PÚBLICA — no requiere autenticación.

import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

---

## 8. Fase 3 — Página de Registro

### 8.1 Crear componente `uis/backoffice/components/register-form.tsx`

```tsx
// components/register-form.tsx — Formulario de registro de usuario
//
// Propósito: Renderiza un formulario completo de registro.
//
// Flujo:
// 1. Usuario completa todos los campos
// 2. Validación local: contraseña == confirmación
// 3. Llama a registerUser() que hace:
//    a) POST /users (crear usuario + perfil opcional)
//    b) POST /auth/login (login automático)
// 4. Si OK → guarda token + redirige a /suppliers
// 5. Si error → muestra errores por campo
//
// NOTA: El registro requiere autenticación del servidor.
// La acción de registro es: POST /users (público) + POST /auth/login.

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/auth-actions";

export default function RegisterForm() {
  // ── Estado del formulario ─────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ── Validación local ──────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!email) newErrors.email = "El email es obligatorio";
    if (!password || password.length < 8)
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Las contraseñas no coinciden";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Manejar envío ─────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      // Registrar usuario (POST /users + POST /auth/login automático)
      await registerUser({
        email,
        password,
        name: name || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });

      // Redirigir a la vista protegida principal
      router.push("/suppliers");
    } catch (err: unknown) {
      const apiError = err as {
        status?: number;
        detail?: string;
        errors?: Record<string, string>;
      };

      if (apiError.status === 409) {
        setErrors({ email: "Este email ya está registrado" });
      } else if (apiError.errors) {
        // Errores de validación por campo
        setErrors(apiError.errors);
      } else if (apiError.detail) {
        setErrors({ general: apiError.detail });
      } else {
        setErrors({ general: "Error al conectar con el servidor" });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">
            TrackFlow
          </h1>
          <h2 className="mt-2 text-center text-sm text-gray-600">
            Crea tu cuenta
          </h2>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Teléfono (opcional) */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Teléfono (opcional)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Dirección (opcional) */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Dirección (opcional)
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle, ciudad, país"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          {/* Enlace a login */}
          <div className="text-center text-sm">
            <span className="text-gray-600">¿Ya tienes cuenta? </span>
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 8.2 Crear página `uis/backoffice/app/register/page.tsx`

```tsx
// app/register/page.tsx — Página de registro
//
// Renderiza el formulario de registro.
// Ruta PÚBLICA — no requiere autenticación.

import RegisterForm from "@/components/register-form";

export default function RegisterPage() {
  return <RegisterForm />;
}
```

---

## 9. Fase 4 — Página de Perfil

### 9.1 Crear componente `uis/backoffice/components/profile-form.tsx`

```tsx
// components/profile-form.tsx — Formulario de perfil del usuario
//
// Propósito: Muestra y permite editar los datos del perfil del usuario.
//
// Flujo:
// 1. Al cargar: llama a getCurrentUser() → GET /auth/me
// 2. Muestra email (solo lectura) + name/phone/address (editables)
// 3. Al guardar: llama a updateProfile() → PUT /profiles/me
// 4. Si éxito → muestra mensaje de confirmación
// 5. Si 401 → redirige a /login (sesión expirada)
//
// PROTEGIDO
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  updateProfile,
  logoutUser,
} from "@/lib/auth-actions";

export default function ProfileForm() {
  // ── Estado del formulario ─────────────────────────────────
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();

  // ── Cargar datos del usuario al montar el componente ──────

  useEffect(() => {
    async function loadProfile() {
      try {
        const user = await getCurrentUser();
        setEmail(user.email);
        setName(user.profile?.name || "");
        setPhone(user.profile?.phone || "");
        setAddress(user.profile?.address || "");
      } catch (err: unknown) {
        const apiError = err as { status?: number };
        if (apiError.status === 401) {
          // Token inválido o expirado — redirigir a login
          logoutUser();
        } else {
          setError("Error al cargar el perfil");
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // ── Guardar cambios ───────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({ name, phone, address });
      setSuccess("Perfil actualizado correctamente");
    } catch (err: unknown) {
      const apiError = err as { status?: number; detail?: string };
      if (apiError.status === 401) {
        logoutUser();
      } else {
        setError(apiError.detail || "Error al actualizar el perfil");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Cargando perfil...</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>

      {/* Notificaciones */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email (solo lectura) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <p className="mt-1 text-gray-900 font-medium">{email}</p>
          <p className="text-xs text-gray-500">
            El email no se puede cambiar desde aquí
          </p>
        </div>

        {/* Nombre */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Dirección */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Dirección
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 9.2 Crear página `uis/backoffice/app/account/profile/page.tsx`

```tsx
// app/account/profile/page.tsx — Página de perfil del usuario
//
// Renderiza el formulario de perfil.
// Ruta PROTEGIDA por el layout de /account.

import ProfileForm from "@/components/profile-form";

export default function ProfilePage() {
  return <ProfileForm />;
}
```

### 9.3 Crear layout protegido `uis/backoffice/app/account/layout.tsx`

```tsx
// app/account/layout.tsx — Layout protegido para /account/*
//
// Propósito: Verificar que el usuario está autenticado
// antes de mostrar cualquier página bajo /account/.
//
// Si no hay token en localStorage → redirige a /login.
// Si hay token → renderiza el contenido normalmente.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-actions";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar si el usuario tiene un token almacenado
    if (!isAuthenticated()) {
      // No hay token → redirigir a login
      router.push("/login");
    } else {
      setChecking(false);
    }
  }, [router]);

  // Mientras se verifica la autenticación, mostrar loading
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Verificando sesión...</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## 10. Fase 5 — Middleware de protección de rutas

### 10.1 Crear `uis/backoffice/middleware.ts`

```typescript
// middleware.ts — Protección de rutas en Next.js (App Router)
//
// Propósito: Interceptar peticiones a rutas protegidas y redirigir
// al login si no hay token en las cookies/localStorage.
//
// ⚠️ IMPORTANTE sobre middleware en Next.js:
// El middleware se ejecuta en el EDGE (servidor), NO en el navegador.
// NO tiene acceso a localStorage.
//
// Por eso, el middleware NO puede leer el token de localStorage.
//
// ESTRATEGIA REAL USADA EN ESTE PROYECTO:
// En lugar del middleware de edge (que no puede leer localStorage),
// la protección se implementa con:
//   1. Layout "use client" con verificación de isAuthenticated()
//      → app/account/layout.tsx (para /account/*)
//   2. Hook o verificación por componente (para suppliers/*)
//   3. El middleware de edge solo protege URLs no SPA
//      (opcional, como capa adicional)
//
// VER: app/account/layout.tsx para la protección real.
//
// Para una protección completa en el servidor, se necesitaría una cookie.
// Dado que el proyecto requiere localStorage, la protección es client-side.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que NO requieren autenticación (públicas)
const publicPaths = [
  "/login",
  "/register",
  "/",
  "/about",
  "/_next", // archivos estáticos de Next.js
  "/api", // rutas API internas
];

/**
 * Middleware de Next.js App Router.
 *
 * Verifica si la ruta solicitada es pública o protegida.
 * Para rutas protegidas, intenta leer el token de localStorage
 * NO ES POSIBLE en edge runtime, por lo que este middleware
 * solo añade headers y permite el paso.
 *
 * La protección REAL está en:
 * - app/account/layout.tsx (client-side, tiene acceso a localStorage)
 * - Componentes individuales de suppliers
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas sin verificación
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Para rutas protegidas, permitir el paso
  // La verificación real del token ocurre en el layout client-side
  return NextResponse.next();
}

// Configurar qué rutas ejecutan el middleware
export const config = {
  matcher: [
    // Excluir archivos estáticos y API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### 10.2 Navbar con botón de logout (opcional pero recomendado)

Añadir un botón de "Cerrar sesión" en el navbar existente del backoffice.

**Modificar** el layout o navbar existente para incluir:

```tsx
"use client";

import { isAuthenticated, logoutUser } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";

// ... dentro del componente Navbar ...

const authenticated = isAuthenticated();

{authenticated && (
  <button
    onClick={() => logoutUser()}
    className="text-sm text-gray-600 hover:text-gray-900"
  >
    Cerrar sesión
  </button>
)}
```

---

## 11. Fase 6 — Logout y manejo de 401

### 11.1 Cierre de sesión

El logout está implementado en `lib/auth-actions.ts` como función `logoutUser()`.

**Cuándo se llama:**
- Click en botón "Cerrar sesión" en navbar
- Respuesta 401 de la API (en cualquier llamada protegida)

**Qué hace:**
1. `localStorage.removeItem("access_token")` — elimina el token
2. `window.location.href = "/login"` — redirige al login

### 11.2 Manejo de 401

Cuando cualquier llamada a la API protegida devuelve `401`, el helper `authHeaders()` no lo maneja automáticamente — debe manejarse en cada componente.

**Patrón a seguir en cada componente que llama a la API:**

```typescript
try {
  const data = await apiGet("/suppliers/");
  // procesar data
} catch (err: unknown) {
  const apiError = err as { status?: number };
  if (apiError.status === 401) {
    // Token inválido o expirado
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  } else {
    // Otro error
    setError("Error al cargar datos");
  }
}
```

---

## 12. Fase 7 — Integración con vistas existentes

### 12.1 Identificar rutas existentes del backoffice

Buscar en `uis/backoffice/app/` todas las rutas que NO sean públicas:

```bash
find uis/backoffice/app -name "page.tsx" -type f | sort
```

Rutas típicas del backoffice TrackFlow:

| Ruta | ¿Protegida? | Acción |
|------|:-----------:|--------|
| `/` (home) | ❌ PÚBLICA | NO tocar |
| `/login` | ❌ PÚBLICA | NUEVA |
| `/register` | ❌ PÚBLICA | NUEVA |
| `/suppliers` | ✅ PROTEGIDA | Verificar que existe |
| `/suppliers/[id]` | ✅ PROTEGIDA | Verificar que existe |
| `/account/profile` | ✅ PROTEGIDA | NUEVA |
| `/orders/*` | ✅ PROTEGIDA | Si existe, proteger |
| `/warehouse/*` | ✅ PROTEGIDA | Si existe, proteger |

### 12.2 Modificar Suppliers list existente para usar token

El archivo existente `uis/backoffice/app/suppliers/page.tsx` o sus componentes
ya deben usar `apiGet()` en lugar de fetch directo para que el token se adjunte
automáticamente.

**Modificar el componente SuppliersClient o similar para:**

```tsx
// ANTES (sin auth):
const response = await fetch("http://localhost:8000/suppliers/");
const data = await response.json();

// DESPUÉS (con auth automático):
import { apiGet } from "@/lib/api";
const data = await apiGet("/suppliers/");
```

> ⚠️ **Atención agente:** Revisar TODOS los archivos existentes en
> `uis/backoffice/app/suppliers/` y cambiar fetch directo por apiGet/apiPost/apiPut.
> No dejar ningún fetch sin auth.

---

## 13. Fase 8 — Variables de entorno

### 13.1 Crear/actualizar `uis/backoffice/.env.local`

```
# ── TrackFlow API URL ────────────────────────────────────────
# URL base de la API FastAPI (sin slash final)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 13.2 Verificar que NEXT_PUBLIC_API_URL se usa en lib/api.ts

El archivo `lib/api.ts` ya usa `process.env.NEXT_PUBLIC_API_URL` con fallback a `http://localhost:8000`.

---

## 14. Fase 9 — Testing manual

### 14.1 Prerrequisitos

```bash
# 1. API corriendo
cd services/api
uvicorn main:app --reload --port 8000

# 2. Frontend corriendo (otra terminal)
cd uis/backoffice
npm run dev
# → http://localhost:3000
```

### 14.2 Flujo completo de verificación

```bash
# =========================================================
# TEST 1: Ver página de login (PÚBLICA)
# =========================================================
# Abrir: http://localhost:3000/login
# → Debe mostrar formulario de email + contraseña
# → Link a /register

# =========================================================
# TEST 2: Login exitoso
# =========================================================
# Email: test@trackflow.com
# Password: test1234
# Click "Iniciar sesión"
# → Redirige a /suppliers
# → Abrir DevTools → Application → localStorage
# → Verificar que existe 'access_token' con valor JWT

# =========================================================
# TEST 3: Login fallido
# =========================================================
# Email: test@trackflow.com
# Password: wrong
# Click "Iniciar sesión"
# → Muestra mensaje: "Email o contraseña incorrectos"
# → NO redirige

# =========================================================
# TEST 4: Registro exitoso
# =========================================================
# Ir a: http://localhost:3000/register
# Completar: nombre, email nuevo, contraseña, confirmar
# Click "Crear cuenta"
# → Redirige a /suppliers
# → Token almacenado en localStorage

# =========================================================
# TEST 5: Registro — validación de contraseñas
# =========================================================
# En /register: password != confirmPassword
# Click "Crear cuenta"
# → Muestra error: "Las contraseñas no coinciden"
# → NO llama a la API

# =========================================================
# TEST 6: Perfil del usuario (PROTEGIDO)
# =========================================================
# Ir a: http://localhost:3000/account/profile
# → Debe mostrar email + name/phone/address
# Editar nombre y click "Guardar cambios"
# → Mensaje: "Perfil actualizado correctamente"

# =========================================================
# TEST 7: Perfil sin token (redirección)
# =========================================================
# Abrir ventana de incógnito
# Ir a: http://localhost:3000/account/profile
# → Debe redirigir a /login

# =========================================================
# TEST 8: Logout
# =========================================================
# Estando autenticado
# Click "Cerrar sesión"
# → Token eliminado de localStorage
# → Redirige a /login

# =========================================================
# TEST 9: 401 handling
# =========================================================
# Estando autenticado, abrir DevTools
# Ir a Application → localStorage → editar token a "invalid"
# Recargar página en /suppliers
# → Debe redirigir a /login

# =========================================================
# TEST 10: Website público NO afectado
# =========================================================
# Ir a: http://localhost:3000/
# → NO pide login
# → Funciona normalmente sin token check
```

### 14.3 Tabla de comprobación

| # | Test | Esperado | Resultado |
|:-:|------|:--------:|:---------:|
| 1 | GET /login (público) | 200, formulario ✅ | |
| 2 | POST /auth/login correcto | 200 + token ✅ | |
| 3 | POST /auth/login incorrecto | 401 + error ✅ | |
| 4 | POST /users + POST /auth/login | 200 + token ✅ | |
| 5 | Validación contraseñas no coinciden | Error local ✅ | |
| 6 | GET /account/profile autenticado | 200 + datos ✅ | |
| 7 | GET /account/profile sin token | Redirect /login ✅ | |
| 8 | logout() | Token eliminado ✅ | |
| 9 | Token inválido → 401 | Redirect /login ✅ | |
| 10 | Website público sin auth | 200 normal ✅ | |
| 11 | GET /suppliers con token | 200 ✅ | |
| 12 | GET /suppliers sin token | Redirect /login ✅ | |

---

## 15. Checklist de entrega 4Geeks

```
CHECKLIST DE ENTREGA — Proyecto AUTH-02
═══════════════════════════════════════════════════════════════

VISTAS DE AUTENTICACIÓN
[ ] 01. /login — formulario de email + contraseña
[ ] 02. /login exitoso → almacena token en localStorage
[ ] 03. /login exitoso → redirige a vista protegida principal
[ ] 04. /login fallido → mensaje de error claro ("Email o contraseña incorrectos")
[ ] 05. /register — formulario con nombre, email, contraseña, confirmación
[ ] 06. /register → validación local: contraseña == confirmación
[ ] 07. /register exitoso → POST /users + POST /auth/login
[ ] 08. /register exitoso → almacena token y redirige
[ ] 09. /register fallido → errores por campo

VISTAS DE GESTIÓN DE CUENTA
[ ] 10. /account/profile → GET /auth/me con token en header
[ ] 11. /account/profile → muestra email + profile (name, phone, address)
[ ] 12. /account/profile → PUT /profiles/me para editar
[ ] 13. /account/profile → mensaje de éxito después de guardar

PROTECCIÓN DE RUTAS
[ ] 14. /account/profile sin token → redirige a /login
[ ] 15. /suppliers sin token → redirige a /login
[ ] 16. Website público (/) → SIN protección, SIN token check
[ ] 17. Implementar layout guard (account/layout.tsx)
[ ] 18. Implementar middleware.ts (opcional, capa adicional)

CICLO DE VIDA DEL TOKEN
[ ] 19. Login exitoso → localStorage.setItem("access_token", token)
[ ] 20. Cada llamada API protegida → Authorization: Bearer <token>
[ ] 21. Logout → localStorage.removeItem("access_token") + redirect
[ ] 22. 401 de API → limpiar token + redirect a /login

INTEGRACIÓN
[ ] 23. fetch directo en suppliers reemplazado por apiGet/apiPost
[ ] 24. Navbar con botón "Cerrar sesión" cuando autenticado
[ ] 25. NEXT_PUBLIC_API_URL en .env.local
[ ] 26. Rama: feature/auth-frontend
[ ] 27. PR contra main con descripción de vistas protegidas
[ ] 28. Sin regresiones en website público
```

---

## 16. Orden de ejecución para el agente

```
ORDEN DE EJECUCIÓN — Fases 0 → 9
═══════════════════════════════════════════════════════════════

FASE 0: Preparación
  0.1  Verificar que la API está corriendo (auth/login funciona)
  0.2  git checkout -b feature/auth-frontend
  0.3  Crear directorios: lib/, login/, register/, account/profile/, components/
  0.4  Crear .env.local con NEXT_PUBLIC_API_URL

FASE 1: Helpers base
  1.1  CREAR lib/api.ts          ← authHeaders, apiGet, apiPost, apiPut
  1.2  CREAR lib/auth-actions.ts ← loginUser, registerUser, logoutUser,
                                    getCurrentUser, updateProfile

FASE 2: Login
  2.1  CREAR components/login-form.tsx
  2.2  CREAR app/login/page.tsx

FASE 3: Registro
  3.1  CREAR components/register-form.tsx
  3.2  CREAR app/register/page.tsx

FASE 4: Perfil
  4.1  CREAR components/profile-form.tsx
  4.2  CREAR app/account/profile/page.tsx

FASE 5: Protección de rutas
  5.1  CREAR app/account/layout.tsx  ← layout "use client" con verificación
  5.2  CREAR middleware.ts           ← opcional, capa adicional

FASE 6: Logout y 401 handling
  6.1  Añadir botón "Cerrar sesión" en navbar existente
  6.2  Verificar que todos los componentes manejan 401

FASE 7: Integración con vistas existentes
  7.1  Buscar todos los fetch() directos en app/suppliers/
  7.2  Reemplazar por apiGet("/suppliers/") con manejo de 401
  7.3  Verificar que NO se modificó el website público

FASE 8: Testing
  8.1  npm run dev en uis/backoffice
  8.2  Ejecutar los 12 tests manuales de la Fase 14
  8.3  Verificar website público intacto

FASE 9: Entrega
  9.1  git add .
  9.2  git commit -m "feat: implement frontend auth flows (AUTH-02)"
  9.3  git push origin feature/auth-frontend
  9.4  Crear PR contra main con descripción de rutas protegidas
```

> ⚡ **El agente debe seguir este orden exacto. No saltar fases.
> Cada archivo creado debe tener comentarios en español explicando qué hace y por qué.
> Al final, verificar los 12 tests de la tabla de comprobación.**
