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
  "/", // home público
  "/api", // rutas API internas
];

/**
 * Middleware de Next.js App Router.
 * 
 * NOTA: Este middleware NO puede leer localStorage porque se ejecuta en edge.
 * La protección real está en los layouts client-side.
 * 
 * Este middleware sirve como capa adicional para redirigir
 * tráfico no autorizado a nivel de servidor cuando sea posible.
 * 
 * @param request - Petición entrante de Next.js
 * @returns NextResponse.redirect() o NextResponse.next()
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas sin verificación
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Para rutas protegidas, el middleware no puede leer localStorage.
  // La redirección se maneja desde los layouts client-side.
  return NextResponse.next();
}

// Configurar qué rutas ejecuta el middleware
export const config = {
  matcher: [
    // Excluir archivos estáticos y assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};