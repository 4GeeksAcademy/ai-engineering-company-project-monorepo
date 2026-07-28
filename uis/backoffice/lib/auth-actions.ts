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
// - updateProfile(data) → actualiza perfil del usuario
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
 * Returns el token como string, o null si no hay sesión activa
 * o si se ejecuta en SSR (server-side rendering).
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Verifica si el usuario tiene una sesión activa.
 * 
 * Returns true si hay un token almacenado en localStorage.
 * No verifica que el token sea válido (eso lo hace la API).
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Inicia sesión: llama a POST /auth/login y almacena el token.
 * 
 * Flujo:
 * 1. Llama a POST /auth/login con email y password
 * 2. Si es exitoso, guarda el token en localStorage
 * 3. Devuelve los datos de la respuesta (access_token + token_type)
 * 
 * @param email - Email del usuario
 * @param password - Contraseña del usuario
 * @returns Objeto con access_token y token_type
 * @throws Error con mensaje si las credenciales son inválidas
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const response = await apiPost<{
    access_token: string;
    token_type: string;
  }>("/auth/login", { email, password });

  // Almacenar el token en localStorage
  localStorage.setItem(TOKEN_KEY, response.access_token);

  return response;
}

/**
 * Registra un nuevo usuario y automáticamente inicia sesión.
 * 
 * Flujo:
 * 1. Llama a POST /users con los datos del usuario
 * 2. Si el registro es exitoso, llama a POST /auth/login
 * 3. Almacena el token en localStorage
 * 4. Devuelve los datos de login
 * 
 * @param data - Objeto con email, password, role (opcional), name (opcional), phone (opcional), address (opcional)
 * @returns Objeto con access_token y token_type
 * @throws Error con mensaje si el email ya está registrado
 */
export async function registerUser(data: {
  email: string;
  password: string;
  role?: string;
  name?: string;
  phone?: string;
  address?: string;
}): Promise<{ access_token: string; token_type: string }> {
  // Paso 1: Crear usuario (POST /users)
  await apiPost("/users/", data as Record<string, unknown>);

  // Paso 2: Login automático (POST /auth/login)
  const loginResponse = await loginUser(data.email, data.password);

  return loginResponse;
}

/**
 * Cierra la sesión del usuario.
 * 
 * Flujo:
 * 1. Elimina el token de localStorage
 * 2. Redirige al usuario a la página de login
 * 
 * Se usa tanto desde el botón de "Cerrar sesión" como
 * cuando se detecta un 401 (token expirado o inválido).
 */
export function logoutUser(): void {
  localStorage.removeItem(TOKEN_KEY);
  // Redirigir al login usando window.location para forzar recarga completa
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Obtiene los datos del usuario autenticado desde la API.
 * 
 * Llama a GET /auth/me que devuelve email, role y datos de perfil.
 * Requiere que el token sea válido.
 * 
 * @returns Objeto con email, role, is_active, profile (name, phone, address)
 * @throws 401 si el token es inválido o ha expirado
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
 * Llama a PUT /profiles/me para actualizar nombre, teléfono y/o dirección.
 * Solo el propietario del perfil puede actualizarlo.
 * 
 * @param data - Objeto con name, phone, address (todos opcionales)
 * @returns Objeto con id, user_id, name, phone, address
 */
export async function updateProfile(data: {
  name?: string;
  phone?: string;
  address?: string;
}): Promise<{ id: number; user_id: number; name: string; phone: string | null; address: string | null }> {
  return apiPut("/profiles/me", data as Record<string, unknown>);
}